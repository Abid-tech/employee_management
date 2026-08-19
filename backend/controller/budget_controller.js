const budget = require('../service/budget_service')
const time = require('../service/time_service')
const advisor = require('../service/budget_advisor')
const sim = require('../service/simulator_service')
const Employee = require('../model/employee')
const Objective = require('../model/objective')
const TimeEntry = require('../model/time_entry')

// HTTP only. Every calculation lives in budget_service; every write in
// time_service.

const asyncRoute = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next)

const actorFrom = async (req) => {
    const id = req.body?.actorId || req.query?.actorId
    if (!id) return { id: null, name: 'Unassigned user' }
    const person = await Employee.findById(id).catch(() => null)
    return person ? { id: person._id, name: person.name } : { id: null, name: 'Unassigned user' }
}

// --- Reads -------------------------------------------------------------------

const getPortfolio = asyncRoute(async (req, res) => {
    res.json(await budget.portfolio())
})

const getProject = asyncRoute(async (req, res) => {
    const detail = await budget.projectFinancials(req.params.id)
    if (!detail) return res.status(404).json({ error: 'That project no longer exists.' })
    res.json(detail)
})

const getMeta = asyncRoute(async (req, res) => {
    const [employees, objectives, rates] = await Promise.all([
        Employee.find({ isActive: true }).select('name jobTitle department color').sort({ name: 1 }),
        Objective.find().select('title status client dueDate').sort({ createdAt: -1 }),
        time.listRates()
    ])

    res.json({
        employees: employees.map(e => ({
            id: String(e._id), name: e.name, jobTitle: e.jobTitle,
            department: e.department, color: e.color,
            initials: e.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
        })),
        objectives: objectives.map(o => ({
            id: String(o._id), title: o.title, status: o.status,
            client: o.client || '', dueDate: o.dueDate || null
        })),
        rates,
        windowDays: budget.WINDOW_DAYS
    })
})

// --- Clock -------------------------------------------------------------------

const getShift = asyncRoute(async (req, res) => {
    const open = await time.openShift(req.query.employee)
    res.json({ shift: open ? await time.shape(open._id) : null })
})

const postClockIn = asyncRoute(async (req, res) => {
    const result = await time.clockIn(req.body)
    if (result.error) return res.status(400).json(result)
    res.status(201).json(result)
})

const postClockOut = asyncRoute(async (req, res) => {
    const result = await time.clockOut(req.body)
    if (result.error) return res.status(400).json(result)
    res.json(result)
})

const postManual = asyncRoute(async (req, res) => {
    const result = await time.logManual(req.body)
    if (result.error) return res.status(400).json(result)
    res.status(201).json(result)
})

const listEntries = asyncRoute(async (req, res) => {
    const filter = {}
    if (req.query.employee) filter.employee = req.query.employee
    if (req.query.objective) filter.objective = req.query.objective

    const entries = await TimeEntry.find(filter).sort({ workedOn: -1 }).limit(Number(req.query.limit) || 60)
    res.json({ entries: (await Promise.all(entries.map(e => time.shape(e._id)))).filter(Boolean) })
})

// --- Rates -------------------------------------------------------------------

const getRates = asyncRoute(async (req, res) => {
    res.json({ people: await time.listRates() })
})

const postRate = asyncRoute(async (req, res) => {
    const actor = await actorFrom(req)
    const result = await time.setRate(req.body, actor)
    if (result.error) return res.status(400).json(result)
    res.status(201).json(result)
})

// --- Budget configuration ----------------------------------------------------

const postBudget = asyncRoute(async (req, res) => {
    const result = await time.setBudget(req.body)
    if (result.error) return res.status(400).json(result)
    res.json(result)
})


// --- The advisor -------------------------------------------------------------

// What went wrong across every project, and what to budget differently next
// time. `plan` is an optional {department: hours} object — when present the
// calibration factors are applied to it and a recommended figure comes back.
const getAdvice = asyncRoute(async (req, res) => {
    let plan = null
    if (req.query.plan) {
        try { plan = JSON.parse(req.query.plan) } catch { plan = null }
    }
    res.json(await advisor.advise({ plan }))
})


// --- Decision simulation -----------------------------------------------------
// Three questions that each need half the answer from a task tool and half from
// a cost tool. This app holds both halves.

const simQuote = asyncRoute(async (req, res) => {
    if (!req.query.date) return res.status(400).json({ error: 'Give the date you want to promise.' })
    const result = await sim.quoteDate(req.params.id, req.query.date)
    if (!result) return res.status(404).json({ error: 'That project no longer exists.' })
    res.json({ quote: result })
})

const simAddPerson = asyncRoute(async (req, res) => {
    if (!req.query.employee) return res.status(400).json({ error: 'Choose who you would add.' })
    const result = await sim.addPerson(req.params.id, req.query.employee, {
        horizonDays: Number(req.query.horizonDays) || 30
    })
    if (!result) return res.status(404).json({ error: 'That project or person no longer exists.' })
    res.json({ simulation: result })
})

const simLeave = asyncRoute(async (req, res) => {
    const { employee, from, to } = req.query
    if (!employee || !from || !to) return res.status(400).json({ error: 'Choose the person and the dates.' })
    const result = await sim.leaveImpact({ employee, from, to })
    if (!result) return res.status(404).json({ error: 'That person is not on the roster.' })
    res.json({ impact: result })
})

module.exports = {
    simQuote, simAddPerson, simLeave,
    getAdvice,
    getPortfolio, getProject, getMeta,
    getShift, postClockIn, postClockOut, postManual, listEntries,
    getRates, postRate,
    postBudget
}
