// Module 4 — demo data for Employee Performance Management.
//
//   node seed_performance_demo.js          add the demo data
//   node seed_performance_demo.js --undo   remove exactly what it added
//
// Why this exists as its own script rather than as part of `npm run seed`:
// performance is *derived*. Every number on the module's pages comes from
// completed tasks, deadlines met, hours logged, checklists finished and
// questions answered on other people's work. The base seed leaves almost
// nothing finished, so the module renders correctly and shows a wall of zeros —
// which demonstrates nothing.
//
// Two rules this script holds to, so it stays safe to run against real data:
//
//   1. It only ever INSERTS. Nothing existing is edited or deleted, so the
//      undo is a pure delete and can never lose work somebody did.
//   2. Every id it creates is written to a manifest file, and --undo removes
//      only those ids. Running it twice adds a second batch; undo removes the
//      most recent one.
//
// Note that `npm run seed` clears the task and comment collections, so running
// the base seed afterwards wipes this too. Run this one second.

require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

const connectDB = require('./config/db')
const Task = require('./model/task')
const Comment = require('./model/comment')
const Employee = require('./model/employee')
const Objective = require('./model/objective')

const MANIFEST = path.join(__dirname, 'data', 'performance_demo_manifest.json')

const DAY = 24 * 60 * 60 * 1000
const WEEK = 7 * DAY

// --- Deterministic randomness ------------------------------------------------
// A fixed seed so two people running this get the same demo, and so a screenshot
// taken today still matches the data tomorrow.
let state = 0x9e3779b9
const rnd = () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (list) => list[Math.floor(rnd() * list.length)]
const between = (lo, hi) => lo + rnd() * (hi - lo)
const intBetween = (lo, hi) => Math.round(between(lo, hi))

// --- Task titles by department ----------------------------------------------
// Written out rather than generated, because "Task 47" makes every screen look
// like test data and the point of a demo is that it reads like a real quarter.
const TITLES = {
    Engineering: [
        'Cache the department roll-up query', 'Retry failed webhook deliveries', 'Move uploads off the request thread',
        'Add pagination to the task list API', 'Fix timezone drift on due dates', 'Split the auth middleware',
        'Index the comments collection', 'Handle partial failures in the importer', 'Rate-limit the public endpoints',
        'Replace the polling loop with a socket', 'Backfill missing completedAt stamps', 'Tidy the error envelope',
        'Add health checks to the API', 'Compress the attachment payloads', 'Guard against duplicate submissions',
        'Migrate the seed script to batches', 'Reduce cold-start time on Vercel', 'Trace slow aggregate queries',
        'Harden the file-type checks', 'Add optimistic updates to the board', 'Write contract tests for the report API',
        'Fix the off-by-one in week bucketing', 'Deduplicate the notification fan-out', 'Cache department metadata',
        'Stream large CSV exports', 'Recover gracefully from a dropped connection', 'Normalise the priority weights'
    ],
    Design: [
        'Rework the empty states', 'Audit colour contrast across the app', 'Design the report builder layout',
        'Simplify the task detail header', 'Build the badge iconography', 'Redraw the score dial',
        'Tighten the mobile leaderboard', 'Spec the department drill-down', 'Unify the button scale',
        'Illustrate the onboarding steps', 'Refine the priority colour ramp', 'Design the reward ledger rows',
        'Prototype the filter chips', 'Test the dashboard at 320px', 'Document the spacing scale'
    ],
    Marketing: [
        'Write the launch announcement', 'Draft the case study outline', 'Plan the Q3 content calendar',
        'Refresh the pricing page copy', 'Brief the demo video script', 'Collect three customer quotes',
        'Set up the release newsletter', 'Rewrite the feature comparison', 'Publish the changelog digest',
        'Prepare the conference one-pager', 'Audit the landing page headlines', 'Draft the partner email sequence'
    ],
    'Human Resources': [
        'Write the engineering job description', 'Schedule the second-round interviews', 'Refresh the onboarding checklist',
        'Draft the review calibration guide', 'Update the leave policy wording', 'Run the quarterly pulse survey',
        'Book the team offsite venue', 'Prepare the offer letter template', 'Map the promotion criteria',
        'Summarise the exit interview themes'
    ]
}

const SUBTASKS = [
    'Agree the approach', 'Draft it', 'Review with the team', 'Handle the edge cases',
    'Write the tests', 'Update the docs', 'Ship it'
]

const COMMENT_BODIES = [
    'Left a note on the approach — the second option is cheaper to maintain.',
    'This is blocked on the schema change; I can take that if it helps.',
    'Checked it against staging, looks right to me.',
    'One edge case: what happens when the estimate is zero?',
    'I hit this last month — the fix is in the importer, not here.',
    'Reviewed. Two small comments, nothing blocking.',
    'Pairing on this tomorrow morning if you want a second pair of eyes.',
    'Answered above — the weights are a partition, so it always sums to 100.',
    'Confirmed the numbers against the report export.',
    'Picked this up so it does not sit over the weekend.'
]

// --- The cast ----------------------------------------------------------------
//
// Each person is given a deliberate shape so that every feature in the module
// has something real to show: a top performer, someone overloaded, someone
// quietly holding the team together, someone whose output is falling away.
//
//   done          tasks completed in the period
//   weeks         which of the 12 weeks they landed work in (drives consistency,
//                 streak and the momentum arrow)
//   onTime        share of dated tasks delivered by their due date
//   accuracy      how close logged hours land to the estimate (drives quality)
//   thorough      share of checklist items ticked before closing
//   critical      how many of the completed tasks were critical priority
//   openHours     open work still owed — the sustainability signal
//   openCount     number of open tasks, used for the imbalance check
//   openCritical  open critical tasks
//   overdue       open tasks already past their date
//   weekendShare  share of completions stamped on a Saturday or Sunday
//   comments      comments left on OTHER people's tasks
//   answers       how many of those were replies or resolutions
const ALL_WEEKS = Array.from({ length: 12 }, (_, i) => i + 1)
const RECENT = [5, 6, 7, 8, 9, 10, 11, 12]
const EARLY = [1, 2, 3, 4, 5, 6, 7]

const CAST = [
    {
        // The standout. Earns Mentor, On time, Steady, Streak and the 25-task
        // Milestone, so the badge grid has something lit in every position.
        name: 'Rima Sultana', trend: 'steady', done: 30, weeks: ALL_WEEKS, onTime: 0.96, accuracy: 0.95, thorough: 0.97,
        critical: 6, openHours: 7, openCount: 1, openCritical: 0, overdue: 0, weekendShare: 0.04,
        comments: 18, answers: 12
    },
    {
        name: 'Golam Rabbani Shanto', trend: 'rising', done: 18, weeks: ALL_WEEKS, onTime: 0.88, accuracy: 0.9, thorough: 0.9,
        critical: 4, openHours: 20, openCount: 3, openCritical: 1, overdue: 0, weekendShare: 0.08,
        comments: 11, answers: 6
    },
    {
        // Overloaded. High output but 78h of open work, three open critical and
        // weekend finishes — this is the person the "Do now" action is about.
        name: 'Rahim Uddin', trend: 'falling', done: 21, weeks: ALL_WEEKS, onTime: 0.72, accuracy: 0.7, thorough: 0.78,
        critical: 6, openHours: 78, openCount: 9, openCritical: 3, overdue: 3, weekendShare: 0.38,
        comments: 4, answers: 1
    },
    {
        // The silent hero: modest rank, but answers everybody and clears the
        // critical work nobody else picks up.
        name: 'Sadia Karim', trend: 'rising', done: 9, weeks: RECENT, onTime: 0.85, accuracy: 0.86, thorough: 0.92,
        critical: 3, openHours: 6, openCount: 1, openCritical: 0, overdue: 0, weekendShare: 0.04,
        comments: 16, answers: 10
    },
    {
        // Slipping: busy early, quiet since. Drives the momentum arrow and the
        // "output is falling" check-in action.
        name: 'Ayan Mahmud', trend: 'falling', done: 11, weeks: EARLY, onTime: 0.6, accuracy: 0.62, thorough: 0.6,
        critical: 1, openHours: 26, openCount: 5, openCritical: 1, overdue: 2, weekendShare: 0.12,
        comments: 3, answers: 1
    },
    {
        name: 'Moumita Heena', trend: 'steady', done: 15, weeks: ALL_WEEKS, onTime: 0.86, accuracy: 0.88, thorough: 0.85,
        critical: 2, openHours: 16, openCount: 3, openCritical: 0, overdue: 0, weekendShare: 0.06,
        comments: 9, answers: 5
    },
    {
        name: 'Farhana Islam', trend: 'rising', done: 14, weeks: ALL_WEEKS, onTime: 0.9, accuracy: 0.87, thorough: 0.93,
        critical: 2, openHours: 12, openCount: 2, openCritical: 0, overdue: 0, weekendShare: 0.05,
        comments: 8, answers: 4
    },
    {
        name: 'Karim Chowdhury', trend: 'rising', done: 7, weeks: [3, 4, 6, 7, 9, 11], onTime: 0.7, accuracy: 0.72, thorough: 0.7,
        critical: 0, openHours: 18, openCount: 4, openCritical: 0, overdue: 1, weekendShare: 0.1,
        comments: 5, answers: 2
    },
    {
        // Marketing is a two-person department and Mehedi does most of it, which
        // is what the single-point-of-failure action is meant to surface.
        name: 'Mehedi Hasan', trend: 'steady', done: 13, weeks: ALL_WEEKS, onTime: 0.84, accuracy: 0.83, thorough: 0.86,
        critical: 1, openHours: 15, openCount: 3, openCritical: 0, overdue: 0, weekendShare: 0.07,
        comments: 6, answers: 3
    },
    {
        name: 'Sumaiya Akter', trend: 'falling', done: 4, weeks: [2, 5, 9, 12], onTime: 0.5, accuracy: 0.55, thorough: 0.5,
        critical: 0, openHours: 22, openCount: 4, openCritical: 1, overdue: 2, weekendShare: 0.2,
        comments: 2, answers: 0
    },
    {
        name: 'Nusrat Jahan', trend: 'rising', done: 12, weeks: ALL_WEEKS, onTime: 0.89, accuracy: 0.85, thorough: 0.88,
        critical: 1, openHours: 10, openCount: 2, openCritical: 0, overdue: 0, weekendShare: 0.05,
        comments: 7, answers: 4
    },
    {
        name: 'Shakib Rahman', trend: 'steady', done: 6, weeks: [4, 5, 7, 8, 10, 12], onTime: 0.75, accuracy: 0.78, thorough: 0.75,
        critical: 0, openHours: 9, openCount: 2, openCritical: 0, overdue: 0, weekendShare: 0.06,
        comments: 4, answers: 2
    }
]

// --- Generators --------------------------------------------------------------

const PRIORITIES = ['low', 'medium', 'medium', 'high', 'high', 'medium']

// Nudge a date onto a weekday, or deliberately onto a weekend for the share of
// completions meant to look like somebody working through their Saturday.
// Week `n` of 12 is the window (to − (13−n) weeks, to − (12−n) weeks]. Anchoring
// on the *start* of the window matters: anchoring on the end put week 12's
// completions a few days into the future, where `inPeriod` correctly ignored
// them — so the most recent week silently vanished from every trend and streak.
const placeInWeek = (weekIndex, to, wantWeekend) => {
    const start = to.getTime() - (13 - weekIndex) * WEEK
    for (let attempt = 0; attempt < 12; attempt += 1) {
        const at = new Date(start + intBetween(0, 6) * DAY + intBetween(9, 18) * 60 * 60 * 1000)
        if (at.getTime() > to.getTime()) continue
        const day = at.getDay()
        const isWeekend = day === 0 || day === 6
        if (isWeekend === wantWeekend) return at
    }
    return new Date(Math.min(start + 3 * DAY, to.getTime() - DAY))
}

// How many completions land in each of the person's active weeks.
//
// Spreading tasks round-robin looked fine and was not: when the count is not an
// exact multiple of the weeks, the leftovers all pile into the earliest weeks,
// so the back half of the period is always lighter than the front and momentum
// reports "Slipping" for almost everybody. Allocating deliberately — with a
// ramp per person — makes the trend a property of the cast rather than of the
// arithmetic.
const rampAt = (trend, i, span) => {
    const t = i / span
    // A gentle ramp on purpose. Steeper values produced "Rising +200%" rows,
    // which is not a number anybody reads as real.
    if (trend === 'rising') return 0.72 + 0.56 * t
    if (trend === 'falling') return 1.28 - 0.56 * t
    return 1
}

// Place each completion into a week so that the *weighted hours* per week follow
// the person's trend.
//
// Dealing task counts round-robin was not enough. Momentum compares weighted
// hours between the two halves of the period, and a critical 20-hour build is
// ten times a low-priority 2-hour chore — so an even count of tasks per week
// still produced a lumpy hour curve, and a person meant to be steady read as
// "Slipping" on the strength of which weeks happened to catch the big items.
//
// Tasks are dealt largest-first into whichever week is furthest below its target,
// which keeps the hour curve on the ramp regardless of how the sizes fell out.
const assignWeeksByHours = (weights, weeks, trend) => {
    const span = Math.max(1, weeks.length - 1)
    const ramp = weeks.map((_, i) => rampAt(trend, i, span))
    const rampSum = ramp.reduce((a, b) => a + b, 0)
    const totalWeight = weights.reduce((a, b) => a + b, 0)

    const target = ramp.map(r => (r / rampSum) * totalWeight)
    const filled = weeks.map(() => 0)

    const order = weights
        .map((w, i) => ({ i, w }))
        .sort((a, b) => b.w - a.w)

    const out = new Array(weights.length)
    for (const { i, w } of order) {
        // Every week starts with an identical deficit, so taking the strict
        // maximum handed the largest task to week 1, the next to week 2 and so
        // on — a steady person came out with a steeply descending hour curve and
        // a "Slipping" arrow. Choosing at random among the weeks that are
        // effectively tied keeps the totals on the ramp without imposing an
        // order on the sizes.
        let deficit = -Infinity
        for (let k = 0; k < weeks.length; k += 1) {
            const d = target[k] - filled[k]
            if (d > deficit) deficit = d
        }

        const tied = []
        for (let k = 0; k < weeks.length; k += 1) {
            if (target[k] - filled[k] >= deficit - 0.75) tied.push(k)
        }

        const best = tied[Math.floor(rnd() * tied.length)]
        filled[best] += w
        out[i] = weeks[best]
    }

    return out
}

const makeSubtasks = (thorough, completedAt) => {
    const total = intBetween(2, 5)
    const doneCount = Math.round(total * thorough)
    return Array.from({ length: total }, (_, i) => ({
        title: SUBTASKS[i % SUBTASKS.length],
        done: i < doneCount,
        completedAt: i < doneCount ? completedAt : undefined
    }))
}

const buildFor = (person, employee, objectives, to, titlePool) => {
    const tasks = []

    // Decide what each completion *is* before deciding when it happened, so the
    // scheduler below can balance the weeks by hours rather than by task count.
    const PRIORITY_WEIGHT = { critical: 2.0, high: 1.5, medium: 1.0, low: 0.7 }
    const criticalAt = new Set()
    if (person.critical > 0) {
        const stride = person.done / person.critical
        for (let k = 0; k < person.critical; k += 1) {
            criticalAt.add(Math.min(person.done - 1, Math.round(k * stride + stride / 2)))
        }
    }

    const specs = Array.from({ length: person.done }, (_, i) => {
        const priority = criticalAt.has(i) ? 'critical' : pick(PRIORITIES)
        const estimateHours = priority === 'critical' ? intBetween(8, 20) : intBetween(2, 10)
        return { priority, estimateHours, weight: PRIORITY_WEIGHT[priority] * estimateHours }
    })

    const schedule = assignWeeksByHours(specs.map(s => s.weight), person.weeks, person.trend || 'steady')

    for (let i = 0; i < person.done; i += 1) {
        const week = schedule[i]
        const wantWeekend = rnd() < person.weekendShare
        const completedAt = placeInWeek(week, to, wantWeekend)

        const { priority, estimateHours } = specs[i]

        // Logged hours drift away from the estimate by however accurate this
        // person is meant to be — that drift is the whole of the honesty term
        // in the quality pillar.
        const drift = (1 - person.accuracy) * between(0.6, 1.4)
        const spentHours = Math.max(0.5, Math.round(estimateHours * (1 + (rnd() < 0.5 ? -drift : drift)) * 10) / 10)

        // On-time work lands before its date; the rest lands a few days after.
        const onTime = rnd() < person.onTime
        const dueDate = onTime
            ? new Date(completedAt.getTime() + intBetween(1, 5) * DAY)
            : new Date(completedAt.getTime() - intBetween(1, 6) * DAY)

        tasks.push({
            title: titlePool[(i * 3 + person.done) % titlePool.length],
            description: 'Demo record for the performance module.',
            department: employee.department,
            assignee: employee._id,
            objective: rnd() < 0.72 ? pick(objectives)._id : null,
            priority,
            status: 'done',
            estimateHours,
            spentHours,
            dueDate,
            assignedAt: new Date(completedAt.getTime() - intBetween(7, 21) * DAY),
            startedAt: new Date(completedAt.getTime() - intBetween(1, 6) * DAY),
            completedAt,
            subtasks: makeSubtasks(person.thorough, completedAt),
            source: 'manual'
        })
    }

    // Open work. Spread the person's owed hours across their open tasks so the
    // load index lands where the cast intended.
    const perTask = person.openCount > 0 ? person.openHours / person.openCount : 0
    for (let i = 0; i < person.openCount; i += 1) {
        const isCritical = i < person.openCritical
        const isOverdue = i < person.overdue
        tasks.push({
            title: titlePool[(i * 5 + 2) % titlePool.length],
            description: 'Demo record for the performance module.',
            department: employee.department,
            assignee: employee._id,
            objective: rnd() < 0.6 ? pick(objectives)._id : null,
            priority: isCritical ? 'critical' : pick(PRIORITIES),
            status: rnd() < 0.4 ? 'in_progress' : 'todo',
            estimateHours: Math.max(2, Math.round(perTask)),
            spentHours: 0,
            dueDate: isOverdue
                ? new Date(to.getTime() - intBetween(2, 14) * DAY)
                : new Date(to.getTime() + intBetween(3, 25) * DAY),
            assignedAt: new Date(to.getTime() - intBetween(5, 20) * DAY),
            subtasks: [],
            source: 'manual'
        })
    }

    return tasks
}

// --- Run ---------------------------------------------------------------------

const readManifest = () => {
    try {
        return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
    } catch {
        return null
    }
}

const undo = async () => {
    const manifest = readManifest()
    if (!manifest) {
        console.log('No manifest found — nothing to undo.')
        return
    }

    const comments = await Comment.deleteMany({ _id: { $in: manifest.comments } })
    const tasks = await Task.deleteMany({ _id: { $in: manifest.tasks } })

    fs.unlinkSync(MANIFEST)
    console.log(`Removed ${tasks.deletedCount} demo tasks and ${comments.deletedCount} demo comments.`)
    console.log('Nothing else was touched — the script only ever inserted.')
}

const seed = async () => {
    if (readManifest()) {
        console.log('Demo data is already in place. Run with --undo first if you want a clean batch.')
        return
    }

    const [employees, objectives] = await Promise.all([
        Employee.find(),
        Objective.find({ status: { $in: ['active', 'planning'] } })
    ])

    if (employees.length === 0) throw new Error('No employees found. Run `npm run seed` first.')
    if (objectives.length === 0) throw new Error('No active objectives found. Run `npm run seed` first.')

    const byName = new Map(employees.map(e => [e.name, e]))
    const to = new Date()

    // 1. Tasks.
    const docs = []
    const ownerOf = []

    for (const person of CAST) {
        const employee = byName.get(person.name)
        if (!employee) {
            console.warn(`  ! No employee named "${person.name}" — skipped.`)
            continue
        }

        const pool = TITLES[employee.department] || TITLES.Engineering
        for (const task of buildFor(person, employee, objectives, to, pool)) {
            docs.push(task)
            ownerOf.push(String(employee._id))
        }
    }

    // Two critical tasks with nobody on them. The most expensive silence in the
    // dataset, and the one thing on the actions panel that is not about a person.
    docs.push({
        title: 'Restore the nightly backup job',
        description: 'Demo record for the performance module.',
        department: 'Engineering', assignee: null, objective: objectives[0]._id,
        priority: 'critical', status: 'todo', estimateHours: 12, spentHours: 0,
        dueDate: new Date(to.getTime() - 4 * DAY), subtasks: [], source: 'manual'
    })
    ownerOf.push(null)

    docs.push({
        title: 'Sign off the accessibility audit',
        description: 'Demo record for the performance module.',
        department: 'Design', assignee: null, objective: objectives[1]._id,
        priority: 'critical', status: 'todo', estimateHours: 8, spentHours: 0,
        dueDate: new Date(to.getTime() + 6 * DAY), subtasks: [], source: 'manual'
    })
    ownerOf.push(null)

    const created = await Task.insertMany(docs)
    console.log(`  Tasks inserted:    ${created.length}`)

    // 2. Comments on OTHER people's tasks — the only thing the collaboration
    //    pillar counts. A comment on your own task scores nothing, so the seed
    //    has to respect that or the pillar stays at zero.
    // Comments are seeded in two passes rather than scattered at random.
    //
    // A "reply" only counts for the collaboration pillar if `replyTo` points at
    // a real comment on the same task. Scattering comments across 200 tasks
    // means almost none of them land together, so almost nothing can be a reply
    // and the Mentor badge is unreachable. Concentrating the conversation onto a
    // pool of discussion tasks is also simply what a real team looks like.
    const owned = created.filter((_, i) => ownerOf[i])
    const ownerById = new Map(created.map((t, i) => [String(t._id), ownerOf[i]]))

    // Pass 1 — open a question on each discussion task.
    const discussion = owned.filter(() => rnd() < 0.22).slice(0, 34)
    const roster = CAST.map(p => byName.get(p.name)).filter(Boolean)

    const rootDocs = discussion.map(task => {
        const asker = roster.find(e => String(e._id) === ownerById.get(String(task._id))) || pick(roster)
        return {
            task: task._id,
            author: asker._id,
            authorName: asker.name,
            body: pick(COMMENT_BODIES),
            kind: 'question',
            replyTo: null,
            resolved: false,
            createdAt: new Date(to.getTime() - intBetween(10, 80) * DAY)
        }
    })

    const rootComments = await Comment.insertMany(rootDocs, { timestamps: false })
    const rootByTask = new Map(rootComments.map(c => [String(c.task), c]))

    // Pass 2 — each person answers questions on other people's tasks first,
    // then leaves plain comments with whatever allowance is left.
    const replyDocs = []

    for (const person of CAST) {
        const employee = byName.get(person.name)
        if (!employee) continue

        const answerable = discussion.filter(t => ownerById.get(String(t._id)) !== String(employee._id))
        const plain = owned.filter(t => ownerById.get(String(t._id)) !== String(employee._id))
        if (plain.length === 0) continue

        for (let i = 0; i < person.comments; i += 1) {
            const asAnswer = i < person.answers && answerable.length > 0
            const task = asAnswer
                ? answerable[i % answerable.length]
                : plain[Math.floor(rnd() * plain.length)]

            replyDocs.push({
                task: task._id,
                author: employee._id,
                authorName: employee.name,
                body: pick(COMMENT_BODIES),
                kind: 'comment',
                replyTo: asAnswer ? (rootByTask.get(String(task._id))?._id ?? null) : null,
                resolved: asAnswer && rnd() < 0.6,
                createdAt: new Date(to.getTime() - intBetween(1, 70) * DAY)
            })
        }
    }

    const replies = await Comment.insertMany(replyDocs, { timestamps: false })
    const madeComments = [...rootComments, ...replies]
    const answerCount = replies.filter(c => c.replyTo).length

    console.log(`  Comments inserted: ${madeComments.length} (${answerCount} answering a question)`)

    // 3. The manifest, so --undo knows exactly what to remove.
    fs.mkdirSync(path.dirname(MANIFEST), { recursive: true })
    fs.writeFileSync(MANIFEST, JSON.stringify({
        createdAt: new Date().toISOString(),
        tasks: created.map(t => String(t._id)),
        comments: madeComments.map(c => String(c._id))
    }, null, 2))

    console.log(`  Manifest written:  ${path.relative(__dirname, MANIFEST)}`)
    console.log('\nDone. Open /performance — every panel now has data behind it.')
    console.log('Undo at any time with: node seed_performance_demo.js --undo')
}

const main = async () => {
    await connectDB()
    if (process.argv.includes('--undo')) await undo()
    else await seed()
    await mongoose.connection.close()
}

main().catch(async (error) => {
    console.error('Demo seed failed:', error.message)
    await mongoose.connection.close().catch(() => {})
    process.exit(1)
})
