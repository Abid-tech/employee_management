// Demo data for the Project Budget Tracker.
//
//   node seed_budget_demo.js          add it
//   node seed_budget_demo.js --undo   remove exactly what it added
//
// Shaped so every claim the module makes has something real behind it:
//
//   - one project burning steadily and comfortably inside budget
//   - one that looks fine on its lifetime average but has spiked in the last
//     week, so the rolling-window forecast catches an overrun the percentage
//     bar would not
//   - one already over
//   - a mid-project pay rise, to prove hours logged before the raise still cost
//     what they cost
//   - a senior logging junior work at an overridden rate
//   - weekend hours, for the narration to notice

require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

const connectDB = require('./config/db')
const Employee = require('./model/employee')
const Objective = require('./model/objective')
const Task = require('./model/task')
const Rate = require('./model/rate')
const TimeEntry = require('./model/time_entry')
const ProjectBudget = require('./model/project_budget')

const MANIFEST = path.join(__dirname, 'data', 'budget_demo_manifest.json')
const DAY = 24 * 60 * 60 * 1000

let state = 0x5c3a91f7
const rnd = () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (lo, hi) => lo + rnd() * (hi - lo)

// cost is what the hour costs us; bill is what the client pays for it.
const RATES = {
    'Rima Sultana': { cost: 42, bill: 95 },
    'Golam Rabbani Shanto': { cost: 48, bill: 110 },
    'Moumita Heena': { cost: 40, bill: 92 },
    'Rahim Uddin': { cost: 34, bill: 80 },
    'Sadia Karim': { cost: 30, bill: 72 },
    'Ayan Mahmud': { cost: 28, bill: 68 },
    'Farhana Islam': { cost: 38, bill: 88 },
    'Karim Chowdhury': { cost: 26, bill: 62 },
    'Mehedi Hasan': { cost: 32, bill: 75 },
    'Sumaiya Akter': { cost: 24, bill: 58 },
    'Nusrat Jahan': { cost: 36, bill: 0 },
    'Shakib Rahman': { cost: 25, bill: 0 }
}

// How each project should behave, so the forecast has distinct cases to find.
//   steady   even burn, lands inside budget
//   spike    calm for weeks, then a sharp recent acceleration
//   over     already past the cap
const SHAPES = ['spike', 'steady', 'over', 'steady']

const readManifest = () => {
    try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) } catch { return null }
}

const undo = async () => {
    const manifest = readManifest()
    if (!manifest) return console.log('No manifest found — nothing to undo.')

    const e = await TimeEntry.deleteMany({ _id: { $in: manifest.entries } })
    const r = await Rate.deleteMany({ _id: { $in: manifest.rates } })
    const b = await ProjectBudget.deleteMany({ _id: { $in: manifest.budgets } })

    // Put back the spent-hours this script added to the task board.
    for (const [taskId, hours] of Object.entries(manifest.taskHours || {})) {
        await Task.findByIdAndUpdate(taskId, { $inc: { spentHours: -hours } })
    }

    fs.unlinkSync(MANIFEST)
    console.log(`Removed ${e.deletedCount} time entries, ${r.deletedCount} rates and ${b.deletedCount} budgets.`)
}

const seed = async () => {
    if (readManifest()) return console.log('Budget demo data is already in place. Run with --undo first.')

    const [employees, objectives] = await Promise.all([
        Employee.find(),
        Objective.find({ status: { $in: ['active', 'planning'] } }).limit(4)
    ])
    if (employees.length === 0) throw new Error('No employees found. Run `npm run seed` first.')
    if (objectives.length === 0) throw new Error('No active objectives found.')

    const now = Date.now()
    const rateDocs = []

    // --- Rates, effective-dated -------------------------------------------
    for (const person of employees) {
        const base = RATES[person.name] || { cost: 30, bill: 70 }

        // The rate everyone started the year on.
        rateDocs.push({
            employee: person._id,
            costRate: base.cost,
            billRate: base.bill,
            effectiveFrom: new Date(now - 200 * DAY),
            reason: 'Opening rate',
            createdByName: 'Seed'
        })
    }

    // Two people got a raise 21 days ago. Hours logged before that date must
    // still cost the old rate — that is the whole point of effective dating.
    const raised = employees.filter(e => ['Rima Sultana', 'Sadia Karim'].includes(e.name))
    for (const person of raised) {
        const base = RATES[person.name]
        rateDocs.push({
            employee: person._id,
            costRate: Math.round(base.cost * 1.18),
            billRate: Math.round(base.bill * 1.15),
            effectiveFrom: new Date(now - 21 * DAY),
            reason: 'Annual review — promotion',
            createdByName: 'Seed'
        })
    }

    const rates = await Rate.insertMany(rateDocs)
    console.log(`  Rates inserted:      ${rates.length} (${raised.length} mid-project raises)`)

    // --- Budgets ----------------------------------------------------------
    const budgetDocs = objectives.map((objective, i) => ({
        objective: objective._id,
        totalBudget: [18000, 26000, 9000, 15000][i] || 15000,
        currency: 'USD',
        thresholds: [50, 75, 90, 100],
        firedThresholds: [],
        hardStop: i === 2,
        note: SHAPES[i] === 'over' ? 'Fixed-fee engagement — cap is contractual.' : ''
    }))

    const budgets = await ProjectBudget.insertMany(budgetDocs)
    console.log(`  Budgets inserted:    ${budgets.length}`)

    // --- Time entries -----------------------------------------------------
    const entryDocs = []
    const taskHours = {}

    for (let i = 0; i < objectives.length; i += 1) {
        const objective = objectives[i]
        const shape = SHAPES[i] || 'steady'
        const cap = budgetDocs[i].totalBudget

        const tasks = await Task.find({ objective: objective._id })
        const team = employees.filter(() => rnd() < 0.42).slice(0, 4)
        if (team.length === 0) team.push(employees[i % employees.length])

        // How many hours each task can absorb before it stops looking credible.
        //
        // Entries used to be attached to a task picked purely at random, so a
        // three-hour job could end up carrying eleven hours of logged time. That
        // reads as broken on the task board, and it is worse than cosmetic:
        // the performance module scores estimate accuracy from exactly this
        // ratio, so nonsense here quietly drags down people's Quality pillar.
        const capacity = new Map(tasks.map(t => [String(t._id), (t.estimateHours || 4) * between(0.7, 1.35)]))
        const withRoom = () => tasks.filter(t => (capacity.get(String(t._id)) || 0) > 0.3)

        // Roughly how much of the cap this project should have consumed.
        const targetSpend = shape === 'over' ? cap * 1.12 : shape === 'spike' ? cap * 0.52 : cap * 0.44

        // Generate across the whole period first and scale to the target
        // afterwards. Stopping as soon as the target was reached filled the
        // oldest days and left the recent fortnight empty — which is precisely
        // the window the forecast reads, so every project came back with a zero
        // burn rate and no ETA.
        const draft = []
        let raw = 0

        for (let day = 56; day >= 0; day -= 1) {
            const date = new Date(now - day * DAY)
            const weekday = date.getDay()

            // How hard the project is being pushed on this day.
            let intensity
            if (shape === 'spike') {
                // Calm for seven weeks, then a sharp acceleration in the last
                // ten days — invisible to a lifetime average, obvious to a
                // rolling window.
                intensity = day > 10 ? between(0.25, 0.6) : between(2.1, 3.4)
            } else if (shape === 'over') {
                intensity = between(1.0, 1.7)
            } else {
                intensity = between(0.7, 1.2)
            }

            // Weekends are quiet, except on the project that is in trouble.
            if ([0, 6].includes(weekday)) {
                if (shape === 'spike' && day <= 10) intensity *= 0.8
                else if (rnd() < 0.75) continue
                else intensity *= 0.4
            }

            for (const person of team) {
                if (rnd() > 0.55) continue

                const hours = Math.round(between(1.5, 6) * intensity * 10) / 10
                if (hours <= 0) continue

                // Prefer a task that still has room. Once every task on the
                // project is full the time is still real — it just belongs to
                // the project rather than to any one item on the board.
                const open = withRoom()
                const task = open.length ? open[Math.floor(rnd() * open.length)] : null
                if (task) capacity.set(String(task._id), capacity.get(String(task._id)) - hours)

                // One senior doing junior cleanup at an agreed lower rate, so
                // the override path has a real example behind it.
                const override = person.name === 'Golam Rabbani Shanto' && rnd() < 0.18

                draft.push({
                    employee: person._id,
                    task: task?._id || null,
                    objective: objective._id,
                    hours,
                    workedOn: date,
                    source: rnd() < 0.75 ? 'clock' : 'manual',
                    note: override ? 'Cleanup pass on junior work' : '',
                    costRateOverride: override ? 26 : null,
                    billRateOverride: override ? 62 : null,
                    overrideReason: override ? 'Agreed at junior rate for cleanup' : '',
                    billable: RATES[person.name]?.bill > 0
                })

                raw += hours * (override ? 26 : (RATES[person.name]?.cost || 30))
            }
        }

        // Scale every entry so the project lands on its intended spend while
        // keeping the shape of the burn — including the recent spike.
        const factor = raw > 0 ? targetSpend / raw : 1
        for (const entry of draft) {
            entry.hours = Math.max(0.25, Math.round(entry.hours * factor * 10) / 10)
            entryDocs.push(entry)
            if (entry.task) {
                taskHours[String(entry.task)] = (taskHours[String(entry.task)] || 0) + entry.hours
            }
        }
    }

    const entries = await TimeEntry.insertMany(entryDocs)
    console.log(`  Time entries:        ${entries.length}`)

    // Recomputed from the ledger, not incremented — the seed has to obey the
    // same single-source-of-truth rule as the app, or it recreates the drift
    // the app was just fixed to prevent.
    const { reconcileAll } = require('./service/time_service')
    const reconciled = await reconcileAll()
    console.log(`  Task hours synced:   ${reconciled.updated} tasks from the ledger`)

    fs.mkdirSync(path.dirname(MANIFEST), { recursive: true })
    fs.writeFileSync(MANIFEST, JSON.stringify({
        createdAt: new Date().toISOString(),
        entries: entries.map(e => String(e._id)),
        rates: rates.map(r => String(r._id)),
        budgets: budgets.map(b => String(b._id)),
        taskHours: Object.fromEntries(Object.entries(taskHours).map(([k, v]) => [k, Math.round(v * 10) / 10]))
    }, null, 2))

    console.log('\nDone. Open /budget — the forecast leads, the bar supports it.')
    console.log('Undo with: node seed_budget_demo.js --undo')
}

const main = async () => {
    await connectDB()
    if (process.argv.includes('--undo')) await undo()
    else await seed()
    await mongoose.connection.close()
}

main().catch(async (error) => {
    console.error('Budget seed failed:', error.message)
    await mongoose.connection.close().catch(() => {})
    process.exit(1)
})
