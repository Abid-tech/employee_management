const Review = require('../model/review')
const Employee = require('../model/employee')
const Objective = require('../model/objective')
const audit = require('./audit_service')

const { COMPETENCIES, COMPETENCY_KEYS, SOURCES } = Review

// --- Small helpers -----------------------------------------------------------

const round = (n, dp = 2) => {
    const f = 10 ** dp
    return Math.round((Number(n) || 0) * f) / f
}
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null)
const idOf = (v) => (v ? String(v._id || v) : null)

const REVIEWER_FIELDS = 'name jobTitle department color'

const shape = (doc) => {
    const r = doc.toObject ? doc.toObject() : { ...doc }
    return {
        id: String(r._id),
        employeeId: idOf(r.employee),
        employee: r.employee && r.employee.name ? {
            id: idOf(r.employee), name: r.employee.name,
            jobTitle: r.employee.jobTitle, department: r.employee.department, color: r.employee.color
        } : null,
        source: r.source,
        reviewerId: idOf(r.reviewer),
        reviewerName: r.reviewer?.name || r.reviewerName || r.clientName || 'Anonymous',
        clientName: r.clientName || '',
        objectiveId: idOf(r.objective),
        objectiveTitle: r.objective?.title || '',
        cycle: r.cycle || '',
        ratings: r.ratings || [],
        overall: r.overall ?? null,
        strengths: r.strengths || '',
        improvements: r.improvements || '',
        comment: r.comment || '',
        status: r.status,
        submittedAt: r.submittedAt || null,
        acknowledgedAt: r.acknowledgedAt || null,
        employeeResponse: r.employeeResponse || '',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
    }
}

const load = (query) => query
    .populate('employee', REVIEWER_FIELDS)
    .populate('reviewer', REVIEWER_FIELDS)
    .populate('objective', 'title status')

// --- Reads -------------------------------------------------------------------

const listReviews = async ({ employee, source, objective, status, cycle, limit = 200 } = {}) => {
    const filter = {}
    if (employee) filter.employee = employee
    if (source) filter.source = source
    if (objective) filter.objective = objective
    if (status) filter.status = status
    if (cycle) filter.cycle = cycle

    const docs = await load(Review.find(filter)).sort({ createdAt: -1 }).limit(Number(limit) || 200)
    return docs.map(shape)
}

const getReview = async (id) => {
    const doc = await load(Review.findById(id))
    return doc ? shape(doc) : null
}

// --- The feedback graph ------------------------------------------------------

// Four sources on one set of axes.
const buildGraph = (reviews) => {
    const submitted = reviews.filter(r => r.status !== 'draft')

    const radar = COMPETENCIES.map(c => {
        const axis = { competency: c.key, label: c.label, blurb: c.blurb }

        for (const source of SOURCES) {
            const scores = submitted
                .filter(r => r.source === source)
                .flatMap(r => r.ratings.filter(x => x.competency === c.key).map(x => x.score))
            axis[source] = scores.length ? round(mean(scores), 2) : null
        }

        const all = submitted.flatMap(r => r.ratings.filter(x => x.competency === c.key).map(x => x.score))
        axis.overall = all.length ? round(mean(all), 2) : null

        // The gap that matters: how a person rates themselves against how everyone else rates them.
        const others = submitted
            .filter(r => r.source !== 'self')
            .flatMap(r => r.ratings.filter(x => x.competency === c.key).map(x => x.score))
        axis.selfGap = (axis.self !== null && others.length)
            ? round(axis.self - mean(others), 2)
            : null

        return axis
    })

    // One point per submitted review.
    const timeline = submitted
        .filter(r => r.overall !== null)
        .map(r => ({
            id: r.id,
            at: r.submittedAt || r.createdAt,
            source: r.source,
            overall: r.overall,
            reviewerName: r.reviewerName,
            objectiveTitle: r.objectiveTitle,
            cycle: r.cycle
        }))
        .sort((a, b) => new Date(a.at) - new Date(b.at))

    const bySource = SOURCES.map(source => {
        const mine = submitted.filter(r => r.source === source)
        const scores = mine.filter(r => r.overall !== null).map(r => r.overall)
        return {
            source,
            count: mine.length,
            average: scores.length ? round(mean(scores), 2) : null
        }
    })

    const overallScores = submitted.filter(r => r.overall !== null).map(r => r.overall)

    return {
        radar,
        timeline,
        bySource,
        average: overallScores.length ? round(mean(overallScores), 2) : null,
        reviewCount: submitted.length,
        // Feedback that was written but never read.
        unacknowledged: submitted.filter(r => r.status === 'submitted').length
    }
}

const employeeDossier = async (employeeId) => {
    const employee = await Employee.findById(employeeId)
    if (!employee) return null

    const reviews = await listReviews({ employee: employeeId, limit: 500 })

    return {
        employee: {
            id: String(employee._id),
            name: employee.name,
            jobTitle: employee.jobTitle,
            department: employee.department,
            color: employee.color,
            email: employee.email || '',
            initials: employee.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
        },
        competencies: COMPETENCIES,
        graph: buildGraph(reviews),
        // The complete history, newest first.
        history: reviews
    }
}

// --- Writes ------------------------------------------------------------------

const EDITABLE = [
    'source', 'reviewer', 'reviewerName', 'clientName', 'objective', 'cycle',
    'ratings', 'strengths', 'improvements', 'comment', 'status'
]

const createReview = async (input, actor) => {
    const doc = new Review({ employee: input.employee })

    for (const key of EDITABLE) {
        if (key in input && input[key] !== undefined) doc[key] = input[key]
    }
    if (!doc.cycle) doc.cycle = defaultCycle()

    await doc.save()

    if (doc.status === 'submitted') {
        await audit.byHuman('review.submitted', actor, {
            subjectKind: 'review',
            subjectId: doc._id,
            summary: `${actor?.name || 'Someone'} submitted a ${doc.source} review`,
            detail: { overall: doc.overall, employee: String(doc.employee) }
        })
    }

    return getReview(doc._id)
}

const updateReview = async (id, changes, actor) => {
    const doc = await Review.findById(id)
    if (!doc) return null

    const wasSubmitted = doc.status === 'submitted' || doc.status === 'acknowledged'

    for (const key of EDITABLE) {
        if (key in changes && changes[key] !== undefined) doc[key] = changes[key]
    }
    await doc.save()

    if (!wasSubmitted && doc.status === 'submitted') {
        await audit.byHuman('review.submitted', actor, {
            subjectKind: 'review',
            subjectId: doc._id,
            summary: `${actor?.name || 'Someone'} submitted a ${doc.source} review`,
            detail: { overall: doc.overall, employee: String(doc.employee) }
        })
    }

    return getReview(id)
}

// The employee side of the loop.
const acknowledgeReview = async (id, { response } = {}, actor) => {
    const doc = await Review.findById(id)
    if (!doc) return null
    if (doc.status === 'draft') return { error: 'That review has not been submitted yet.' }

    doc.status = 'acknowledged'
    doc.acknowledgedAt = new Date()
    if (response) doc.employeeResponse = response
    await doc.save()

    await audit.byHuman('review.acknowledged', actor, {
        subjectKind: 'review',
        subjectId: doc._id,
        summary: `${actor?.name || 'The employee'} acknowledged a ${doc.source} review`,
        detail: { respondedInWriting: Boolean(response) }
    })

    return getReview(id)
}

const deleteReview = async (id) => {
    const removed = await Review.findByIdAndDelete(id)
    return Boolean(removed)
}

// --- Context for the forms ---------------------------------------------------

const defaultCycle = () => {
    const now = new Date()
    return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
}

// Which people finished an objective recently and have had no feedback on it.
const pendingAfterDelivery = async () => {
    const Task = require('../model/task')

    const [objectives, tasks, reviews] = await Promise.all([
        Objective.find({ status: { $in: ['active', 'delivered'] } }),
        Task.find({ status: 'done' }).populate('assignee', REVIEWER_FIELDS),
        Review.find({ objective: { $ne: null } })
    ])

    const done = new Set(reviews.map(r => `${idOf(r.employee)}:${idOf(r.objective)}`))
    const out = []

    for (const objective of objectives) {
        const oid = String(objective._id)
        const mine = tasks.filter(t => idOf(t.objective) === oid && t.assignee)

        const people = [...new Map(mine.map(t => [idOf(t.assignee), t.assignee])).values()]
        for (const person of people) {
            if (done.has(`${idOf(person)}:${oid}`)) continue
            const contributed = mine.filter(t => idOf(t.assignee) === idOf(person)).length
            if (contributed < 2) continue

            out.push({
                employeeId: idOf(person),
                employeeName: person.name,
                department: person.department,
                color: person.color,
                objectiveId: oid,
                objectiveTitle: objective.title,
                tasksDelivered: contributed
            })
        }
    }

    return out.sort((a, b) => b.tasksDelivered - a.tasksDelivered).slice(0, 12)
}

module.exports = {
    listReviews, getReview, employeeDossier, buildGraph,
    createReview, updateReview, acknowledgeReview, deleteReview,
    pendingAfterDelivery, defaultCycle,
    COMPETENCIES, COMPETENCY_KEYS, SOURCES, shape, round, mean
}
