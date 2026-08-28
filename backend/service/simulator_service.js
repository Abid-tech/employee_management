const Task = require('../model/task')
const TimeEntry = require('../model/time_entry')
const Employee = require('../model/employee')
const Objective = require('../model/objective')
const LeaveManagement = require('../model/leave_management')
const budget = require('./budget_service')

// Decision simulation: the consequence of a choice, before it is made.
//
// Every one of these questions needs two things that normally live in different
// products. What a delivery date is worth needs the dates AND the rates. Whether
// adding somebody helps needs the schedule AND the cost. Whether leave is safe
// to approve needs the HR request AND the project it quietly belongs to.
//
// Specialist tools each hold one half, so in practice nobody answers these at
// all — the decision gets made on instinct and the consequence turns up weeks
// later on a report. This app holds both halves, so it can answer them at the
// moment somebody is deciding.
//
// Every simulation states its assumptions on the record. A prediction whose
// working is hidden is one a manager is right to ignore.

const DAY = 24 * 60 * 60 * 1000

const round = (n, dp = 2) => {
    const f = 10 ** dp
    return Math.round((Number(n) || 0) * f) / f
}
const money = (n) => Math.round((Number(n) || 0) * 100) / 100

// Working days between two dates, weekends excluded. Leave taken over a weekend
// costs a project nothing, and counting it would overstate every impact.
const workingDaysBetween = (from, to) => {
    let days = 0
    const cursor = new Date(from)
    cursor.setHours(0, 0, 0, 0)
    const end = new Date(to)
    end.setHours(0, 0, 0, 0)

    while (cursor <= end) {
        const day = cursor.getDay()
        if (day !== 0 && day !== 6) days += 1
        cursor.setTime(cursor.getTime() + DAY)
    }
    return days
}

const addWorkingDays = (from, count) => {
    const cursor = new Date(from)
    let left = Math.ceil(count)
    while (left > 0) {
        cursor.setTime(cursor.getTime() + DAY)
        const day = cursor.getDay()
        if (day !== 0 && day !== 6) left -= 1
    }
    return cursor
}

// --- 1. Quoting a delivery date ----------------------------------------------

// What promising a date is actually worth.
//
// A sales conversation asks "can we have it by the 30th?" and the honest answer
// depends on three things nobody has in one place: how much work is left, how
// fast the team is really going, and what the work costs against what it bills.
// Promising a date that needs the team to compress does not just risk the date —
// it burns margin, because compression is overtime or extra people, and neither
// is free.
const quoteDate = async (objectiveId, promisedDate, { now = new Date(), context } = {}) => {
    const detail = await budget.projectFinancials(objectiveId, { now, context, full: true })
    if (!detail) return null

    const f = detail.forecast
    const currency = detail.budget?.currency || 'USD'
    const promised = new Date(promisedDate)

    const naturalFinish = f.daysToFinish ? addWorkingDays(now, f.daysToFinish) : null
    const daysAvailable = workingDaysBetween(now, promised)
    const daysNeeded = f.daysToFinish ?? null

    // How much the team would have to speed up to make the date.
    const compression = daysNeeded && daysAvailable > 0 ? daysNeeded / daysAvailable : null

    const ledger = detail.allEntries || detail.entries
    const hours = ledger.reduce((sum, e) => sum + e.hours, 0)
    const blendedBill = hours > 0 ? ledger.reduce((sum, e) => sum + e.billed, 0) / hours : 0

    // The straightforward case: cost and value of finishing the outstanding work.
    const remainingCost = money(f.remainingHours * f.recentBlendedRate)
    const remainingValue = money(f.remainingHours * blendedBill)

    const costAtDelivery = money(f.spent + remainingCost)
    const valueAtDelivery = money(detail.billed + remainingValue)

    // Compression is not free. Beyond about 1.15× the sustainable pace it is
    // bought with overtime or extra hands, and the usual industry rule of thumb
    // is that the marginal hour costs meaningfully more than the average one.
    // A 25% premium on the compressed portion is deliberately conservative and
    // is stated rather than buried.
    const overtimePremium = 0.25
    const compressionCost = compression && compression > 1.15
        ? money(remainingCost * (compression - 1) * overtimePremium)
        : 0

    const totalCost = money(costAtDelivery + compressionCost)
    const margin = money(valueAtDelivery - totalCost)
    const marginPercent = valueAtDelivery > 0 ? round((margin / valueAtDelivery) * 100, 1) : null

    // The date that would land a healthier margin, by removing the compression.
    const comfortableDate = naturalFinish

    let verdict = 'achievable'
    if (!daysNeeded) verdict = 'unknown'
    else if (compression > 1.6) verdict = 'unrealistic'
    else if (compression > 1.15) verdict = 'compressed'

    return {
        project: detail.objective,
        currency,
        promised,
        naturalFinish,
        comfortableDate,
        daysAvailable,
        daysNeeded,
        compression: compression === null ? null : round(compression, 2),
        verdict,

        remainingHours: f.remainingHours,
        hoursPerDay: f.hoursPerDay,
        costRate: f.recentBlendedRate,
        billRate: money(blendedBill),

        spent: f.spent,
        billedSoFar: detail.billed,
        costAtDelivery,
        compressionCost,
        totalCost,
        valueAtDelivery,
        margin,
        marginPercent,
        overtimePremium,

        budgetTotal: f.total,
        overBudget: f.total > 0 && totalCost > f.total,

        assumptions: [
            `The team continues at ${f.hoursPerDay}h a day, its pace over the last ${f.windowDays} days.`,
            `Outstanding work is priced at ${money(f.recentBlendedRate)}/hour cost and ${money(blendedBill)}/hour billed, the blended rates this project has actually run at.`,
            compressionCost > 0
                ? `Compressing to hit the date is charged a ${Math.round(overtimePremium * 100)}% premium on the affected work — overtime or extra hands are not free.`
                : 'No compression premium applied: the date is inside the team\'s current pace.',
            'Weekends are excluded from every day count.'
        ]
    }
}

// --- 2. Adding somebody to a late project ------------------------------------

// Brooks's Law, made arithmetic.
//
// "Adding people to a late software project makes it later" is the most quoted
// line in project management and the least often calculated. The two costs are
// real and both are usually ignored: the new person is not productive
// immediately, and the people who were productive lose time bringing them up to
// speed.
//
// This does not refuse to add anyone. It prices the decision honestly and quite
// often the answer is "yes, but it costs more than it saves" — which is exactly
// the answer a manager deserves before committing, not afterwards.
const addPerson = async (objectiveId, employeeId, { now = new Date(), context, horizonDays = 30 } = {}) => {
    const [detail, person] = await Promise.all([
        budget.projectFinancials(objectiveId, { now, context, full: true }),
        Employee.findById(employeeId).select('name department jobTitle color')
    ])
    if (!detail || !person) return null

    const shared = context || await budget.loadContext()
    const rate = budget.rateOn(employeeId, now, shared.ratesByEmployee)
    const costRate = rate?.costRate || 0

    const f = detail.forecast
    const currency = detail.budget?.currency || 'USD'

    // Ramp-up. A new joiner on an existing codebase or client contributes little
    // in week one, roughly half in week two, and full pace after that. These are
    // conventional planning figures, and they are shown so they can be argued
    // with rather than trusted blindly.
    const RAMP = [0.15, 0.5, 0.85, 1]
    const MENTOR_DRAG = 0.2      // share of an existing person's time spent onboarding
    const MENTOR_WEEKS = 2

    const dailyHours = 6         // productive hours in a working day
    const weeks = Math.ceil(horizonDays / 7)

    let addedHours = 0
    let lostHours = 0

    for (let week = 0; week < weeks; week += 1) {
        const workingDays = Math.min(5, Math.max(0, horizonDays - week * 7))
        const efficiency = RAMP[Math.min(week, RAMP.length - 1)]
        addedHours += workingDays * dailyHours * efficiency
        if (week < MENTOR_WEEKS) lostHours += workingDays * dailyHours * MENTOR_DRAG
    }

    const netHours = round(addedHours - lostHours, 1)

    // The project's pace before and after.
    const currentPerDay = f.hoursPerDay
    const netPerDay = round(netHours / Math.max(1, horizonDays), 2)
    const newPerDay = round(currentPerDay + netPerDay, 2)

    const daysBefore = currentPerDay > 0 ? Math.ceil(f.remainingHours / currentPerDay) : null
    const daysAfter = newPerDay > 0 ? Math.ceil(f.remainingHours / newPerDay) : null
    const daysSaved = daysBefore !== null && daysAfter !== null ? daysBefore - daysAfter : null

    // Cost: the new person's hours, plus the mentoring time taken from people
    // already on the project, priced at the project's blended rate.
    const newPersonCost = money(addedHours * costRate)
    const mentoringCost = money(lostHours * f.recentBlendedRate)
    const extraCost = money(newPersonCost + mentoringCost)

    // Would the same money have been spent anyway? The work is finite, so the
    // honest comparison is the *additional* cost, not the whole wage.
    const displacedCost = money(netHours * f.recentBlendedRate)
    const netExtraCost = money(extraCost - displacedCost)

    let verdict = 'helps'
    if (daysSaved === null) verdict = 'unknown'
    else if (daysSaved <= 0) verdict = 'makes_it_later'
    else if (netExtraCost > 0 && daysSaved <= 2) verdict = 'marginal'

    return {
        project: detail.objective,
        person: {
            id: String(person._id), name: person.name,
            jobTitle: person.jobTitle, department: person.department, color: person.color
        },
        currency,
        horizonDays,
        costRate: money(costRate),

        addedHours: round(addedHours, 1),
        lostHours: round(lostHours, 1),
        netHours,

        currentPerDay,
        newPerDay,
        remainingHours: f.remainingHours,
        daysBefore,
        daysAfter,
        daysSaved,

        newPersonCost,
        mentoringCost,
        extraCost,
        netExtraCost,
        costPerDaySaved: daysSaved > 0 ? money(netExtraCost / daysSaved) : null,

        verdict,
        assumptions: [
            `A new joiner contributes ${RAMP.map(r => `${Math.round(r * 100)}%`).join(', then ')} of full pace over their first weeks.`,
            `Existing team members lose ${Math.round(MENTOR_DRAG * 100)}% of their time to onboarding for ${MENTOR_WEEKS} weeks.`,
            `A working day is taken as ${dailyHours} productive hours.`,
            `${person.name}'s cost rate is ${money(costRate)}/hour; mentoring time is charged at the project's blended ${money(f.recentBlendedRate)}/hour.`,
            'These ramp figures are conventional planning assumptions, not measurements from this team.'
        ]
    }
}

// --- 3. Approving leave ------------------------------------------------------

// What a week off actually costs the projects that person is on.
//
// Leave is approved by someone looking at a calendar, and the consequence lands
// on a project nobody checked. This joins the two: whose work slows, by how
// much, and whether any deadline moves out of reach as a result.
//
// The answer is very often "fine, approve it" — and being able to say that with
// a number behind it is worth as much as catching the case where it is not.
const leaveImpact = async ({ employee, from, to }, { now = new Date(), context } = {}) => {
    const person = await Employee.findById(employee).select('name department jobTitle color')
    if (!person) return null

    const start = new Date(from)
    const end = new Date(to)
    const daysOff = workingDaysBetween(start, end)

    const shared = context || await budget.loadContext()

    // How much this person has actually been working lately, per project.
    const windowStart = new Date(now.getTime() - budget.WINDOW_DAYS * DAY)
    const entries = await TimeEntry.find({
        employee,
        workedOn: { $gte: windowStart }
    })

    const recentHours = entries.reduce((sum, e) => sum + e.hours, 0)
    const perWorkingDay = round(recentHours / Math.max(1, workingDaysBetween(windowStart, now)), 2)

    const byProject = new Map()
    for (const entry of entries) {
        if (!entry.objective) continue
        const key = String(entry.objective)
        byProject.set(key, (byProject.get(key) || 0) + entry.hours)
    }

    const projects = []
    for (const [objectiveId, hours] of byProject) {
        const detail = await budget.projectFinancials(objectiveId, { now, context: shared })
        if (!detail) continue

        const share = recentHours > 0 ? hours / recentHours : 0
        const hoursLost = round(daysOff * perWorkingDay * share, 1)

        const f = detail.forecast
        const daysBefore = f.daysToFinish
        // Their absence removes their share of the project's daily pace.
        const paceAfter = round(Math.max(0.01, f.hoursPerDay - (perWorkingDay * share)), 2)
        const daysAfter = paceAfter > 0 ? Math.ceil(f.remainingHours / paceAfter) : null

        const slip = daysBefore !== null && daysAfter !== null ? daysAfter - daysBefore : null
        const dueDate = detail.objective.dueDate ? new Date(detail.objective.dueDate) : null
        const finishAfter = daysAfter ? addWorkingDays(now, daysAfter) : null

        projects.push({
            id: detail.objective.id,
            title: detail.objective.title,
            dueDate,
            shareOfTheirTime: round(share * 100, 0),
            hoursLost,
            daysBefore,
            daysAfter,
            slip,
            finishAfter,
            missesDeadline: Boolean(dueDate && finishAfter && finishAfter > dueDate),
            alreadyLate: Boolean(dueDate && dueDate < now)
        })
    }

    // Anything of theirs falling due while they are away.
    const dueDuring = await Task.find({
        assignee: employee,
        status: { $ne: 'done' },
        dueDate: { $gte: start, $lte: end }
    }).select('title dueDate priority')

    // Other people already off at the same time — two absences that are each
    // fine can be a problem together, and nothing else checks it.
    //
    // Read-only, and it takes the leave records exactly as the leave module
    // writes them. Those records carry no reference to the employee they belong
    // to, only a free-text replacement name, so this can report that the window
    // is busy but cannot say who is in it or whether they are on the same team.
    // Naming that limit is better than quietly guessing from a name string.
    const overlapping = await LeaveManagement.find({
        status: { $in: ['Accepted', 'Pending'] },
        StartDate: { $lte: end },
        EndDate: { $gte: start }
    })

    const clashes = overlapping.map(l => ({
        id: String(l._id),
        leaveType: l.leaveType,
        replacement: l.ReplacementEmployee || '',
        from: l.StartDate,
        to: l.EndDate,
        status: l.status,
        // The leave module does not record whose request this is, so this
        // cannot be attributed to a person or checked against a department.
        attributable: false
    }))

    const worst = projects.filter(p => p.missesDeadline)

    return {
        person: {
            id: String(person._id), name: person.name,
            jobTitle: person.jobTitle, department: person.department, color: person.color
        },
        from: start,
        to: end,
        daysOff,
        perWorkingDay,
        recentHours: round(recentHours, 1),
        windowDays: budget.WINDOW_DAYS,

        projects: projects.sort((a, b) => (b.slip || 0) - (a.slip || 0)),
        dueDuring: dueDuring.map(t => ({
            id: String(t._id), title: t.title, dueDate: t.dueDate, priority: t.priority
        })),
        clashes,

        verdict: worst.length > 0 ? 'at_risk' : dueDuring.length > 0 ? 'reassign_first' : 'clear',
        assumptions: [
            `${person.name} has logged ${round(recentHours, 1)}h over the last ${budget.WINDOW_DAYS} days — ${perWorkingDay}h per working day.`,
            'Their absence is assumed to remove their own share of each project\'s pace, with nobody covering it.',
            'Weekends and public holidays are not counted as days off.'
        ]
    }
}

module.exports = { quoteDate, addPerson, leaveImpact, workingDaysBetween, addWorkingDays }
