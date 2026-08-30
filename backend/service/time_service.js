const TimeEntry = require('../model/time_entry')
const Rate = require('../model/rate')
const ProjectBudget = require('../model/project_budget')
const Task = require('../model/task')
const Employee = require('../model/employee')
const budget = require('./budget_service')

// The write side of the budget module: clocking on and off, setting rates, and
// configuring a project's budget.
//
// Everything that changes money lives here so the read model in
// budget_service.js stays a pure calculation over whatever this wrote.

const DAY = 24 * 60 * 60 * 1000
const money = (n) => Math.round((Number(n) || 0) * 100) / 100
const round = (n, dp = 2) => {
    const f = 10 ** dp
    return Math.round((Number(n) || 0) * f) / f
}

// --- Keeping hours honest ----------------------------------------------------

// One source of truth for how long a task took.
//
// This was wrong and quietly so. `task.spentHours` was being incremented on
// every clock-out, while the time entries themselves were also a complete record
// of the same hours — two writers, one number, no reconciliation. Ninety-five of
// a hundred and twenty tasks had drifted apart, and because the performance
// module reads `spentHours` to score estimate accuracy, the drift was silently
// dragging down people's Quality pillar.
//
// So the ledger is authoritative and this recomputes the cached total from it.
// Recomputing rather than incrementing also makes the operation idempotent: a
// retried request, or a double-fired handler, can no longer inflate the number.
//
// Tasks with no ledger entries keep whatever they had — those hours were entered
// directly and there is nothing better to replace them with.
const recomputeSpentHours = async (taskIds) => {
    const ids = [...new Set((taskIds || []).filter(Boolean).map(String))]
    if (ids.length === 0) return 0

    const totals = await TimeEntry.aggregate([
        { $match: { task: { $in: ids.map(id => new (require('mongoose').Types.ObjectId)(id)) } } },
        { $group: { _id: '$task', hours: { $sum: '$hours' } } }
    ])

    const ops = totals.map(row => ({
        updateOne: {
            filter: { _id: row._id },
            update: { $set: { spentHours: Math.round(row.hours * 10) / 10 } }
        }
    }))

    if (ops.length) await Task.bulkWrite(ops)
    return ops.length
}

// Repair pass for data written before the ledger became authoritative.
const reconcileAll = async () => {
    const taskIds = await TimeEntry.distinct('task', { task: { $ne: null } })
    const fixed = await recomputeSpentHours(taskIds)
    return { tasksWithEntries: taskIds.length, updated: fixed }
}

// --- Clock in / out ----------------------------------------------------------

// An open shift is simply an entry with a clockIn and no clockOut. Storing it in
// the same collection rather than a separate "active shifts" table means there is
// one place a day's work can live, and no way for the two to disagree.
const openShift = (employeeId) =>
    TimeEntry.findOne({ employee: employeeId, clockIn: { $ne: null }, clockOut: null })
        .populate('task', 'title objective')
        .populate('objective', 'title')

const clockIn = async ({ employee, task, objective, note }) => {
    if (!employee) return { error: 'Choose who is clocking in.' }

    const existing = await openShift(employee)
    if (existing) return { error: 'You are already clocked in. Clock out first.' }

    // A task carries its own project, so clocking onto a task is enough to know
    // which budget the time belongs to.
    let objectiveId = objective || null
    if (task && !objectiveId) {
        const found = await Task.findById(task).select('objective')
        objectiveId = found?.objective || null
    }

    if (objectiveId) {
        const stop = await checkHardStop(objectiveId)
        if (stop) return { error: stop }
    }

    const now = new Date()
    const entry = await TimeEntry.create({
        employee,
        task: task || null,
        objective: objectiveId,
        hours: 0,
        workedOn: now,
        clockIn: now,
        source: 'clock',
        note: note || ''
    })

    return { entry: await shape(entry._id) }
}

const clockOut = async ({ employee, note }) => {
    const entry = await openShift(employee)
    if (!entry) return { error: 'There is no open shift to close.' }

    const now = new Date()
    const hours = round((now.getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60), 2)

    entry.clockOut = now
    entry.hours = Math.max(0.01, hours)
    if (note) entry.note = note
    await entry.save()

    // Recomputed from the ledger rather than incremented, so the task board and
    // the budget can never tell two different stories about the same work.
    if (entry.task) await recomputeSpentHours([entry.task])

    const fired = entry.objective ? await fireThresholds(entry.objective) : []
    return { entry: await shape(entry._id), thresholdsFired: fired }
}

// Logging time that was not clocked live — yesterday's work, remembered today.
// `workedOn` is what the rate resolves against, so back-dated entries are costed
// at the rate that was in force on the day the work happened.
const logManual = async ({ employee, task, objective, hours, workedOn, note }) => {
    if (!employee) return { error: 'Choose whose time this is.' }
    if (!(Number(hours) > 0)) return { error: 'Enter how many hours were worked.' }

    let objectiveId = objective || null
    if (task && !objectiveId) {
        const found = await Task.findById(task).select('objective')
        objectiveId = found?.objective || null
    }

    if (objectiveId) {
        const stop = await checkHardStop(objectiveId)
        if (stop) return { error: stop }
    }

    const entry = await TimeEntry.create({
        employee,
        task: task || null,
        objective: objectiveId,
        hours: Number(hours),
        workedOn: workedOn ? new Date(workedOn) : new Date(),
        source: 'manual',
        note: note || ''
    })

    if (task) await recomputeSpentHours([task])

    const fired = objectiveId ? await fireThresholds(objectiveId) : []
    return { entry: await shape(entry._id), thresholdsFired: fired }
}

const shape = async (id) => {
    const entry = await TimeEntry.findById(id)
        .populate('employee', 'name color department')
        .populate('task', 'title')
        .populate('objective', 'title')

    if (!entry) return null

    return {
        id: String(entry._id),
        employee: entry.employee ? {
            id: String(entry.employee._id), name: entry.employee.name,
            color: entry.employee.color, department: entry.employee.department
        } : null,
        task: entry.task ? { id: String(entry.task._id), title: entry.task.title } : null,
        objective: entry.objective ? { id: String(entry.objective._id), title: entry.objective.title } : null,
        hours: entry.hours,
        workedOn: entry.workedOn,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        source: entry.source,
        note: entry.note,
        billable: entry.billable
    }
}

// --- The hard stop -----------------------------------------------------------

// Refusing to accept time on a project that has hit its cap.
//
// Off by default and deliberately so: blocking somebody from recording work they
// genuinely did is a worse failure than an overrun, because it makes the ledger
// a lie. It exists for the teams whose contracts make a cap a hard limit, and it
// says exactly why it refused.
const checkHardStop = async (objectiveId) => {
    const config = await ProjectBudget.findOne({ objective: objectiveId })
    if (!config?.hardStop) return null

    const detail = await budget.projectFinancials(objectiveId)
    if (!detail) return null

    if (detail.forecast.percentUsed !== null && detail.forecast.percentUsed >= 100) {
        return `This project has reached its budget of ${budget.fmt(detail.forecast.total, detail.budget)}`
            + ` and is set to stop at the cap. Raise the budget before logging more time.`
    }
    return null
}

// --- Thresholds --------------------------------------------------------------

// Record which alert levels have now been passed, so each fires once.
const fireThresholds = async (objectiveId) => {
    const config = await ProjectBudget.findOne({ objective: objectiveId })
    if (!config) return []

    const detail = await budget.projectFinancials(objectiveId)
    if (!detail || detail.forecast.percentUsed === null) return []

    const { fresh } = budget.evaluateAlerts(config, detail.forecast.percentUsed)
    if (fresh.length === 0) return []

    config.firedThresholds = [...new Set([...(config.firedThresholds || []), ...fresh])]
    await config.save()

    // Told to the people on the project, not left sitting in a dashboard.
    //
    // This block used to require the mail service and then throw the reference
    // away, so the comment above was a promise the code did not keep: a
    // threshold painted a percentage red and nobody who could act on it was ever
    // told. It now sends — through the same outbox the task module uses, so it
    // demonstrates without SMTP credentials — to whoever has actually logged
    // time on the project, since they are the people spending the budget.
    //
    // A mail failure must never undo the threshold: the crossing is recorded
    // first and saved above, so a dead mail server costs a notification, not
    // the record of what happened.
    try {
        const mail = require('./mail_service')
        const team = await Employee.find({
            _id: { $in: detail.byPerson.map(person => person.id) },
            email: { $nin: [null, ''] }
        }).select('name email')

        // One message for the highest level crossed, not one per level. A single
        // entry can take a project from 45% straight past 50, 75, 90 and 100 —
        // four emails saying the same thing five minutes apart is how a useful
        // alert becomes a mail rule. All four are still recorded as fired, so
        // none of them can fire again later.
        const highest = Math.max(...fresh)

        await mail.notifyBudgetThreshold(detail.objective, {
            threshold: highest,
            forecast: detail.forecast,
            currency: detail.budget?.currency || 'USD',
            recipients: team.map(person => ({ id: person._id, name: person.name, email: person.email }))
        })
        console.log(`[budget] ${detail.objective.title} crossed ${fresh.join('%, ')}% — ${team.length} notified at ${highest}%`)
    } catch (error) {
        console.error(`[budget] threshold recorded, notification failed: ${error.message}`)
    }

    return fresh
}

// --- Rates -------------------------------------------------------------------

// A new rate never edits an old one. It is a new row with its own start date, so
// the history stays intact and last quarter's numbers do not move.
const setRate = async ({ employee, costRate, billRate, effectiveFrom, reason, currency }, actor) => {
    if (!employee) return { error: 'Choose whose rate this is.' }
    if (!(Number(costRate) >= 0) || !(Number(billRate) >= 0)) {
        return { error: 'Both a cost rate and a bill rate are needed.' }
    }

    const rate = await Rate.create({
        employee,
        costRate: Number(costRate),
        billRate: Number(billRate),
        currency: currency || 'USD',
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        reason: reason || '',
        createdByName: actor?.name || ''
    })

    await rate.populate('employee', 'name color department jobTitle')
    return { rate: shapeRateDoc(rate) }
}

// Shaping a rate document that is already in hand.
//
// This used to be `shapeRate(id)`, which re-read the document it had just been
// handed — so listing rates fetched every row, then fetched every row again one
// at a time to shape it. Fourteen rates meant fifteen round trips to Atlas for
// data already in memory. The pure function does the same job with none.
const shapeRateDoc = (rate) => {
    if (!rate) return null

    return {
        id: String(rate._id),
        employee: rate.employee ? {
            id: String(rate.employee._id), name: rate.employee.name,
            color: rate.employee.color, department: rate.employee.department, jobTitle: rate.employee.jobTitle
        } : null,
        costRate: rate.costRate,
        billRate: rate.billRate,
        margin: money(rate.billRate - rate.costRate),
        marginPercent: rate.billRate > 0 ? round(((rate.billRate - rate.costRate) / rate.billRate) * 100, 1) : null,
        currency: rate.currency,
        effectiveFrom: rate.effectiveFrom,
        reason: rate.reason,
        createdByName: rate.createdByName
    }
}

const listRates = async () => {
    const rates = await Rate.find()
        .populate('employee', 'name color department jobTitle')
        .sort({ effectiveFrom: -1 })

    const shaped = rates.map(shapeRateDoc)
    const now = Date.now()

    // Grouped per person, newest first, with the one currently in force marked —
    // the whole point of effective dating is being able to see the timeline.
    const byPerson = new Map()
    for (const rate of shaped.filter(Boolean)) {
        const key = rate.employee?.id
        if (!key) continue
        if (!byPerson.has(key)) byPerson.set(key, { employee: rate.employee, history: [] })
        byPerson.get(key).history.push(rate)
    }

    return [...byPerson.values()].map(person => {
        const current = person.history.find(r => new Date(r.effectiveFrom).getTime() <= now) || null
        const scheduled = person.history.filter(r => new Date(r.effectiveFrom).getTime() > now)
        return { ...person, current, scheduled }
    }).sort((a, b) => a.employee.name.localeCompare(b.employee.name))
}

// --- Budget configuration ----------------------------------------------------

const setBudget = async ({ objective, totalBudget, currency, thresholds, hardStop, projectCostRate, projectBillRate, note }) => {
    if (!objective) return { error: 'Choose which project this budget is for.' }
    if (!(Number(totalBudget) > 0)) return { error: 'Enter a budget above zero.' }

    const config = await ProjectBudget.findOne({ objective }) || new ProjectBudget({ objective })

    // Raising the budget re-arms any threshold the project has dropped back
    // under, so a project that is topped up starts warning again on the way up.
    const previous = config.totalBudget || 0
    config.totalBudget = Number(totalBudget)
    if (Number(totalBudget) > previous) {
        const detail = await budget.projectFinancials(objective)
        const used = detail?.forecast?.percentUsed ?? 0
        config.firedThresholds = (config.firedThresholds || []).filter(t => used >= t)
    }

    if (currency) config.currency = currency
    if (Array.isArray(thresholds) && thresholds.length) {
        config.thresholds = [...new Set(thresholds.map(Number).filter(n => n > 0))].sort((a, b) => a - b)
    }
    if (hardStop !== undefined) config.hardStop = Boolean(hardStop)
    if (projectCostRate !== undefined) config.projectCostRate = projectCostRate === null || projectCostRate === '' ? null : Number(projectCostRate)
    if (projectBillRate !== undefined) config.projectBillRate = projectBillRate === null || projectBillRate === '' ? null : Number(projectBillRate)
    if (note !== undefined) config.note = note

    await config.save()
    return { budget: config }
}

module.exports = {
    clockIn, clockOut, logManual, openShift, shape,
    recomputeSpentHours, reconcileAll,
    setRate, listRates, shapeRateDoc,
    setBudget, checkHardStop, fireThresholds
}
