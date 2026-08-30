const Task = require('../model/task')
const Employee = require('../model/employee')
const performance = require('./performance_service')
const budget = require('./budget_service')

// Who should take this work, and what happens to everybody if they do.
//
// Every performance dashboard in existence can tell a manager that somebody is
// overloaded. None of them can tell them what to do about it, because the answer
// needs four things at once and no single product holds all four:
//
//   the load        who is carrying how many hours, from the task board
//   the throughput  how fast each person actually clears work, from the record
//   the money       what an hour of each person costs, from the rate table
//   the calendar    which deadlines a move would put at risk
//
// A resourcing tool has the first. A performance tool has the second. A time and
// billing tool has the third. A project tool has the fourth. This app is the
// only place all four sit in one database, so it is the only place the sentence
// "move these two tasks to Sadia — it costs $41 more, takes six days off Rahim's
// finish date, and puts no deadline at risk" can be produced at all.
//
// Nothing here reassigns anything. It produces a costed proposal and stops,
// because the person who knows whether Sadia is about to go on leave is the
// manager, not the model.

const DAY = 24 * 60 * 60 * 1000

const round = (n, dp = 1) => {
    const f = 10 ** dp
    return Math.round((Number(n) || 0) * f) / f
}
const money = (n) => Math.round((Number(n) || 0) * 100) / 100

// A task is movable if handing it to somebody else does not throw work away.
// Anything already underway carries context in somebody's head that does not
// transfer, and moving a critical item to save load is trading one risk for a
// worse one.
const MOVABLE = {
    maxProgress: 0,
    excludedPriorities: ['critical'],
    // Something due inside a week cannot absorb a handover, whoever takes it.
    minDaysOfRunway: 7
}

// How much queue a receiving person is allowed to end up with, in weeks of their
// own demonstrated pace.
//
// Without a ceiling this tool does the exact thing it exists to prevent. The
// company has one engineer with slack, so the first version cheerfully proposed
// moving fifty-six hours onto her across three separate plans and left her with
// a deeper queue than two of the people being relieved. Refusing the move and
// saying the department is out of capacity is the honest answer, and it is the
// one that leads to a real decision — move a deadline, or hire.
const MAX_RECIPIENT_WEEKS = 3

const isMovable = (task, now) => {
    if (task.status !== 'todo') return false
    if (MOVABLE.excludedPriorities.includes(task.priority)) return false

    const progress = task.progressPercent ? task.progressPercent() : 0
    if (progress > MOVABLE.maxProgress) return false

    if (task.dueDate) {
        const runway = (new Date(task.dueDate).getTime() - now.getTime()) / DAY
        if (runway < MOVABLE.minDaysOfRunway) return false
    }
    return true
}

const whyNotMovable = (task, now) => {
    if (task.status !== 'todo') return 'already in progress — the context does not transfer'
    if (MOVABLE.excludedPriorities.includes(task.priority)) return 'critical, so a handover is the bigger risk'

    const progress = task.progressPercent ? task.progressPercent() : 0
    if (progress > 0) return `${progress}% done already`

    if (task.dueDate) {
        const runway = (new Date(task.dueDate).getTime() - now.getTime()) / DAY
        if (runway < MOVABLE.minDaysOfRunway) return `due in ${Math.max(0, Math.round(runway))} days — no room for a handover`
    }
    return ''
}

// --- Capacity ----------------------------------------------------------------

// How fast somebody actually clears work, and how much they have queued.
//
// Throughput is measured from what they finished, not from a nominal 8-hour day:
// a person who has been clearing 12 hours of estimated work a week has a real
// capacity of 12, whatever their contract says. Using the record rather than an
// assumption is the whole reason this can be trusted enough to act on.
const capacityOf = (person, weeks, committedHours = 0) => {
    const throughput = weeks > 0 ? person.stats.weightedHoursDone / weeks : 0

    // Hours this run has already proposed handing them counts as queue. Without
    // it every plan is computed against the same starting picture, so the one
    // person with slack gets offered work by three different plans and a manager
    // who applies all of them creates the overload they were trying to fix.
    const openHours = (person.sustainability.openHours || 0) + committedHours

    // Rounded once, then every derived figure is computed from the rounded
    // values. The first version divided by the raw throughput here and by the
    // rounded one when reporting the "after" position, so a plan that moved
    // nothing still showed the queue shrinking from 28.7 weeks to 28.4.
    const perWeek = round(throughput, 1)
    const queued = round(openHours, 1)

    return {
        throughputPerWeek: perWeek,
        openHours: queued,
        // Weeks of queue at their own demonstrated pace. This is the figure that
        // makes two people comparable when one is quick and one is careful.
        weeksOfWork: perWeek > 0 ? round(queued / perWeek, 1) : null,
        status: person.sustainability.status
    }
}

// --- Public: who should take a piece of work ---------------------------------

// Ranked candidates for one task, each carrying the arithmetic.
//
// The ranking is deliberately not a single opaque number. Four separate readings
// are reported and the order is decided by their sum, so a manager who disagrees
// with the weighting can see exactly which reading they are overruling.
const candidatesFor = async ({
    department, estimateHours = 0, objectiveId, excludeId, exclude = [], now = new Date(), preloaded,
    committed
} = {}) => {
    // The overview is the most expensive read in the application, and the
    // rebalancer needs candidates for every task it considers. Calling this
    // function in that loop without passing `preloaded` re-ran the entire
    // company scoring once per task — the first version took three seconds for
    // fourteen proposals, almost all of it the same query repeated.
    const [overview, context] = preloaded
        ? [preloaded.overview, preloaded.context]
        : await Promise.all([performance.overview(), budget.loadContext()])

    const tasks = objectiveId
        ? await Task.find({ objective: objectiveId }).select('assignee')
        : []

    const weeks = Math.max(1, (new Date(overview.period.to) - new Date(overview.period.from)) / (7 * DAY))
    const barred = new Set([excludeId, ...exclude].filter(Boolean))

    // Who has already worked on this project. Familiarity is worth real hours,
    // and it is the one thing a pure capacity calculation always misses.
    const onProject = new Set(tasks.map(t => String(t.assignee || '')).filter(Boolean))

    const rows = overview.leaderboard
        // Never propose moving work onto somebody who is themselves under
        // strain. Without this the two-person Design department produced a
        // straight swap — each of the pair handed the other a task — which is
        // motion, not relief.
        .filter(person => !barred.has(person.id))
        .filter(person => !department || person.department === department)
        .map(person => {
            const capacity = capacityOf(person, weeks, committed?.get(person.id) || 0)
            const rate = budget.rateOn(person.id, now, context.ratesByEmployee)
            const costRate = rate?.costRate || 0

            // Four readings, each 0–25, so the total lands on a familiar 0–100
            // and no single reading can carry a candidate on its own.
            const headroom = capacity.weeksOfWork === null ? 12
                : capacity.weeksOfWork <= 1 ? 25
                    : capacity.weeksOfWork <= 2 ? 19
                        : capacity.weeksOfWork <= 3 ? 12
                            : capacity.weeksOfWork <= 4 ? 6
                                : 0

            // The performance module's own vocabulary: healthy / stretched / at_risk.
            // Getting this wrong is not a small miss — an unknown status falls to
            // the middle of the range, so a person already at risk would score the
            // same as a healthy one and could be handed more work.
            const health = { healthy: 25, stretched: 8, at_risk: 0 }[capacity.status] ?? 0

            // Delivery record, rescaled onto the same 0–25 axis as the rest.
            const record = round((person.score / (overview.scoreMax || 100)) * 25, 1)

            const familiarity = onProject.has(person.id) ? 25 : 10

            const total = round(headroom + health + record + familiarity, 1)

            return {
                id: person.id,
                name: person.name,
                initials: person.initials,
                color: person.color,
                department: person.department,
                jobTitle: person.jobTitle,

                score: person.score,
                grade: person.grade,
                momentum: person.momentum,
                capacity,
                alreadyPromised: round(committed?.get(person.id) || 0, 1),
                onThisProject: onProject.has(person.id),

                costRate,
                // What handing them this task would cost, at the rate in force
                // today. Two equally capable people are rarely equally priced,
                // and no resourcing tool anywhere shows this at the point of
                // the decision.
                costOfTask: money(costRate * estimateHours),

                fit: { headroom, health, record, familiarity, total },

                // Said in words, because a manager should be able to disagree
                // with a specific claim rather than with a number.
                readings: [
                    capacity.weeksOfWork === null
                        ? 'No finished work in this period, so their pace is unknown'
                        : `${capacity.openHours}h queued — about ${capacity.weeksOfWork} weeks at the ${capacity.throughputPerWeek}h a week they actually clear`,
                    capacity.status === 'at_risk' ? 'Already flagged as at risk'
                        : capacity.status === 'stretched' ? 'Already stretched, though not overloaded'
                            : 'Workload is healthy',
                    `Scores ${person.score} on the delivery record${person.momentum?.direction === 'down' ? `, and output is down ${Math.abs(person.momentum.changePercent)}%` : ''}`,
                    onProject.has(person.id)
                        ? 'Has already worked on this project'
                        : 'New to this project, so allow for ramp-up'
                ]
            }
        })
        .sort((a, b) => b.fit.total - a.fit.total)

    return { candidates: rows, weeks: round(weeks, 1), estimateHours }
}

// --- Public: rebalancing an overloaded person --------------------------------

// The concrete version of "move work off them this week".
//
// For each person the performance module has flagged as carrying too much, this
// picks the specific tasks that can actually move, finds who should take each
// one, and reports what the move does to both people and to the money. A
// recommendation a manager cannot check is a recommendation they are right to
// ignore, so every figure is reported before and after.
const rebalance = async ({ now = new Date() } = {}) => {
    const [overview, context] = await Promise.all([
        performance.overview(),
        budget.loadContext()
    ])

    const weeks = Math.max(1, (new Date(overview.period.to) - new Date(overview.period.from)) / (7 * DAY))

    const strained = overview.leaderboard.filter(
        person => person.sustainability.status === 'at_risk' || person.sustainability.status === 'stretched'
    )
    const strainedIds = strained.map(person => person.id)

    // Order matters, because the first plan worked out gets first claim on
    // whatever slack the company has. Leaving that to leaderboard order means
    // the person in the worst trouble is relieved only if their name happens to
    // sort early, so the queue is worked worst-first: at risk before stretched,
    // and within each, the deepest queue first.
    const severity = { at_risk: 0, stretched: 1 }
    strained.sort((a, b) => {
        const bySeverity = (severity[a.sustainability.status] ?? 2) - (severity[b.sustainability.status] ?? 2)
        if (bySeverity !== 0) return bySeverity
        return (b.sustainability.openHours || 0) - (a.sustainability.openHours || 0)
    })

    if (strained.length === 0) {
        return { generatedAt: now, weeks: round(weeks, 1), plans: [], considered: overview.leaderboard.length }
    }

    // Every open task belonging to anyone under strain, loaded once.
    const openTasks = await Task.find({
        assignee: { $in: strained.map(p => p.id) },
        status: { $ne: 'done' }
    }).populate('objective', 'title dueDate')

    const byOwner = new Map()
    for (const task of openTasks) {
        const key = String(task.assignee)
        if (!byOwner.has(key)) byOwner.set(key, [])
        byOwner.get(key).push(task)
    }

    const plans = []

    // Hours this run has already proposed moving onto each person, so the plans
    // are worked out against one another rather than each against a fresh
    // picture of the company.
    const committed = new Map()

    for (const person of strained) {
        const theirs = byOwner.get(person.id) || []
        const capacity = capacityOf(person, weeks)

        const movable = theirs.filter(task => isMovable(task, now))
        const stuck = theirs
            .filter(task => !isMovable(task, now))
            .map(task => ({ id: String(task._id), title: task.title, reason: whyNotMovable(task, now) }))

        // Heaviest first: moving one 12-hour task helps more than moving four
        // one-hour ones, and costs one handover instead of four.
        movable.sort((a, b) => (b.estimateHours || 0) - (a.estimateHours || 0))

        // Move only as much as it takes to bring them back inside two weeks of
        // queue. Emptying somebody's plate is not the goal and would just move
        // the problem to whoever received it.
        const targetHours = capacity.throughputPerWeek > 0
            ? Math.max(0, capacity.openHours - capacity.throughputPerWeek * 2)
            : 0

        const moves = []
        const blocked = []
        let movedHours = 0
        let costDelta = 0

        const fromRate = budget.rateOn(person.id, now, context.ratesByEmployee)?.costRate || 0

        for (const task of movable) {
            if (movedHours >= targetHours) break

            const { candidates } = await candidatesFor({
                department: task.department || person.department,
                estimateHours: task.estimateHours || 0,
                objectiveId: task.objective?._id,
                excludeId: person.id,
                exclude: strainedIds,
                now,
                preloaded: { overview, context },
                committed
            })

            // No candidate is a result, not a failure to report. A two-person
            // department where both are stretched has no internal answer, and
            // saying so is more useful than proposing a swap that moves the
            // problem sideways.
            // A candidate who would end up over the ceiling is not a candidate.
            const taker = candidates.find(candidate => {
                const perWeek = candidate.capacity.throughputPerWeek
                if (!(perWeek > 0)) return false
                const after = (candidate.capacity.openHours + (task.estimateHours || 0)) / perWeek
                return after <= MAX_RECIPIENT_WEEKS
            })

            if (!taker) {
                const best = candidates[0]
                blocked.push({
                    id: String(task._id),
                    title: task.title,
                    hours: task.estimateHours || 0,
                    department: task.department || person.department,
                    reason: candidates.length === 0
                        ? 'nobody else in the department is outside the strained list'
                        : `the best remaining option is ${best.name}, already at `
                            + `${best.capacity.weeksOfWork} weeks of queue — taking this would push them past `
                            + `${MAX_RECIPIENT_WEEKS}`
                })
                continue
            }

            const hours = task.estimateHours || 0
            const delta = money((taker.costRate - fromRate) * hours)

            moves.push({
                task: {
                    id: String(task._id),
                    title: task.title,
                    priority: task.priority,
                    estimateHours: hours,
                    dueDate: task.dueDate,
                    objective: task.objective ? { id: String(task.objective._id), title: task.objective.title } : null
                },
                to: {
                    id: taker.id, name: taker.name, initials: taker.initials, color: taker.color,
                    jobTitle: taker.jobTitle, costRate: taker.costRate,
                    weeksOfWork: taker.capacity.weeksOfWork, status: taker.capacity.status,
                    onThisProject: taker.onThisProject,
                    // What is already heading their way from earlier plans on
                    // this same page.
                    alreadyPromised: taker.alreadyPromised
                },
                hours,
                costDelta: delta,
                runners: candidates.slice(1, 3).map(c => ({ id: c.id, name: c.name, total: c.fit.total })),
                reason: taker.readings[0]
            })

            committed.set(taker.id, (committed.get(taker.id) || 0) + hours)
            movedHours += hours
            costDelta += delta
        }

        const afterHours = round(capacity.openHours - movedHours, 1)
        const afterWeeks = capacity.throughputPerWeek > 0 ? round(afterHours / capacity.throughputPerWeek, 1) : null

        plans.push({
            person: {
                id: person.id, name: person.name, initials: person.initials,
                color: person.color, department: person.department, jobTitle: person.jobTitle
            },
            status: capacity.status,
            reasons: person.sustainability.reasons || [],

            before: { openHours: capacity.openHours, weeksOfWork: capacity.weeksOfWork },
            after: { openHours: afterHours, weeksOfWork: afterWeeks },

            throughputPerWeek: capacity.throughputPerWeek,
            targetHours: round(targetHours, 1),
            movedHours: round(movedHours, 1),
            // Negative is a saving: the people with capacity are often cheaper
            // than the person who is drowning, and saying so plainly stops the
            // proposal reading as a cost when it is not.
            costDelta: money(costDelta),
            moves,
            immovable: stuck,
            blocked,

            verdict: moves.length === 0
                ? (theirs.length === 0 ? 'nothing_open'
                    : blocked.length > 0 ? 'no_capacity'
                        : 'nothing_movable')
                : movedHours >= targetHours ? 'resolved' : 'partial'
        })
    }

    // Somebody flagged as stretched who is already inside two weeks of queue
    // needs nothing moved, and a plan proposing zero hours because zero were
    // required is noise on a page meant to be worked through from the top.
    const actionable = plans.filter(plan => plan.targetHours > 0)

    actionable.sort((a, b) => (b.before.weeksOfWork || 0) - (a.before.weeksOfWork || 0))

    return {
        generatedAt: now,
        weeks: round(weeks, 1),
        considered: overview.leaderboard.length,
        strained: strained.length,
        settled: plans.length - actionable.length,
        movableRule: MOVABLE,
        maxRecipientWeeks: MAX_RECIPIENT_WEEKS,
        plans: actionable
    }
}

module.exports = { rebalance, candidatesFor, capacityOf, isMovable, MOVABLE, MAX_RECIPIENT_WEEKS }
