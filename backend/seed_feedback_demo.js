// Demo data for Employee Feedback & Evaluation.
//
//   node seed_feedback_demo.js          add the demo data
//   node seed_feedback_demo.js --undo   remove exactly what it added
//
// Like the performance seed, this only ever INSERTs and records every id it
// creates, so the undo is a pure delete.
//
// The cast is shaped so each part of the module has something real to show:
// a lenient manager and a severe one for calibration to find, a manager who
// gives everyone the same score, one who writes only trait language, employees
// whose self-assessment disagrees with everyone else's, client feedback tied to
// real projects, and two people with a theme raised by three separate reviewers
// so the agent has a genuine pattern to act on.

require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

const connectDB = require('./config/db')
const Review = require('./model/review')
const Employee = require('./model/employee')
const Objective = require('./model/objective')
const FeedbackSignal = require('./model/feedback_signal')
const AuditEvent = require('./model/audit_event')

const MANIFEST = path.join(__dirname, 'data', 'feedback_demo_manifest.json')
const DAY = 24 * 60 * 60 * 1000

let state = 0x1f2e3d4c
const rnd = () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (list) => list[Math.floor(rnd() * list.length)]
const intBetween = (lo, hi) => Math.round(lo + rnd() * (hi - lo))

const KEYS = ['delivery', 'quality', 'communication', 'collaboration', 'ownership', 'initiative']

// --- Reviewers, each with a deliberate habit --------------------------------
//
//   bias      added to every score they give — what calibration detects as drift
//   spread    how much they vary; near zero means everyone gets the same mark
//   style     'specific' writes evidence, 'trait' describes the person
const MANAGERS = [
    { name: 'Golam Rabbani Shanto', bias: +0.75, spread: 0.5, style: 'specific' },
    { name: 'Farhana Islam', bias: -0.7, spread: 0.6, style: 'specific' },
    { name: 'Mehedi Hasan', bias: +0.1, spread: 0.05, style: 'specific' },
    { name: 'Nusrat Jahan', bias: +0.15, spread: 0.5, style: 'trait' }
]

// Base ability per person, before any reviewer's habit is applied.
const ABILITY = {
    'Rima Sultana': 4.6, 'Moumita Heena': 4.2, 'Golam Rabbani Shanto': 4.3,
    'Sadia Karim': 4.1, 'Nusrat Jahan': 4.0, 'Farhana Islam': 4.0,
    'Mehedi Hasan': 3.7, 'Rahim Uddin': 3.4, 'Karim Chowdhury': 3.0,
    'Shakib Rahman': 3.2, 'Ayan Mahmud': 2.7, 'Sumaiya Akter': 2.4
}

// How each person rates themselves relative to how others see them. The gap is
// the interesting part — over-raters and under-raters need opposite coaching.
const SELF_GAP = {
    'Ayan Mahmud': +1.1, 'Rahim Uddin': +0.8, 'Sumaiya Akter': +0.9,
    'Sadia Karim': -0.7, 'Rima Sultana': -0.4, 'Karim Chowdhury': +0.5
}

// Themes raised repeatedly by different reviewers — what the agent should find.
const WEAK_THEME = {
    'Ayan Mahmud': 'communication',
    'Sumaiya Akter': 'delivery',
    'Karim Chowdhury': 'ownership'
}

const SPECIFIC_STRENGTHS = [
    'Took the client portal migration from spec to release without it slipping, and wrote the rollback note nobody asked for.',
    'Cut the failed webhook retries from 12 a day to zero after the Tuesday outage.',
    'Ran the handover session for the two new engineers, which is why onboarding took a week instead of three.',
    'Caught the timezone bug in review before it reached staging, saving a release rollback.',
    'Rewrote the estimate breakdown so the sprint finished within four hours of plan.'
]

const TRAIT_STRENGTHS = [
    'Great team player with a really positive attitude.',
    'Very dedicated and hard-working. Keep it up.',
    'A talented and reliable member of the team.',
    'Good. Nothing to add.',
    'Always brilliant to work with.'
]

const IMPROVEMENTS = {
    communication: [
        'Updates arrive only when asked for. On the portal work nobody knew the API had changed until it broke the build.',
        'Written updates are hard to follow — three people asked the same question after the last status note.',
        'Needs to flag blockers when they happen rather than at the end of the sprint.'
    ],
    delivery: [
        'Two of the last four items ran past their date without the date being moved.',
        'Estimates are consistently around half the time actually spent, which makes the plan unreliable.',
        'Started three items before finishing the first, so nothing landed for two weeks.'
    ],
    ownership: [
        'Work stops at the handover — the deployment note for the last release had to be chased twice.',
        'Tends to wait for direction on items already assigned to them.',
        'Dropped the follow-up on the accessibility audit after the first pass.'
    ],
    quality: [
        'Three items came back after being marked done, all missing checklist steps.',
        'Tests were skipped on the last two merges and a regression reached staging.'
    ],
    collaboration: [
        'Rarely answers questions on other people\'s tasks even when it is their area.',
        'Kept the schema change to themselves until it affected two other streams.'
    ],
    initiative: [
        'Does what is asked and no more — has not brought a proposal forward this cycle.'
    ]
}

const CLIENT_COMMENTS = [
    'Delivered what we agreed, on the date we agreed. The weekly note meant we never had to ask where things stood.',
    'Good work overall. Two rounds of rework on the reporting screen we would rather have avoided.',
    'Responsive and clear throughout. We would work with this team again.',
    'The build is solid. Communication during the final fortnight went quiet, which made planning our launch harder.'
]

const clamp = (n) => Math.max(1, Math.min(5, Math.round(n * 2) / 2))

const scoreFor = (ability, bias, spread, weakKey, key) => {
    let base = ability + bias + (rnd() - 0.5) * spread * 2
    if (weakKey && key === weakKey) base -= 1.4
    return clamp(base)
}

const readManifest = () => {
    try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) } catch { return null }
}

const undo = async () => {
    const manifest = readManifest()
    if (!manifest) return console.log('No manifest found — nothing to undo.')

    const r = await Review.deleteMany({ _id: { $in: manifest.reviews } })

    // Proposals and log entries are cleared wholesale rather than by id.
    // The agent creates them after this script runs, so they are not in the
    // manifest — and a proposal whose evidence has just been deleted points at
    // nothing. Both collections exist only for this module, so nothing else
    // loses anything.
    const s = await FeedbackSignal.deleteMany({})
    const a = await AuditEvent.deleteMany({})

    fs.unlinkSync(MANIFEST)
    console.log(`Removed ${r.deletedCount} reviews, ${s.deletedCount} agent proposals and ${a.deletedCount} log entries.`)
}

const seed = async () => {
    if (readManifest()) {
        return console.log('Feedback demo data is already in place. Run with --undo first.')
    }

    const [employees, objectives] = await Promise.all([
        Employee.find(),
        Objective.find({ status: { $in: ['active', 'delivered'] } })
    ])
    if (employees.length === 0) throw new Error('No employees found. Run `npm run seed` first.')

    const byName = new Map(employees.map(e => [e.name, e]))
    const managers = MANAGERS.map(m => ({ ...m, doc: byName.get(m.name) })).filter(m => m.doc)
    const now = Date.now()

    const docs = []
    const cycles = ['Q2 2026', 'Q3 2026']

    for (const employee of employees) {
        const ability = ABILITY[employee.name] ?? 3.5
        const weakKey = WEAK_THEME[employee.name] || null

        // --- Manager reviews, one per cycle, from a manager who is not them ---
        for (const cycle of cycles) {
            const manager = pick(managers.filter(m => m.doc.name !== employee.name)) || managers[0]
            const specific = manager.style === 'specific'

            docs.push({
                employee: employee._id,
                source: 'manager',
                reviewer: manager.doc._id,
                reviewerName: manager.doc.name,
                cycle,
                ratings: KEYS.map(key => ({
                    competency: key,
                    score: scoreFor(ability, manager.bias, manager.spread, weakKey, key),
                    note: ''
                })),
                strengths: specific ? pick(SPECIFIC_STRENGTHS) : pick(TRAIT_STRENGTHS),
                improvements: weakKey
                    ? pick(IMPROVEMENTS[weakKey])
                    : (specific ? pick(IMPROVEMENTS[pick(KEYS)] || ['Keep the estimate discipline going.']) : 'Not much to say, doing fine.'),
                comment: specific ? 'Discussed in the cycle one-to-one.' : '',
                status: cycle === 'Q3 2026' && rnd() < 0.45 ? 'submitted' : 'acknowledged',
                createdAt: new Date(now - (cycle === 'Q2 2026' ? intBetween(100, 150) : intBetween(10, 60)) * DAY)
            })
        }

        // --- Peer reviews ---------------------------------------------------
        const peers = employees.filter(e => e.department === employee.department && String(e._id) !== String(employee._id))
        for (const peer of peers.slice(0, 2)) {
            docs.push({
                employee: employee._id,
                source: 'peer',
                reviewer: peer._id,
                reviewerName: peer.name,
                cycle: 'Q3 2026',
                ratings: KEYS.map(key => ({
                    competency: key,
                    score: scoreFor(ability, rnd() * 0.4 - 0.2, 0.55, weakKey, key),
                    note: ''
                })),
                strengths: pick(SPECIFIC_STRENGTHS),
                improvements: weakKey ? pick(IMPROVEMENTS[weakKey]) : pick(IMPROVEMENTS[pick(KEYS)] || ['Nothing blocking.']),
                comment: '',
                status: rnd() < 0.6 ? 'acknowledged' : 'submitted',
                createdAt: new Date(now - intBetween(8, 55) * DAY)
            })
        }

        // --- Self assessment --------------------------------------------------
        const gap = SELF_GAP[employee.name] ?? (rnd() * 0.5 - 0.25)
        docs.push({
            employee: employee._id,
            source: 'self',
            reviewer: employee._id,
            reviewerName: employee.name,
            cycle: 'Q3 2026',
            ratings: KEYS.map(key => ({
                competency: key,
                // A self-assessment does not know about its own weak spot, which
                // is exactly why the self-gap is worth plotting.
                score: clamp(ability + gap + (rnd() - 0.5) * 0.5),
                note: ''
            })),
            strengths: 'Kept my committed work moving and picked up the items nobody else had time for.',
            improvements: 'I would like more time on the deeper technical work next cycle.',
            comment: '',
            status: 'submitted',
            createdAt: new Date(now - intBetween(5, 40) * DAY)
        })
    }

    // --- Client feedback on delivered projects -------------------------------
    // Attached to the people who actually did the work, so it lands on a record
    // rather than in a mailbox.
    const CLIENTS = ['Northwind Retail', 'Meridian Health', 'BlueRiver Logistics', 'Kestrel Media']
    for (const objective of objectives.slice(0, 4)) {
        const client = pick(CLIENTS)
        const contributors = employees.filter(() => rnd() < 0.3).slice(0, 3)

        for (const person of contributors) {
            const ability = ABILITY[person.name] ?? 3.5
            docs.push({
                employee: person._id,
                source: 'client',
                reviewer: null,
                clientName: client,
                objective: objective._id,
                cycle: 'Q3 2026',
                ratings: ['delivery', 'quality', 'communication'].map(key => ({
                    competency: key,
                    score: scoreFor(ability, 0.1, 0.5, WEAK_THEME[person.name] || null, key),
                    note: ''
                })),
                strengths: pick(CLIENT_COMMENTS),
                improvements: WEAK_THEME[person.name]
                    ? pick(IMPROVEMENTS[WEAK_THEME[person.name]])
                    : 'Nothing significant — happy with how it went.',
                comment: `Feedback received at handover of "${objective.title}".`,
                status: rnd() < 0.5 ? 'acknowledged' : 'submitted',
                createdAt: new Date(now - intBetween(6, 50) * DAY)
            })
        }
    }

    // insertMany skips the pre-save hook, so the overall score is computed here.
    for (const doc of docs) {
        const sum = doc.ratings.reduce((total, r) => total + r.score, 0)
        doc.overall = Math.round((sum / doc.ratings.length) * 100) / 100
        if (doc.status !== 'draft') doc.submittedAt = doc.createdAt
        if (doc.status === 'acknowledged') {
            doc.acknowledgedAt = new Date(doc.createdAt.getTime() + intBetween(1, 6) * DAY)
        }
    }

    const created = await Review.insertMany(docs, { timestamps: false })
    console.log(`  Reviews inserted:  ${created.length}`)

    const bySource = created.reduce((acc, r) => { acc[r.source] = (acc[r.source] || 0) + 1; return acc }, {})
    console.log('  By source:        ', Object.entries(bySource).map(([k, v]) => `${k} ${v}`).join(' · '))

    fs.mkdirSync(path.dirname(MANIFEST), { recursive: true })
    fs.writeFileSync(MANIFEST, JSON.stringify({
        createdAt: new Date().toISOString(),
        reviews: created.map(r => String(r._id)),
        signals: [],
        audit: []
    }, null, 2))

    console.log('\nDone. Now run the agent so it can find the recurring themes:')
    console.log('  curl -X POST http://localhost:5000/api/feedback/agent/scan')
    console.log('  (or press "Run the agent" on the Feedback page)')
    console.log('\nUndo everything with: node seed_feedback_demo.js --undo')
}

const main = async () => {
    await connectDB()
    if (process.argv.includes('--undo')) await undo()
    else await seed()
    await mongoose.connection.close()
}

main().catch(async (error) => {
    console.error('Feedback seed failed:', error.message)
    await mongoose.connection.close().catch(() => {})
    process.exit(1)
})
