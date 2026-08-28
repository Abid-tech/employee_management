const crypto = require('crypto')

const Review = require('../model/review')
const Employee = require('../model/employee')
const FeedbackSignal = require('../model/feedback_signal')
const objectiveService = require('./objective_service')
const taskService = require('./task_service')
const gemini = require('./gemini')
const audit = require('./audit_service')

const { COMPETENCIES } = Review

// The agent that closes the loop.
//
// Most feedback tools stop at a summary: "communication came up a few times".
// The manager then has to remember it, decide what to do, open another module,
// and type an objective — and usually doesn't. The theme goes nowhere, and the
// next review cycle raises it again.
//
// This reads the reviews, finds themes that keep recurring across *different*
// reviewers, and drafts the objective or task that would actually address each
// one — shaped so it can be handed straight to the Task & Objective module.
//
// It stops there on purpose. It writes nothing into that module until a named
// manager approves, because software that steers performance decisions has to
// keep a human in the loop and be able to show who that human was.

const round = (n, dp = 2) => {
    const f = 10 ** dp
    return Math.round((Number(n) || 0) * f) / f
}
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0)

// A theme has to appear in at least this many separate reviews before it is
// worth anyone's attention. One reviewer having a bad day is not a pattern.
const MIN_OCCURRENCES = 3

// Scores at or below this count as a concern on that axis.
const CONCERN_AT = 3

// --- Theme detection ---------------------------------------------------------

// Keyword sets per competency, used to spot a theme raised in prose even when
// the reviewer did not mark the matching axis down.
const THEME_WORDS = {
    communication: ['communicat', 'unclear', 'update', 'silo', 'inform', 'explain', 'clarity', 'listen', 'writing', 'email', 'standup'],
    collaboration: ['collaborat', 'team', 'help', 'unblock', 'share', 'handover', 'pair', 'support', 'silo'],
    delivery: ['deadline', 'late', 'slip', 'overrun', 'estimate', 'deliver', 'ship', 'behind', 'commit'],
    quality: ['bug', 'defect', 'rework', 'test', 'regress', 'quality', 'review comment', 'edge case', 'broke'],
    ownership: ['ownership', 'follow through', 'follow-through', 'chase', 'dropped', 'forgot', 'accountab'],
    initiative: ['initiative', 'proactive', 'wait', 'passive', 'suggest', 'improve', 'propose']
}

const textOf = (review) => [review.strengths, review.improvements, review.comment]
    .filter(Boolean).join(' ').toLowerCase()

// Which competencies this one review raises as a concern — either by score, or
// by what the reviewer wrote in the improvements box.
const concernsIn = (review) => {
    const found = new Set()

    for (const rating of review.ratings || []) {
        if (rating.score <= CONCERN_AT) found.add(rating.competency)
    }

    // Only the improvements text is scanned for keywords. Praise mentioning
    // "communication" is not a concern about communication, and treating it as
    // one is how these systems end up flagging the strongest people.
    const improvementText = (review.improvements || '').toLowerCase()
    if (improvementText) {
        for (const [competency, words] of Object.entries(THEME_WORDS)) {
            if (words.some(w => improvementText.includes(w))) found.add(competency)
        }
    }

    return [...found]
}

const labelFor = (key) => COMPETENCIES.find(c => c.key === key)?.label || key

// --- Drafting the proposal ---------------------------------------------------

const RULE_DRAFTS = {
    communication: {
        title: 'Make delivery updates predictable',
        description: 'Post a short written update at the same point each week covering what moved, what is blocked and what changes for other people. The aim is that nobody has to ask for status.',
        estimateHours: 6
    },
    collaboration: {
        title: 'Share the load on shared work',
        description: 'Pair on one piece of work per cycle with someone outside your immediate area, and answer open questions on other people\'s tasks before starting new work of your own.',
        estimateHours: 8
    },
    delivery: {
        title: 'Tighten estimates and finish what is started',
        description: 'Break anything estimated over a day into pieces of a day or less, and clear existing open work before accepting new work. Review the estimate against actual hours at the end of each item.',
        estimateHours: 10
    },
    quality: {
        title: 'Close the rework loop',
        description: 'Finish the checklist on every task before moving it to done, and add a regression check for anything that has broken twice. Track how many items come back after being closed.',
        estimateHours: 10
    },
    ownership: {
        title: 'Own items end to end',
        description: 'Take a piece of work from agreement through to it running in production without being chased, including whatever handover or documentation it needs.',
        estimateHours: 8
    },
    initiative: {
        title: 'Propose one improvement per cycle',
        description: 'Identify one thing that repeatedly wastes the team\'s time, write up what you would change and why, and bring it to your lead with an estimate.',
        estimateHours: 6
    }
}

const draftByRules = (competency, employee, occurrences, average) => {
    const base = RULE_DRAFTS[competency] || {
        title: `Improve ${labelFor(competency).toLowerCase()}`,
        description: 'Agree one measurable change with your manager and review it at the end of the cycle.',
        estimateHours: 8
    }

    return {
        kind: 'objective',
        title: `${base.title} — ${employee.name.split(' ')[0]}`,
        description: base.description,
        department: employee.department,
        priority: average <= 2.5 ? 'high' : 'medium',
        estimateHours: base.estimateHours,
        dueInDays: 30
    }
}

// Gemini writes a better-worded draft when a key is configured, but the *theme*
// is always detected by the code above. The model is asked to phrase an action,
// never to decide who has a problem — that judgement stays in rules a person can
// read and challenge.
const draftByModel = async (competency, employee, evidenceText) => {
    const prompt = [
        `An employee named ${employee.name} (${employee.jobTitle}, ${employee.department}) has had "${labelFor(competency)}" raised as an area to improve across several performance reviews.`,
        '',
        'Extracts from those reviews:',
        evidenceText,
        '',
        'Write one development objective for the next 30 days. Reply with JSON only:',
        '{"title": "...", "description": "..."}',
        '',
        'The title must be under 70 characters and start with a verb.',
        'The description must be 2-3 sentences describing observable behaviour, not personality.',
        'Do not mention ratings, scores or the reviews themselves.'
    ].join('\n')

    const plan = await gemini.generatePlan({ text: prompt, departments: [employee.department], employees: [], notes: '' })

    // generatePlan returns a task list; the first item is the drafted action.
    const first = plan?.tasks?.[0]
    if (!first?.title) throw new Error('model returned nothing usable')

    return {
        kind: 'objective',
        title: first.title.slice(0, 90),
        description: first.description || RULE_DRAFTS[competency]?.description || '',
        department: employee.department,
        priority: first.priority || 'medium',
        estimateHours: first.estimateHours || 8,
        dueInDays: 30
    }
}

// --- Scanning ----------------------------------------------------------------

const fingerprintOf = (employeeId, competency, reviewIds) =>
    crypto.createHash('sha1')
        .update(`${employeeId}:${competency}:${[...reviewIds].sort().join(',')}`)
        .digest('hex')
        .slice(0, 16)

const scan = async ({ employee: onlyEmployee } = {}) => {
    const filter = { status: { $in: ['submitted', 'acknowledged'] } }
    if (onlyEmployee) filter.employee = onlyEmployee

    const reviews = await Review.find(filter).populate('employee', 'name jobTitle department color')

    // Group concerns per employee per competency, counting how many distinct
    // reviewers raised each one.
    const buckets = new Map()

    for (const review of reviews) {
        if (!review.employee) continue
        const employeeId = String(review.employee._id)

        for (const competency of concernsIn(review)) {
            const key = `${employeeId}::${competency}`
            if (!buckets.has(key)) {
                buckets.set(key, { employee: review.employee, competency, reviews: [], reviewers: new Set() })
            }
            const bucket = buckets.get(key)
            bucket.reviews.push(review)
            bucket.reviewers.add(String(review.reviewer || review.clientName || review.source))
        }
    }

    const existing = await FeedbackSignal.find(onlyEmployee ? { employee: onlyEmployee } : {})
    const seen = new Set(existing.map(s => s.fingerprint))
    // A theme already approved once should not come straight back as a new
    // proposal — the manager has acted on it and is waiting to see whether it
    // worked.
    const settled = new Set(
        existing.filter(s => s.status !== 'proposed').map(s => `${String(s.employee)}::${s.competency}`)
    )

    const created = []
    const usingModel = gemini.isConfigured()

    // One person, one objective at a time.
    //
    // The first version of this raised every theme that cleared the bar, which
    // for a struggling employee meant five development objectives landing at
    // once. That is not a plan, it is a pile — and a manager faced with it acts
    // on none of them. So the themes are ranked per person and only the
    // strongest is proposed; once it is approved or dismissed, the next scan is
    // free to raise the next one.
    const candidates = []

    for (const [key, bucket] of buckets) {
        // Two reviews from the same person is one opinion repeated, so the bar
        // is distinct reviewers rather than distinct documents.
        if (bucket.reviewers.size < MIN_OCCURRENCES) continue
        if (settled.has(key)) continue

        const reviewIds = bucket.reviews.map(r => String(r._id))
        const fingerprint = fingerprintOf(String(bucket.employee._id), bucket.competency, reviewIds)
        if (seen.has(fingerprint)) continue

        const scores = bucket.reviews
            .flatMap(r => (r.ratings || []).filter(x => x.competency === bucket.competency).map(x => x.score))

        candidates.push({
            key, bucket, reviewIds, fingerprint,
            average: scores.length ? mean(scores) : null,
            reviewers: bucket.reviewers.size
        })
    }

    // Worst score first; ties broken by how many people raised it.
    const strongestPerEmployee = new Map()
    for (const candidate of candidates.sort((a, b) =>
        (a.average ?? 5) - (b.average ?? 5) || b.reviewers - a.reviewers)) {
        const employeeId = String(candidate.bucket.employee._id)
        if (!strongestPerEmployee.has(employeeId)) strongestPerEmployee.set(employeeId, candidate)
    }

    const alsoRaised = candidates.length - strongestPerEmployee.size

    for (const { bucket, reviewIds, fingerprint, average } of strongestPerEmployee.values()) {

        const evidenceText = bucket.reviews
            .map(r => (r.improvements || r.comment || '').trim())
            .filter(Boolean)
            .slice(0, 5)
            .map(t => `- ${t}`)
            .join('\n')

        let proposal
        let engine = 'rules'

        if (usingModel && evidenceText) {
            try {
                proposal = await draftByModel(bucket.competency, bucket.employee, evidenceText)
                engine = gemini.modelName()
            } catch {
                proposal = draftByRules(bucket.competency, bucket.employee, bucket.reviewers.size, average ?? 3)
            }
        } else {
            proposal = draftByRules(bucket.competency, bucket.employee, bucket.reviewers.size, average ?? 3)
        }

        const signal = await FeedbackSignal.create({
            employee: bucket.employee._id,
            theme: labelFor(bucket.competency),
            competency: bucket.competency,
            evidence: reviewIds,
            occurrences: bucket.reviewers.size,
            averageScore: average === null ? undefined : round(average, 2),
            rationale: `${labelFor(bucket.competency)} was raised by ${bucket.reviewers.size} different reviewers`
                + (average !== null ? `, averaging ${round(average, 1)} out of 5 on that axis` : '')
                + '. One reviewer is an opinion; three is a pattern worth acting on.',
            severity: average !== null && average <= 2.5 ? 'high' : 'medium',
            proposal,
            status: 'proposed',
            engine,
            fingerprint
        })

        created.push(signal)

        await audit.byAgent('agent.proposed', {
            subjectKind: 'signal',
            subjectId: signal._id,
            summary: `Drafted an objective for ${bucket.employee.name} after ${labelFor(bucket.competency)} was raised by ${bucket.reviewers.size} reviewers`,
            detail: { competency: bucket.competency, evidence: reviewIds, averageScore: average },
            engine
        })
    }

    await audit.byAgent('agent.scanned', {
        subjectKind: 'roster',
        summary: `Read ${reviews.length} submitted reviews and raised ${created.length} new ${created.length === 1 ? 'proposal' : 'proposals'}`
            + (alsoRaised > 0 ? `, holding back ${alsoRaised} weaker ${alsoRaised === 1 ? 'theme' : 'themes'} until these are decided` : ''),
        detail: {
            reviewsRead: reviews.length,
            themesFound: buckets.size,
            metThreshold: candidates.length,
            proposalsCreated: created.length,
            heldBack: alsoRaised
        },
        engine: usingModel ? gemini.modelName() : 'rules'
    })

    return {
        scanned: reviews.length,
        themes: buckets.size,
        metThreshold: candidates.length,
        created: created.length,
        heldBack: alsoRaised,
        engine: usingModel ? gemini.modelName() : 'rules'
    }
}

// --- The human decision ------------------------------------------------------

const shapeSignal = (doc) => {
    const s = doc.toObject ? doc.toObject() : { ...doc }
    return {
        id: String(s._id),
        employeeId: String(s.employee?._id || s.employee),
        employee: s.employee?.name ? {
            id: String(s.employee._id), name: s.employee.name,
            department: s.employee.department, jobTitle: s.employee.jobTitle, color: s.employee.color
        } : null,
        theme: s.theme,
        competency: s.competency,
        evidence: (s.evidence || []).map(String),
        occurrences: s.occurrences,
        averageScore: s.averageScore ?? null,
        rationale: s.rationale,
        severity: s.severity,
        proposal: s.proposal,
        status: s.status,
        decidedByName: s.decidedByName || '',
        decidedAt: s.decidedAt || null,
        decisionNote: s.decisionNote || '',
        createdRef: s.createdRef ? String(s.createdRef) : null,
        engine: s.engine,
        createdAt: s.createdAt
    }
}

const listSignals = async ({ status, employee } = {}) => {
    const filter = {}
    if (status) filter.status = status
    if (employee) filter.employee = employee

    const docs = await FeedbackSignal.find(filter)
        .populate('employee', 'name department jobTitle color')
        .sort({ status: 1, severity: 1, createdAt: -1 })

    return docs.map(shapeSignal)
}

// Approving is the only path by which anything the agent produced reaches the
// rest of the system. The manager may edit the draft first; whatever they
// approve is what gets created, and both facts are logged.
const approveSignal = async (id, { edits, note } = {}, actor) => {
    const signal = await FeedbackSignal.findById(id).populate('employee', 'name department jobTitle')
    if (!signal) return null
    if (signal.status !== 'proposed') return { error: 'That proposal has already been decided on.' }

    const draft = { ...signal.proposal.toObject?.() ?? signal.proposal, ...(edits || {}) }
    const edited = Boolean(edits && Object.keys(edits).length)

    let createdRef = null

    if (draft.kind === 'task') {
        const task = await taskService.createTask({
            title: draft.title,
            description: draft.description,
            department: draft.department || signal.employee.department,
            assignee: signal.employee._id,
            priority: draft.priority || 'medium',
            estimateHours: draft.estimateHours || 8,
            dueDate: new Date(Date.now() + (draft.dueInDays || 30) * 24 * 60 * 60 * 1000)
        })
        createdRef = task?.id || task?._id || null
    } else {
        const objective = await objectiveService.createObjective({
            title: draft.title,
            description: draft.description,
            client: 'Internal — development',
            status: 'active',
            startDate: new Date(),
            dueDate: new Date(Date.now() + (draft.dueInDays || 30) * 24 * 60 * 60 * 1000)
        })
        createdRef = objective?._id || null
    }

    signal.status = 'approved'
    signal.decidedBy = actor?.id || null
    signal.decidedByName = actor?.name || 'A manager'
    signal.decidedAt = new Date()
    signal.decisionNote = note || ''
    signal.proposal = draft
    signal.createdRef = createdRef
    await signal.save()

    if (edited) {
        await audit.byHuman('human.edited', actor, {
            subjectKind: 'signal',
            subjectId: signal._id,
            summary: `${actor?.name || 'A manager'} edited the drafted ${draft.kind} before approving it`,
            detail: { edits }
        })
    }

    await audit.byHuman('human.approved', actor, {
        subjectKind: 'signal',
        subjectId: signal._id,
        summary: `${actor?.name || 'A manager'} approved "${draft.title}" into the ${draft.kind === 'task' ? 'task board' : 'projects'} for ${signal.employee.name}`,
        detail: { createdRef: createdRef ? String(createdRef) : null, kind: draft.kind }
    })

    return shapeSignal(await FeedbackSignal.findById(id).populate('employee', 'name department jobTitle color'))
}

const dismissSignal = async (id, { note } = {}, actor) => {
    const signal = await FeedbackSignal.findById(id).populate('employee', 'name department jobTitle color')
    if (!signal) return null
    if (signal.status !== 'proposed') return { error: 'That proposal has already been decided on.' }

    signal.status = 'dismissed'
    signal.decidedBy = actor?.id || null
    signal.decidedByName = actor?.name || 'A manager'
    signal.decidedAt = new Date()
    signal.decisionNote = note || ''
    await signal.save()

    await audit.byHuman('human.dismissed', actor, {
        subjectKind: 'signal',
        subjectId: signal._id,
        summary: `${actor?.name || 'A manager'} dismissed the proposal for ${signal.employee.name}`,
        detail: { theme: signal.theme, note: note || '' }
    })

    return shapeSignal(signal)
}

module.exports = {
    scan, listSignals, approveSignal, dismissSignal,
    MIN_OCCURRENCES, CONCERN_AT, concernsIn
}
