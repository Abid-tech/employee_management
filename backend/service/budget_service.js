const Rate = require('../model/rate')
const TimeEntry = require('../model/time_entry')
const ProjectBudget = require('../model/project_budget')
const Objective = require('../model/objective')
const Task = require('../model/task')
const Employee = require('../model/employee')

// Project money: what has been spent, what it is trending to, and why.

const DAY = 24 * 60 * 60 * 1000

// Recent means recent.
const WINDOW_DAYS = 14

const round = (n, dp = 2) => {
    const f = 10 ** dp
    return Math.round((Number(n) || 0) * f) / f
}
const money = (n) => Math.round((Number(n) || 0) * 100) / 100
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0)
const stdev = (list) => {
    if (list.length < 2) return 0
    const m = mean(list)
    return Math.sqrt(mean(list.map(v => (v - m) ** 2)))
}
const idOf = (v) => (v ? String(v._id || v) : null)
const dayKey = (date) => new Date(date).toISOString().slice(0, 10)

// --- Rates -------------------------------------------------------------------

// The rate in force for a person on a given day.
const rateOn = (employeeId, date, ratesByEmployee) => {
    const history = ratesByEmployee.get(String(employeeId)) || []
    const when = new Date(date).getTime()

    for (const rate of history) {
        if (new Date(rate.effectiveFrom).getTime() <= when) return rate
    }
    return null
}

// Entry override beats project rate beats the person's own rate.
const resolveRates = (entry, budget, ratesByEmployee) => {
    const base = rateOn(entry.employee, entry.workedOn, ratesByEmployee)

    const cost = entry.costRateOverride ?? budget?.projectCostRate ?? base?.costRate ?? 0
    const bill = entry.billRateOverride ?? budget?.projectBillRate ?? base?.billRate ?? 0

    const source = entry.costRateOverride != null ? 'entry'
        : budget?.projectCostRate != null ? 'project'
            : base ? 'employee'
                : 'none'

    return { cost, bill, source }
}

const priceEntry = (entry, budget, ratesByEmployee) => {
    const { cost, bill, source } = resolveRates(entry, budget, ratesByEmployee)
    return {
        hours: entry.hours,
        cost: money(entry.hours * cost),
        billed: money(entry.billable ? entry.hours * bill : 0),
        costRate: cost,
        billRate: bill,
        rateSource: source
    }
}

// --- The forecast ------------------------------------------------------------

// Where this is heading, and how sure we are.
const buildForecast = ({ priced, remainingHours, budget, now = new Date() }) => {
    const spent = money(priced.reduce((sum, p) => sum + p.cost, 0))
    const total = budget?.totalBudget || 0

    const windowStart = now.getTime() - WINDOW_DAYS * DAY
    const recent = priced.filter(p => new Date(p.workedOn).getTime() >= windowStart)

    const recentHours = recent.reduce((sum, p) => sum + p.hours, 0)
    const recentCost = money(recent.reduce((sum, p) => sum + p.cost, 0))

    // Every calendar day in the window, including the empty ones.
    const byDay = new Map()
    for (let i = 0; i < WINDOW_DAYS; i += 1) {
        byDay.set(dayKey(new Date(now.getTime() - i * DAY)), 0)
    }
    for (const p of recent) {
        const key = dayKey(p.workedOn)
        if (byDay.has(key)) byDay.set(key, byDay.get(key) + p.cost)
    }
    const daily = [...byDay.values()]

    const burnPerDay = money(mean(daily))
    const burnSd = money(stdev(daily))
    const hoursPerDay = round(recentHours / WINDOW_DAYS, 2)

    // The rate the project is actually running at lately, blended across whoever has been on it.
    const lifetimeHours = priced.reduce((sum, p) => sum + p.hours, 0)
    const recentBlend = recentHours > 0
        ? recentCost / recentHours
        : (lifetimeHours > 0 ? spent / lifetimeHours : 0)

    const remainingCost = money(remainingHours * recentBlend)
    const projected = money(spent + remainingCost)

    // Coefficient of variation of the daily burn.
    const cv = burnPerDay > 0 ? burnSd / burnPerDay : 0.25
    const spread = Math.min(0.42, Math.max(0.08, cv * 0.6))

    const low = money(spent + remainingCost * (1 - spread))
    const high = money(spent + remainingCost * (1 + spread))

    const daysToFinish = hoursPerDay > 0 ? Math.ceil(remainingHours / hoursPerDay) : null
    const etaDate = daysToFinish ? new Date(now.getTime() + daysToFinish * DAY) : null

    // Confidence is about evidence, not about the answer being comforting.
    const activeDays = daily.filter(v => v > 0).length
    const confidence = activeDays >= 6 && cv < 0.9 ? 'good'
        : activeDays >= 3 ? 'fair'
            : 'thin'

    return {
        spent,
        total,
        percentUsed: total > 0 ? round((spent / total) * 100, 1) : null,
        remaining: money(total - spent),
        remainingHours: round(remainingHours, 1),

        projected,
        low,
        high,
        overBy: total > 0 ? money(projected - total) : null,
        willOverrun: total > 0 && projected > total,
        // Even a central estimate inside budget is worth flagging when the top of the range is not.
        couldOverrun: total > 0 && high > total && projected <= total,

        burnPerDay,
        burnSd,
        hoursPerDay,
        recentBlendedRate: money(recentBlend),
        windowDays: WINDOW_DAYS,
        activeDaysInWindow: activeDays,
        confidence,
        spreadPercent: round(spread * 100, 1),

        daysToFinish,
        etaDate
    }
}

// --- Narration ---------------------------------------------------------------

// The part nobody else does: saying what changed, without being asked.
const narrate = ({ priced, forecast, budget, people, now = new Date() }) => {
    const notes = []
    const cut = now.getTime() - 7 * DAY
    const prevCut = now.getTime() - 14 * DAY

    const lastWeek = priced.filter(p => new Date(p.workedOn).getTime() >= cut)
    const weekBefore = priced.filter(p => {
        const t = new Date(p.workedOn).getTime()
        return t >= prevCut && t < cut
    })

    const lastCost = money(lastWeek.reduce((s, p) => s + p.cost, 0))
    const prevCost = money(weekBefore.reduce((s, p) => s + p.cost, 0))

    // 1. A change of pace, before it becomes an overrun.
    if (prevCost > 0 && lastCost > prevCost * 1.5) {
        notes.push({
            tone: 'warn',
            headline: `Spending accelerated ${Math.round(((lastCost - prevCost) / prevCost) * 100)}% last week`,
            detail: `${fmt(lastCost, budget)} in the last seven days against ${fmt(prevCost, budget)} the week before. `
                + `The forecast below is built on the recent pace, not the calmer average before it.`
        })
    } else if (prevCost > 0 && lastCost < prevCost * 0.5 && lastCost >= 0) {
        notes.push({
            tone: 'info',
            headline: 'Work on this has slowed sharply',
            detail: `${fmt(lastCost, budget)} last week against ${fmt(prevCost, budget)} the week before. `
                + `Either it is nearly finished, or it has quietly stalled — the completion estimate assumes the recent pace continues.`
        })
    }

    // 2. Key-person concentration, which is a delivery risk the bar cannot show.
    const byPerson = new Map()
    for (const p of lastWeek) {
        const key = String(p.employeeId)
        byPerson.set(key, (byPerson.get(key) || 0) + p.cost)
    }
    const topPerson = [...byPerson.entries()].sort((a, b) => b[1] - a[1])[0]
    if (topPerson && lastCost > 0 && topPerson[1] / lastCost >= 0.7 && byPerson.size > 1) {
        const name = people.get(topPerson[0])?.name || 'One person'
        notes.push({
            tone: 'info',
            headline: `${name} accounted for ${Math.round((topPerson[1] / lastCost) * 100)}% of last week's cost`,
            detail: 'Concentrated effort is not automatically a problem, but it is a single point of failure and it makes the forecast sensitive to one person\'s availability.'
        })
    }

    // 3. The forecast itself, stated plainly.
    if (forecast.willOverrun) {
        notes.push({
            tone: 'bad',
            headline: `Trending to finish ${fmt(forecast.overBy, budget)} over budget`,
            detail: `At the last ${WINDOW_DAYS} days' pace — ${fmt(forecast.burnPerDay, budget)} a day — the remaining `
                + `${forecast.remainingHours}h lands this at ${fmt(forecast.projected, budget)} against a budget of ${fmt(forecast.total, budget)}.`
        })
    } else if (forecast.couldOverrun) {
        notes.push({
            tone: 'warn',
            headline: 'Central estimate is inside budget, but the top of the range is not',
            detail: `Trending to ${fmt(forecast.projected, budget)}, with an upper bound of ${fmt(forecast.high, budget)} `
                + `against ${fmt(forecast.total, budget)}. Burn has been variable enough that the overrun case is live.`
        })
    }

    // 4.
    const overridden = priced.filter(p => p.rateSource === 'entry')
    if (overridden.length > 0) {
        const value = money(overridden.reduce((s, p) => s + p.cost, 0))
        notes.push({
            tone: 'info',
            headline: `${overridden.length} ${overridden.length === 1 ? 'entry was' : 'entries were'} logged at a non-standard rate`,
            detail: `${fmt(value, budget)} of the spend used a rate agreed on the entry rather than the person's usual one.`
        })
    }

    // 5. Weekend burn — a cost signal and a wellbeing one at the same time.
    const weekend = lastWeek.filter(p => [0, 6].includes(new Date(p.workedOn).getDay()))
    if (weekend.length > 0 && lastCost > 0) {
        const share = (weekend.reduce((s, p) => s + p.cost, 0) / lastCost) * 100
        if (share >= 20) {
            notes.push({
                tone: 'warn',
                headline: `${Math.round(share)}% of last week's hours were worked at a weekend`,
                detail: 'Weekend hours cost the same as weekday hours and usually mean the plan is not holding. Worth checking before it becomes an overrun and a resignation.'
            })
        }
    }

    if (notes.length === 0) {
        notes.push({
            tone: 'good',
            headline: 'Nothing unusual in the last fortnight',
            detail: `Burn is steady at ${fmt(forecast.burnPerDay, budget)} a day and the forecast sits inside budget.`
        })
    }

    return notes
}

const fmt = (value, budget) => {
    const currency = budget?.currency || 'USD'
    const symbol = { USD: '$', GBP: '£', EUR: '€', BDT: '৳' }[currency] || ''
    const n = Math.abs(Number(value) || 0)
    const text = n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toFixed(0)
    return `${value < 0 ? '−' : ''}${symbol}${text}`
}

// --- Alerts ------------------------------------------------------------------

// Which thresholds this project has crossed, and which are newly crossed.
const evaluateAlerts = (budget, percentUsed) => {
    if (!budget || percentUsed === null) return { crossed: [], fresh: [] }

    const crossed = (budget.thresholds || []).filter(t => percentUsed >= t).sort((a, b) => a - b)
    const fresh = crossed.filter(t => !(budget.firedThresholds || []).includes(t))

    return { crossed, fresh }
}

// --- Public reads ------------------------------------------------------------

const loadRates = async () => {
    const rates = await Rate.find().sort({ effectiveFrom: -1 })
    const byEmployee = new Map()

    for (const rate of rates) {
        const key = String(rate.employee)
        if (!byEmployee.has(key)) byEmployee.set(key, [])
        byEmployee.get(key).push(rate)
    }
    return byEmployee
}

// The shared context every project calculation needs.
const loadContext = async () => {
    const [employees, ratesByEmployee] = await Promise.all([
        Employee.find().select('name department color jobTitle'),
        loadRates()
    ])
    return { people: new Map(employees.map(e => [String(e._id), e])), ratesByEmployee }
}

const projectFinancials = async (objectiveId, { now = new Date(), context, full = false } = {}) => {
    const objective = await Objective.findById(objectiveId)
    if (!objective) return null

    const shared = context || await loadContext()

    const [budget, entries, tasks] = await Promise.all([
        ProjectBudget.findOne({ objective: objectiveId }),
        TimeEntry.find({ objective: objectiveId }).sort({ workedOn: 1 }),
        Task.find({ objective: objectiveId })
    ])

    const { people, ratesByEmployee } = shared

    // The tasks are already loaded for the outstanding-work figure.
    const taskTitles = new Map(tasks.map(t => [String(t._id), t.title]))

    const priced = entries.map(entry => ({
        id: String(entry._id),
        employeeId: String(entry.employee),
        employeeName: people.get(String(entry.employee))?.name || 'Unknown',
        employeeDepartment: people.get(String(entry.employee))?.department || '',
        employeeJobTitle: people.get(String(entry.employee))?.jobTitle || '',
        color: people.get(String(entry.employee))?.color || '#0A2947',
        taskId: idOf(entry.task),
        taskTitle: taskTitles.get(idOf(entry.task)) || '',
        workedOn: entry.workedOn,
        note: entry.note,
        billable: entry.billable,
        ...priceEntry(entry, budget, ratesByEmployee)
    }))

    // Work still outstanding, from the task board rather than from a guess.
    const remainingHours = tasks
        .filter(t => t.status !== 'done')
        .reduce((sum, t) => {
            const progress = t.progressPercent ? t.progressPercent() : 0
            return sum + (t.estimateHours || 0) * (1 - progress / 100)
        }, 0)

    const forecast = buildForecast({ priced, remainingHours, budget, now })
    const alerts = evaluateAlerts(budget, forecast.percentUsed)

    const billed = money(priced.reduce((sum, p) => sum + p.billed, 0))
    const margin = money(billed - forecast.spent)

    // Who the money went on.
    const projectCost = priced.reduce((s, p) => s + p.cost, 0)
    const projectHours = priced.reduce((s, p) => s + p.hours, 0)

    const byPerson = [...new Map(priced.map(p => [p.employeeId, p])).keys()].map(id => {
        const mine = priced.filter(p => p.employeeId === id)
        const hours = mine.reduce((s, p) => s + p.hours, 0)
        const cost = mine.reduce((s, p) => s + p.cost, 0)
        const billedHere = mine.reduce((s, p) => s + p.billed, 0)
        const billableHours = mine.filter(p => p.billable).reduce((s, p) => s + p.hours, 0)
        const days = [...new Set(mine.map(p => dayKey(p.workedOn)))].sort()

        // What they actually spent the hours on, largest first.
        const byTask = new Map()
        for (const p of mine) {
            const key = p.taskTitle || 'Not attached to a task'
            const row = byTask.get(key) || { title: key, hours: 0, cost: 0 }
            row.hours += p.hours
            row.cost += p.cost
            byTask.set(key, row)
        }

        return {
            id,
            name: mine[0].employeeName,
            color: mine[0].color,
            department: mine[0].employeeDepartment,
            jobTitle: mine[0].employeeJobTitle,
            hours: round(hours, 1),
            cost: money(cost),
            billed: money(billedHere),
            margin: money(billedHere - cost),
            marginPercent: billedHere > 0 ? round(((billedHere - cost) / billedHere) * 100, 1) : null,
            entries: mine.length,
            // The rate they actually ran at here.
            blendedCostRate: hours > 0 ? round(cost / hours, 2) : 0,
            billableHours: round(billableHours, 1),
            nonBillableHours: round(hours - billableHours, 1),
            shareOfCost: projectCost > 0 ? round((cost / projectCost) * 100, 1) : 0,
            shareOfHours: projectHours > 0 ? round((hours / projectHours) * 100, 1) : 0,
            firstWorkedOn: days[0] || null,
            lastWorkedOn: days[days.length - 1] || null,
            daysWorked: days.length,
            topTasks: [...byTask.values()]
                .sort((a, b) => b.cost - a.cost)
                .slice(0, 3)
                .map(t => ({ title: t.title, hours: round(t.hours, 1), cost: money(t.cost) }))
        }
    }).sort((a, b) => b.cost - a.cost)

    // A daily series for the burn chart, cumulative against budget.
    const series = []
    let running = 0
    const grouped = new Map()
    for (const p of priced) {
        const key = dayKey(p.workedOn)
        grouped.set(key, (grouped.get(key) || 0) + p.cost)
    }
    for (const [date, cost] of [...grouped.entries()].sort()) {
        running = money(running + cost)
        series.push({ date, cost: money(cost), cumulative: running })
    }

    return {
        objective: {
            id: String(objective._id),
            title: objective.title,
            status: objective.status,
            dueDate: objective.dueDate || null,
            client: objective.client || ''
        },
        budget: budget ? {
            id: String(budget._id),
            totalBudget: budget.totalBudget,
            currency: budget.currency,
            thresholds: budget.thresholds,
            firedThresholds: budget.firedThresholds,
            hardStop: budget.hardStop,
            projectCostRate: budget.projectCostRate,
            projectBillRate: budget.projectBillRate,
            note: budget.note
        } : null,
        forecast,
        alerts,
        billed,
        margin,
        marginPercent: billed > 0 ? round((margin / billed) * 100, 1) : null,
        entryCount: priced.length,
        totalHours: round(priced.reduce((s, p) => s + p.hours, 0), 1),
        byPerson,
        series,

        // The page only ever shows the most recent few, so the rest would be payload nobody reads.
        entries: priced.slice(-40).reverse(),
        allEntries: full ? priced : undefined,

        // The caller that asks for the full ledger is always the advisor.
        tasks: full ? tasks : undefined,
        narration: narrate({ priced, forecast, budget, people, now })
    }
}

// Every project with a budget, for the portfolio view.
const portfolio = async ({ now = new Date() } = {}) => {
    const [budgets, context] = await Promise.all([
        ProjectBudget.find().populate('objective', 'title status dueDate client'),
        // Loaded once for the whole portfolio rather than once per project.
        loadContext()
    ])

    // Run the projects together rather than one after another.
    const details = await Promise.all(
        budgets
            .filter(b => b.objective)
            .map(b => projectFinancials(b.objective._id, { now, context }))
    )

    const rows = []
    for (const detail of details) {
        if (!detail) continue

        rows.push({
            objective: detail.objective,
            budget: detail.budget,
            forecast: detail.forecast,
            // Carried so the portfolio's headline figures can be broken back down per project without.
            billed: detail.billed,
            margin: detail.margin,
            marginPercent: detail.marginPercent,
            totalHours: detail.totalHours,
            entryCount: detail.entryCount,
            alerts: detail.alerts,
            topNote: detail.narration[0] || null
        })
    }

    // Worst first: a portfolio view exists to surface the project in trouble.
    rows.sort((a, b) => (b.forecast.overBy ?? -Infinity) - (a.forecast.overBy ?? -Infinity))

    const totals = rows.reduce((acc, row) => ({
        budget: acc.budget + (row.budget?.totalBudget || 0),
        spent: acc.spent + row.forecast.spent,
        projected: acc.projected + row.forecast.projected,
        margin: acc.margin + row.margin
    }), { budget: 0, spent: 0, projected: 0, margin: 0 })

    return {
        rows,
        totals: {
            budget: money(totals.budget),
            spent: money(totals.spent),
            projected: money(totals.projected),
            margin: money(totals.margin),
            atRisk: rows.filter(r => r.forecast.willOverrun).length,
            watch: rows.filter(r => r.forecast.couldOverrun).length
        },
        windowDays: WINDOW_DAYS
    }
}

// --- What a deadline change costs --------------------------------------------

// The question no time-tracking tool can answer and no task tool can either.
const deadlineImpact = async (task, newDueDate, { now = new Date() } = {}) => {
    const previous = task.dueDate ? new Date(task.dueDate) : null
    const next = new Date(newDueDate)

    const daysAdded = previous
        ? Math.round((next.getTime() - previous.getTime()) / DAY)
        : null

    const history = task.deadlineChanges || []
    const previouslyMovedDays = history.reduce((sum, change) => {
        if (!change.from || !change.to) return sum
        return sum + Math.round((new Date(change.to).getTime() - new Date(change.from).getTime()) / DAY)
    }, 0)

    const base = {
        taskTitle: task.title,
        from: previous,
        to: next,
        daysAdded,
        timesMovedBefore: history.length,
        previouslyMovedDays,
        hasBudget: false
    }

    if (!task.objective) return base

    const detail = await projectFinancials(task.objective._id || task.objective, { now })
    if (!detail?.budget) return { ...base, project: detail?.objective || null }

    const f = detail.forecast
    const currency = detail.budget.currency

    // Days of burn the project is exposed to by staying open longer.
    const extraDays = daysAdded && daysAdded > 0 ? daysAdded : 0
    const exposure = money(extraDays * f.burnPerDay)

    const projectedAfter = money(f.projected + exposure)
    const percentBefore = f.percentUsed
    const percentAfter = f.total > 0 ? round((projectedAfter / f.total) * 100, 1) : null

    // The finding a manager actually needs: does this decision change the answer.
    const tipsIntoOverrun = f.total > 0 && f.projected <= f.total && projectedAfter > f.total

    return {
        ...base,
        hasBudget: true,
        currency,
        project: detail.objective,
        burnPerDay: f.burnPerDay,
        totalBudget: f.total,
        spent: f.spent,
        projectedBefore: f.projected,
        projectedAfter,
        exposure,
        percentBefore,
        percentAfter,
        tipsIntoOverrun,
        alreadyOverrunning: f.willOverrun,
        confidence: f.confidence,
        windowDays: WINDOW_DAYS,

        // Everything else on this project that is already late.
        otherLate: (await Task.find({
            objective: task.objective._id || task.objective,
            status: { $ne: 'done' },
            dueDate: { $lt: now },
            _id: { $ne: task._id }
        }).select('title dueDate')).slice(0, 5).map(t => ({
            id: String(t._id), title: t.title, dueDate: t.dueDate
        }))
    }
}

module.exports = {
    projectFinancials, portfolio, loadRates, loadContext, rateOn, resolveRates,
    deadlineImpact,
    buildForecast, evaluateAlerts, narrate, fmt,
    WINDOW_DAYS
}
