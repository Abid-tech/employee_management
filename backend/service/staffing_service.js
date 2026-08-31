const Task = require('../model/task')
const Employee = require('../model/employee')
const performance = require('./performance_service')
const budget = require('./budget_service')

// Who should take this work, and what happens to everybody if they do.

const DAY = 24 * 60 * 60 * 1000

const round = (n, dp = 1) => {
    const f = 10 ** dp
    return Math.round((Number(n) || 0) * f) / f
}
const money = (n) => Math.round((Number(n) || 0) * 100) / 100

// A task is movable if handing it to somebody else does not throw work away.
const MOVABLE = {
    maxProgress: 0,
    excludedPriorities: ['critical'],
    // Something due inside a week cannot absorb a handover, whoever takes it.
    minDaysOfRunway: 7
}

// How much queue a receiving person is allowed to end up with.
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
const capacityOf = (person, weeks, committedHours = 0) => {
    const throughput = weeks > 0 ? person.stats.weightedHoursDone / weeks : 0

    // Hours this run has already proposed handing them counts as queue.
    const openHours = (person.sustainability.openHours || 0) + committedHours

    // Rounded once, then every derived figure is computed from the rounded values.
    const perWeek = round(throughput, 1)
    const queued = round(openHours, 1)

    return {
        throughputPerWeek: perWeek,
        openHours: queued,
        // Weeks of queue at their own demonstrated pace.
        weeksOfWork: perWeek > 0 ? round(queued / perWeek, 1) : null,
        status: person.sustainability.status
    }
}

// --- Public: who should take a piece of work ---------------------------------

// Ranked candidates for one task, each carrying the arithmetic.
const candidatesFor = async ({
    department, estimateHours = 0, objectiveId, excludeId, exclude = [], now = new Date(), preloaded,
    committed
} = {}) => {
    // The overview is the most expensive read in the application.
    const [overview, context] = preloaded
        ? [preloaded.overview, preloaded.context]
        : await Promise.all([performance.overview(), budget.loadContext()])

    const tasks = objectiveId
        ? await Task.find({ objective: objectiveId }).select('assignee')
        : []

    const weeks = Math.max(1, (new Date(overview.period.to) - new Date(overview.period.from)) / (7 * DAY))
    const barred = new Set([excludeId, ...exclude].filter(Boolean))

    // Who has already worked on this project.
    const onProject = new Set(tasks.map(t => String(t.assignee || '')).filter(Boolean))

    const rows = overview.leaderboard
        // Never propose moving work onto somebody who is themselves under strain.
        .filter(person => !barred.has(person.id))
        .filter(person => !department || person.department === department)
        .map(person => {
            const capacity = capacityOf(person, weeks, committed?.get(person.id) || 0)
            const rate = budget.rateOn(person.id, now, context.ratesByEmployee)
            const costRate = rate?.costRate || 0

            // Four readings.
            const headroom = capacity.weeksOfWork === null ? 12
                : capacity.weeksOfWork <= 1 ? 25
                    : capacity.weeksOfWork <= 2 ? 19
                        : capacity.weeksOfWork <= 3 ? 12
                            : capacity.weeksOfWork <= 4 ? 6
                                : 0

            // The performance module's own vocabulary: healthy / stretched / at_risk.
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
                // What handing them this task would cost, at the rate in force today.
                costOfTask: money(costRate * estimateHours),

                fit: { headroom, health, record, familiarity, total },

                // Said in words.
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

    // Order matters.
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

    // Hours this run has already proposed moving onto each person.
    const committed = new Map()

    for (const person of strained) {
        const theirs = byOwner.get(person.id) || []
        const capacity = capacityOf(person, weeks)

        const movable = theirs.filter(task => isMovable(task, now))
        const stuck = theirs
            .filter(task => !isMovable(task, now))
            .map(task => ({ id: String(task._id), title: task.title, reason: whyNotMovable(task, now) }))

        // Heaviest first: moving one 12-hour task helps more than moving four one-hour ones.
        movable.sort((a, b) => (b.estimateHours || 0) - (a.estimateHours || 0))

        // Move only as much as it takes to bring them back inside two weeks of queue.
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

            // No candidate is a result, not a failure to report.
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
                    // What is already heading their way from earlier plans on this same page.
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
            // Negative is a saving: the people with capacity are often cheaper than the person who is drowning.
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

    // Somebody flagged as stretched who is already inside two weeks of queue needs nothing moved.
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
