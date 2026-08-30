const Task = require('../model/task')
const TimeEntry = require('../model/time_entry')
const Objective = require('../model/objective')
const ProjectBudget = require('../model/project_budget')
const Employee = require('../model/employee')
const budget = require('./budget_service')
const gemini = require('./gemini')

// The budget advisor: what went wrong, and what to budget differently next time.
//
// A forecast tells you where a project is heading. It cannot tell you *why* your
// budgets keep being wrong, which is the question that actually changes the next
// one. So this looks backwards across every project at once and produces two
// distinct things:
//
//   post-mortem    what went wrong, with the money attributed to a cause
//   guidance       what to do differently, as a number you can put in a budget
//
// Every finding is computed from records the system already keeps, and every
// one carries the arithmetic that produced it. A recommendation a manager cannot
// check is a recommendation they are right to ignore.
//
// Gemini, when a key is configured, is asked only to *phrase* the summary. The
// findings themselves are always the code's, because a model inventing a
// financial claim is a far worse failure than a plainly worded one.

const DAY = 24 * 60 * 60 * 1000

const round = (n, dp = 2) => {
    const f = 10 ** dp
    return Math.round((Number(n) || 0) * f) / f
}
const money = (n) => Math.round((Number(n) || 0) * 100) / 100
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0)
const median = (list) => {
    if (list.length === 0) return 0
    const sorted = [...list].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
const percentile = (list, p) => {
    if (list.length === 0) return 0
    const sorted = [...list].sort((a, b) => a - b)
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}

// Below this a pattern is an anecdote. Said out loud rather than buried, because
// "how much evidence is enough" is exactly what a reader should be allowed to
// disagree with.
const MIN_SAMPLE = 8

const fmt = (value, currency = 'USD') => {
    const symbol = { USD: '$', GBP: '£', EUR: '€', BDT: '৳' }[currency] || ''
    const n = Math.abs(Number(value) || 0)
    return `${value < 0 ? '−' : ''}${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

// --- 1. Estimate calibration -------------------------------------------------

// How wrong this team's estimates are, per department.
//
// The single most useful number a budget advisor can produce. If Design
// consistently finishes at 1.3× its estimate, then every Design budget built
// from estimates is 30% short before anyone starts — and no amount of watching
// the burn chart afterwards fixes that. The correction factor is the median
// rather than the mean, because one catastrophic task should not redefine how a
// whole department estimates.
const calibration = (doneTasks) => {
    const byDepartment = new Map()

    for (const task of doneTasks) {
        if (!(task.estimateHours > 0) || !(task.spentHours > 0)) continue
        const key = task.department || 'Unassigned'
        if (!byDepartment.has(key)) byDepartment.set(key, [])
        byDepartment.get(key).push({ ratio: task.spentHours / task.estimateHours, task })
    }

    const rows = []
    for (const [department, list] of byDepartment) {
        const ratios = list.map(r => r.ratio)
        const mid = median(ratios)

        rows.push({
            department,
            sample: list.length,
            enough: list.length >= MIN_SAMPLE,
            medianRatio: round(mid, 2),
            p90Ratio: round(percentile(ratios, 0.9), 2),
            // What to multiply an estimate by when budgeting. Rounded to whole
            // percents because a factor of 1.1732 implies a precision nobody has.
            correction: round(mid, 2),
            overrunRate: round((ratios.filter(r => r > 1.15).length / ratios.length) * 100, 0),
            direction: mid > 1.1 ? 'under' : mid < 0.9 ? 'over' : 'close',

            // The evidence behind the factor. A median is a claim about a set of
            // tasks; without the set it has to be taken on trust, and an
            // estimator nobody trusts does not get used.
            ranOver: ratios.filter(r => r > 1.15).length,
            ranUnder: ratios.filter(r => r < 0.85).length,
            onTarget: ratios.filter(r => r >= 0.85 && r <= 1.15).length,
            bestRatio: round(Math.min(...ratios), 2),
            worstRatio: round(Math.max(...ratios), 2),
            estimatedHours: round(list.reduce((s, r) => s + r.task.estimateHours, 0), 1),
            spentHours: round(list.reduce((s, r) => s + r.task.spentHours, 0), 1),
            examples: list
                .slice()
                .sort((a, b) => b.ratio - a.ratio)
                .slice(0, 4)
                .map(({ task, ratio }) => ({
                    id: String(task._id),
                    title: task.title,
                    priority: task.priority,
                    estimateHours: task.estimateHours,
                    spentHours: round(task.spentHours, 1),
                    ratio: round(ratio, 2)
                }))
        })
    }

    return rows.sort((a, b) => b.medianRatio - a.medianRatio)
}

// --- 2. Where the money actually leaked --------------------------------------

// The worst-estimated tasks, priced.
//
// An overrun is never spread evenly. Naming the handful of items that caused
// most of it is what turns "we went over" into something a team can learn from,
// and it usually reveals a category — a kind of work this team always
// underestimates — rather than a person.
const worstEstimates = (doneTasks, costByTask, currency) => doneTasks
    .filter(task => task.estimateHours > 0 && task.spentHours > task.estimateHours * 1.25)
    .map(task => {
        const overHours = task.spentHours - task.estimateHours
        const rate = costByTask.get(String(task._id))?.blendedRate || 0
        return {
            id: String(task._id),
            title: task.title,
            department: task.department,
            priority: task.priority,
            estimateHours: task.estimateHours,
            spentHours: round(task.spentHours, 1),
            overHours: round(overHours, 1),
            ratio: round(task.spentHours / task.estimateHours, 2),
            overCost: money(overHours * rate)
        }
    })
    .sort((a, b) => b.overCost - a.overCost)
    .slice(0, 8)

// --- 3. Rate efficiency ------------------------------------------------------

// Expensive people doing work that did not need them.
//
// Not a criticism of anyone — it is usually a scheduling accident, and it is
// invisible in a budget that only tracks a total. The saving is calculated
// against the *median* rate of people who actually worked on this project, not
// against the cheapest possible person, because the cheapest person is rarely a
// realistic alternative.
const rateEfficiency = (priced, tasksById, currency) => {
    const rates = priced.map(p => p.costRate).filter(r => r > 0)
    if (rates.length < MIN_SAMPLE) return null

    const midRate = median(rates)
    const topQuartile = percentile(rates, 0.75)

    // Low-priority or small work carried out at a top-quartile rate.
    const mismatched = priced.filter(p => {
        if (p.costRate < topQuartile) return false
        const task = tasksById.get(String(p.taskId))
        if (!task) return false
        return task.priority === 'low' || (task.estimateHours > 0 && task.estimateHours <= 4)
    })

    if (mismatched.length === 0) return null

    const hours = mismatched.reduce((sum, p) => sum + p.hours, 0)
    const actual = money(mismatched.reduce((sum, p) => sum + p.cost, 0))
    const atMedian = money(hours * midRate)

    return {
        hours: round(hours, 1),
        entries: mismatched.length,
        actualCost: actual,
        atMedianCost: atMedian,
        avoidable: money(actual - atMedian),
        medianRate: money(midRate),
        topQuartileRate: money(topQuartile)
    }
}

// --- 4. When the money was spent ---------------------------------------------

// Spend concentrated at the end is the signature of a plan that did not hold.
//
// Worth separating from simply spending too much: a project that burns evenly
// and lands over was mis-budgeted, while one that is calm for six weeks and then
// doubles was mis-planned. Those need different fixes, and the burn chart alone
// does not distinguish them.
const shapeOfSpend = (priced) => {
    if (priced.length < MIN_SAMPLE) return null

    const times = priced.map(p => new Date(p.workedOn).getTime())
    const start = Math.min(...times)
    const end = Math.max(...times)
    const span = Math.max(1, end - start)

    const quarters = [0, 0, 0, 0]
    for (const entry of priced) {
        const position = (new Date(entry.workedOn).getTime() - start) / span
        quarters[Math.min(3, Math.floor(position * 4))] += entry.cost
    }

    const total = quarters.reduce((a, b) => a + b, 0) || 1
    const shares = quarters.map(q => round((q / total) * 100, 1))

    return {
        shares,
        lastQuarterShare: shares[3],
        // A flat project spends 25% in each quarter. Above 40% in the final one
        // is a crunch, not a rounding difference.
        backLoaded: shares[3] >= 40,
        frontLoaded: shares[0] >= 40,
        elapsedDays: Math.round(span / DAY)
    }
}

// --- 5. Billable leakage -----------------------------------------------------

const billableLeak = (priced) => {
    const nonBillable = priced.filter(p => p.billed === 0 && p.cost > 0)
    if (nonBillable.length === 0) return null

    const cost = money(nonBillable.reduce((sum, p) => sum + p.cost, 0))
    const total = money(priced.reduce((sum, p) => sum + p.cost, 0)) || 1

    return {
        hours: round(nonBillable.reduce((sum, p) => sum + p.hours, 0), 1),
        cost,
        share: round((cost / total) * 100, 1),
        entries: nonBillable.length
    }
}

// --- Per project -------------------------------------------------------------

const reviewProject = async (objectiveId, context) => {
    const detail = await budget.projectFinancials(objectiveId, { context, full: true })
    if (!detail?.budget) return null

    // projectFinancials already loaded these to work out the outstanding hours;
    // asking Mongo for them a second time is one round trip per project for a
    // result we are holding.
    const tasks = detail.tasks || await Task.find({ objective: objectiveId })
    const tasksById = new Map(tasks.map(t => [String(t._id), t]))
    const currency = detail.budget.currency

    // Blended rate per task, so an overrun can be priced.
    const costByTask = new Map()
    const ledger = detail.allEntries || detail.entries
    for (const entry of ledger) {
        if (!entry.taskId) continue
        const row = costByTask.get(entry.taskId) || { hours: 0, cost: 0 }
        row.hours += entry.hours
        row.cost += entry.cost
        costByTask.set(entry.taskId, row)
    }
    for (const [key, row] of costByTask) {
        row.blendedRate = row.hours > 0 ? row.cost / row.hours : 0
        costByTask.set(key, row)
    }

    const doneTasks = tasks.filter(t => t.status === 'done')
    const f = detail.forecast

    return {
        objective: detail.objective,
        currency,
        totalBudget: f.total,
        spent: f.spent,
        projected: f.projected,
        percentUsed: f.percentUsed,
        overrun: f.willOverrun,
        overBy: f.overBy,
        margin: detail.margin,
        marginPercent: detail.marginPercent,

        worstEstimates: worstEstimates(doneTasks, costByTask, currency),
        rateEfficiency: rateEfficiency(ledger, tasksById, currency),
        shape: shapeOfSpend(ledger),
        leak: billableLeak(ledger)
    }
}

// --- Turning analysis into advice --------------------------------------------

const buildFindings = (projects, calibrationRows, currency) => {
    const past = []
    const future = []

    // --- What went wrong ---
    const overrunning = projects.filter(p => p.overrun)
    for (const project of overrunning) {
        const causes = []
        const worst = project.worstEstimates.slice(0, 3)
        const worstTotal = money(worst.reduce((sum, t) => sum + t.overCost, 0))

        if (worst.length > 0 && project.overBy > 0) {
            causes.push(`${fmt(worstTotal, currency)} of it came from ${worst.length} `
                + `${worst.length === 1 ? 'task' : 'tasks'} that ran past their estimate — `
                + worst.map(t => `"${t.title}" (${t.estimateHours}h estimated, ${t.spentHours}h spent)`).join('; ') + '.')
        }
        if (project.shape?.backLoaded) {
            causes.push(`${project.shape.lastQuarterShare}% of the spend landed in the final quarter of the project's `
                + `${project.shape.elapsedDays} days, so this was a plan that did not hold rather than a budget that was simply too small.`)
        }
        if (project.rateEfficiency?.avoidable > 0) {
            causes.push(`${fmt(project.rateEfficiency.avoidable, currency)} went on senior people doing low-priority or small work.`)
        }

        past.push({
            kind: 'overrun',
            severity: 'high',
            metric: { value: project.overBy, unit: 'money', label: 'over budget' },
            project: project.objective.title,
            projectId: project.objective.id,
            headline: `${project.objective.title} is ${fmt(project.overBy, currency)} over`,
            detail: causes.length
                ? causes.join(' ')
                : `Spent ${fmt(project.spent, currency)} of ${fmt(project.totalBudget, currency)} with the forecast at ${fmt(project.projected, currency)}.`,
            amount: project.overBy
        })
    }

    for (const project of projects) {
        if (project.leak && project.leak.share >= 15) {
            past.push({
                kind: 'leak',
                severity: 'medium',
                metric: { value: project.leak.share, unit: '%', label: 'never billed' },
                project: project.objective.title,
                projectId: project.objective.id,
                headline: `${project.leak.share}% of ${project.objective.title} was non-billable`,
                detail: `${project.leak.hours}h costing ${fmt(project.leak.cost, currency)} carried no bill rate. `
                    + 'Internal roles on a client project are a real cost that never reaches an invoice.',
                amount: project.leak.cost
            })
        }
    }

    // --- What to do next time ---
    for (const row of calibrationRows) {
        if (!row.enough) continue

        if (row.direction === 'under') {
            const uplift = Math.round((row.correction - 1) * 100)
            future.push({
                kind: 'calibrate',
                severity: uplift >= 25 ? 'high' : 'medium',
                metric: { value: uplift, unit: '%', prefix: '+', label: 'on every estimate' },
                headline: `Budget ${uplift}% above ${row.department} estimates`,
                detail: `Across ${row.sample} finished ${row.department} tasks the median came in at `
                    + `${row.medianRatio}× the estimate, and ${row.overrunRate}% ran over. `
                    + `A ${row.department} project estimated at 100 hours should be budgeted for ${Math.round(row.correction * 100)}. `
                    + `The worst tenth reached ${row.p90Ratio}×, so hold contingency for that tail rather than widening the base.`,
                factor: row.correction,
                department: row.department
            })
        } else if (row.direction === 'over') {
            const cut = Math.round((1 - row.correction) * 100)
            future.push({
                kind: 'calibrate',
                severity: 'low',
                metric: { value: cut, unit: '%', prefix: '−', label: 'of padding' },
                headline: `${row.department} estimates run ${cut}% high`,
                detail: `${row.sample} finished tasks came in at a median ${row.medianRatio}× the estimate. `
                    + 'Padding on this scale ties up budget that could be committed elsewhere — but check it is padding '
                    + 'rather than work quietly being dropped before you cut it.',
                factor: row.correction,
                department: row.department
            })
        }
    }

    const totalAvoidable = money(projects.reduce((sum, p) => sum + (p.rateEfficiency?.avoidable || 0), 0))
    if (totalAvoidable > 0) {
        const hours = round(projects.reduce((sum, p) => sum + (p.rateEfficiency?.hours || 0), 0), 1)
        future.push({
            kind: 'rate_mix',
            severity: totalAvoidable > 1000 ? 'high' : 'medium',
            metric: { value: totalAvoidable, unit: 'money', label: 'recoverable' },
            headline: `${fmt(totalAvoidable, currency)} a period is going on seniority that the work did not need`,
            detail: `${hours}h of low-priority or small tasks were done by people in the top quarter of cost rates. `
                + 'Routing that work to the median rate would have cost that much less. This is usually a scheduling '
                + 'accident rather than anyone\'s choice — the fix is who picks up small items, not who is on the team.',
            amount: totalAvoidable
        })
    }

    const backLoaded = projects.filter(p => p.shape?.backLoaded)
    if (backLoaded.length > 0) {
        const overrunShare = backLoaded.filter(p => p.overrun).length / backLoaded.length
        future.push({
            kind: 'timing',
            severity: overrunShare >= 0.5 ? 'high' : 'medium',
            metric: { value: backLoaded.length, unit: 'count', label: `of ${projects.length} projects` },
            headline: `${backLoaded.length} of ${projects.length} projects spent most of their money at the end`,
            detail: `${backLoaded.map(p => p.objective.title).join(', ')} put 40% or more of total spend into the final `
                + `quarter of their elapsed time, and ${Math.round(overrunShare * 100)}% of those overran. `
                + 'Late concentration is the earliest reliable warning available — worth a checkpoint at the halfway '
                + 'mark rather than waiting for a threshold alert.',
            amount: null
        })
    }

    return {
        past: past.sort((a, b) => (b.amount || 0) - (a.amount || 0)),
        future: future.sort((a, b) => {
            const rank = { high: 0, medium: 1, low: 2 }
            return rank[a.severity] - rank[b.severity]
        })
    }
}

// --- The model's part --------------------------------------------------------

// Reading the trends back as plain language.
//
// The division of labour is deliberate and worth being strict about: every
// number, ratio and threshold above is computed in code, and the model is handed
// those findings and asked only to write them up. It is never asked what the
// overspend was or which department estimates badly, because a model inventing a
// financial figure is a far worse failure than a plainly worded paragraph.
//
// Called directly rather than through service/gemini.js: that module's helper is
// shaped to return a task list for the document importer, and bending it to
// produce a summary is how the wrong schema ends up in the wrong place.
const MODEL_TIMEOUT = 30000

const askModel = async (evidence) => {
    if (!gemini.isConfigured()) return null

    const prompt = [
        'You are a finance lead reviewing project delivery data. Below are findings already',
        'calculated from the data — treat every number as fact and do not invent or alter any.',
        '',
        JSON.stringify(evidence, null, 1),
        '',
        'Reply with JSON only, in this shape:',
        '{"summary": "...", "suggestions": [{"headline": "...", "detail": "..."}]}',
        '',
        'summary: 2-3 sentences a director could read in a standup. Say what the pattern is',
        '  across projects, not what any single project did. Reference the actual figures.',
        'suggestions: 2-4 items. Each headline under 70 characters and starting with a verb.',
        '  Each detail 1-2 sentences saying what to change and why, citing a figure above.',
        'Do not repeat the findings verbatim. Do not use the words "leverage" or "synergy".',
        'Do not mention that you are an AI or that this was generated.'
    ].join('\n')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT)

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${gemini.modelName()}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.25,
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: 'OBJECT',
                            properties: {
                                summary: { type: 'STRING' },
                                suggestions: {
                                    type: 'ARRAY',
                                    items: {
                                        type: 'OBJECT',
                                        properties: { headline: { type: 'STRING' }, detail: { type: 'STRING' } },
                                        required: ['headline', 'detail']
                                    }
                                }
                            },
                            required: ['summary', 'suggestions']
                        }
                    }
                })
            }
        )

        if (!response.ok) throw new Error(`Gemini responded ${response.status}`)

        const payload = await response.json()
        const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text
        if (!raw) throw new Error('empty response')

        const parsed = JSON.parse(raw)
        if (!parsed.summary) throw new Error('no summary returned')

        return { ...parsed, engine: gemini.modelName() }
    } catch (error) {
        // A model that is slow, rate-limited or unreachable must not take the
        // page down with it. The computed findings are the substance; the
        // write-up is a convenience, and the fallback says so plainly.
        console.error('[advisor] model narration unavailable:', error.message)
        return null
    } finally {
        clearTimeout(timer)
    }
}

// What the page says when there is no model, or the model failed. Written from
// the same computed findings, so the substance is identical either way.
const summariseByRules = (reviews, calibrationRows, findings, currency) => {
    const overrunning = reviews.filter(r => r.overrun)
    const worstDept = calibrationRows.find(r => r.enough && r.direction === 'under')
    const totalOver = money(overrunning.reduce((sum, r) => sum + (r.overBy || 0), 0))

    const parts = []
    if (overrunning.length > 0) {
        parts.push(`${overrunning.length} of ${reviews.length} projects are forecast to finish over budget, `
            + `${fmt(totalOver, currency)} between them.`)
    } else {
        parts.push(`All ${reviews.length} projects are currently forecast to land inside budget.`)
    }
    if (worstDept) {
        parts.push(`${worstDept.department} work lands at ${worstDept.medianRatio}× its estimate, `
            + `so budgets built from those estimates start short.`)
    }
    parts.push(`${findings.future.length} changes are worth making before the next project is priced.`)

    return { summary: parts.join(' '), suggestions: [], engine: 'rules' }
}

// --- What the next project should be budgeted at -----------------------------

// Applying the calibration factors to a proposed piece of work.
//
// This is the point of the whole page: not "you went over", but "here is the
// number to write down next time". Estimates are corrected per department and
// the contingency is taken from the observed tail rather than a flat 10%.
const budgetFor = (plan, calibrationRows, blendedRates) => {
    const lines = []
    let base = 0
    let corrected = 0
    let tail = 0

    for (const [department, hours] of Object.entries(plan || {})) {
        const h = Number(hours) || 0
        if (h <= 0) continue

        const row = calibrationRows.find(r => r.department === department)
        const factor = row?.enough ? row.correction : 1
        const p90 = row?.enough ? row.p90Ratio : 1.3
        const rate = blendedRates.get(department) || blendedRates.get('__all__') || 0

        base += h * rate
        corrected += h * factor * rate
        tail += h * p90 * rate

        lines.push({
            department,
            hours: h,
            factor: round(factor, 2),
            rate: money(rate),
            raw: money(h * rate),
            expected: money(h * factor * rate),
            worstCase: money(h * p90 * rate),
            basis: row?.enough ? `${row.sample} finished tasks` : 'no history yet — factor 1.0 assumed'
        })
    }

    return {
        lines,
        raw: money(base),
        expected: money(corrected),
        worstCase: money(tail),
        // What to actually commit: the corrected figure, plus enough of the tail
        // to survive a bad run without hoarding budget.
        recommended: money(corrected + (tail - corrected) * 0.4)
    }
}

// --- Public ------------------------------------------------------------------

const advise = async ({ plan } = {}) => {
    const [budgets, context, allDone, employees] = await Promise.all([
        ProjectBudget.find().populate('objective', 'title status'),
        budget.loadContext(),
        Task.find({ status: 'done', estimateHours: { $gt: 0 }, spentHours: { $gt: 0 } }),
        Employee.find().select('name department')
    ])

    const reviews = (await Promise.all(
        budgets.filter(b => b.objective).map(b => reviewProject(b.objective._id, context))
    )).filter(Boolean)

    const currency = reviews[0]?.currency || 'USD'
    const calibrationRows = calibration(allDone)

    // Blended cost rate per department, for pricing a proposed plan.
    const entries = await TimeEntry.find().select('employee hours')
    const { ratesByEmployee } = context
    const deptOf = new Map(employees.map(e => [String(e._id), e.department]))
    const byDept = new Map()
    let allHours = 0
    let allCost = 0

    for (const entry of entries) {
        const rate = budget.rateOn(entry.employee, new Date(), ratesByEmployee)
        if (!rate) continue
        const department = deptOf.get(String(entry.employee)) || 'Unassigned'
        const row = byDept.get(department) || { hours: 0, cost: 0 }
        row.hours += entry.hours
        row.cost += entry.hours * rate.costRate
        byDept.set(department, row)
        allHours += entry.hours
        allCost += entry.hours * rate.costRate
    }

    const blendedRates = new Map(
        [...byDept.entries()].map(([d, r]) => [d, r.hours > 0 ? r.cost / r.hours : 0])
    )
    blendedRates.set('__all__', allHours > 0 ? allCost / allHours : 0)

    const findings = buildFindings(reviews, calibrationRows, currency)

    // The model sees only what was computed — never the raw ledger — so it has
    // nothing to draw a new number from even if it were inclined to.
    const evidence = {
        currency,
        projects: reviews.map(r => ({
            title: r.objective.title,
            budget: r.totalBudget,
            spent: r.spent,
            forecast: r.projected,
            percentUsed: r.percentUsed,
            overrun: r.overrun,
            overBy: r.overBy,
            marginPercent: r.marginPercent,
            spendInFinalQuarter: r.shape?.lastQuarterShare ?? null,
            nonBillableShare: r.leak?.share ?? null,
            avoidableSeniorityCost: r.rateEfficiency?.avoidable ?? null,
            worstEstimate: r.worstEstimates[0]
                ? { task: r.worstEstimates[0].title, ratio: r.worstEstimates[0].ratio, overCost: r.worstEstimates[0].overCost }
                : null
        })),
        estimateAccuracy: calibrationRows
            .filter(c => c.enough)
            .map(c => ({ department: c.department, median: c.medianRatio, worstTenth: c.p90Ratio, ranOver: c.overrunRate, sample: c.sample })),
        computedFindings: {
            wentWrong: findings.past.map(f => f.headline),
            doDifferently: findings.future.map(f => f.headline)
        }
    }

    const narration = (await askModel(evidence))
        || summariseByRules(reviews, calibrationRows, findings, currency)

    return {
        currency,
        minSample: MIN_SAMPLE,
        generatedAt: new Date(),

        // Reported honestly. This used to say the model's name whenever a key
        // was present, whether or not the model had actually been asked
        // anything — which is a claim the page had not earned.
        engine: narration.engine,
        modelConfigured: gemini.isConfigured(),
        narration,

        projectsReviewed: reviews.length,
        tasksAnalysed: allDone.length,

        calibration: calibrationRows,
        blendedRates: Object.fromEntries([...blendedRates.entries()].map(([k, v]) => [k, money(v)])),

        postMortem: findings.past,
        guidance: findings.future,

        projects: reviews.map(r => ({
            id: r.objective.id,
            title: r.objective.title,
            totalBudget: r.totalBudget,
            spent: r.spent,
            projected: r.projected,
            percentUsed: r.percentUsed,
            overrun: r.overrun,
            overBy: r.overBy,
            marginPercent: r.marginPercent,
            worstEstimates: r.worstEstimates.slice(0, 4),
            shape: r.shape,
            rateEfficiency: r.rateEfficiency,
            leak: r.leak
        })),

        estimator: plan ? budgetFor(plan, calibrationRows, blendedRates) : null
    }
}

module.exports = { advise, calibration, budgetFor, worstEstimates, shapeOfSpend, MIN_SAMPLE }
