const reviews = require('../service/review_service')
const calibration = require('../service/calibration_service')
const reconciliation = require('../service/reconciliation_service')
const agent = require('../service/feedback_agent')
const audit = require('../service/audit_service')
const Employee = require('../model/employee')
const Objective = require('../model/objective')
const Review = require('../model/review')
const FeedbackSignal = require('../model/feedback_signal')

// HTTP only. Every calculation lives in the services.

const asyncRoute = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next)

// Who is doing this.
//
// The project has no login yet, so the acting person arrives with the request
// and the interface makes you choose one. That is honest for a prototype, and it
// keeps the audit trail meaningful: every approval is still attributed to a
// named human rather than to "the system". When authentication lands, this is
// the one function that changes.
const actorFrom = async (req) => {
    const id = req.body?.actorId || req.query?.actorId
    if (!id) return { id: null, name: 'Unassigned user' }

    const employee = await Employee.findById(id).catch(() => null)
    return employee
        ? { id: employee._id, name: employee.name, department: employee.department }
        : { id: null, name: 'Unassigned user' }
}

// --- Context for the forms ---------------------------------------------------

const getMeta = asyncRoute(async (req, res) => {
    const [people, objectives, cycles] = await Promise.all([
        Employee.find({ isActive: true }).sort({ name: 1 }).select('name jobTitle department color'),
        Objective.find().sort({ createdAt: -1 }).select('title status'),
        Review.distinct('cycle')
    ])

    res.json({
        competencies: reviews.COMPETENCIES,
        sources: reviews.SOURCES,
        employees: people.map(p => ({
            id: String(p._id), name: p.name, jobTitle: p.jobTitle,
            department: p.department, color: p.color,
            initials: p.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
        })),
        objectives: objectives.map(o => ({ id: String(o._id), title: o.title, status: o.status })),
        cycles: [...new Set(cycles.filter(Boolean))].sort().reverse(),
        currentCycle: reviews.defaultCycle()
    })
})

// --- Dashboard ---------------------------------------------------------------

const getOverview = asyncRoute(async (req, res) => {
    const [all, pending, signals, trail] = await Promise.all([
        reviews.listReviews({ limit: 500 }),
        reviews.pendingAfterDelivery(),
        agent.listSignals(),
        audit.list({ limit: 12 })
    ])

    const submitted = all.filter(r => r.status !== 'draft')
    const scored = submitted.filter(r => r.overall !== null)

    const bySource = reviews.SOURCES.map(source => {
        const mine = submitted.filter(r => r.source === source)
        const scores = mine.filter(r => r.overall !== null).map(r => r.overall)
        return {
            source,
            count: mine.length,
            average: scores.length ? reviews.round(reviews.mean(scores), 2) : null
        }
    })

    // Everyone who has a review, with their headline numbers — the entry point
    // into an individual record.
    const people = new Map()
    for (const review of submitted) {
        if (!review.employee) continue
        const key = review.employeeId
        if (!people.has(key)) people.set(key, { ...review.employee, reviews: [], sources: new Set() })
        people.get(key).reviews.push(review)
        people.get(key).sources.add(review.source)
    }

    const roster = [...people.values()].map(p => {
        const scores = p.reviews.filter(r => r.overall !== null).map(r => r.overall)
        return {
            id: p.id, name: p.name, jobTitle: p.jobTitle, department: p.department, color: p.color,
            initials: p.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''),
            reviewCount: p.reviews.length,
            sourceCount: p.sources.size,
            sources: [...p.sources],
            average: scores.length ? reviews.round(reviews.mean(scores), 2) : null,
            unread: p.reviews.filter(r => r.status === 'submitted').length,
            lastAt: p.reviews[0]?.submittedAt || p.reviews[0]?.createdAt || null
        }
    }).sort((a, b) => (b.average ?? 0) - (a.average ?? 0))

    res.json({
        summary: {
            total: submitted.length,
            drafts: all.length - submitted.length,
            averageOverall: scored.length ? reviews.round(reviews.mean(scored.map(r => r.overall)), 2) : null,
            unacknowledged: submitted.filter(r => r.status === 'submitted').length,
            peopleCovered: roster.length,
            clientReviews: submitted.filter(r => r.source === 'client').length,
            openProposals: signals.filter(s => s.status === 'proposed').length
        },
        bySource,
        roster,
        pendingAfterDelivery: pending,
        signals: signals.filter(s => s.status === 'proposed').slice(0, 6),
        recent: submitted.slice(0, 8),
        trail
    })
})

// --- Reviews -----------------------------------------------------------------

const listReviews = asyncRoute(async (req, res) => {
    res.json({ reviews: await reviews.listReviews(req.query) })
})

const getReview = asyncRoute(async (req, res) => {
    const review = await reviews.getReview(req.params.id)
    if (!review) return res.status(404).json({ error: 'That review no longer exists.' })
    res.json({ review })
})

const createReview = asyncRoute(async (req, res) => {
    if (!req.body.employee) return res.status(400).json({ error: 'Choose who the review is about.' })
    if (!req.body.source) return res.status(400).json({ error: 'Choose where the feedback is coming from.' })
    if (req.body.source === 'client' && !req.body.clientName) {
        return res.status(400).json({ error: 'Client feedback needs the client\'s name.' })
    }

    const actor = await actorFrom(req)
    const review = await reviews.createReview(req.body, actor)
    res.status(201).json({ review })
})

const updateReview = asyncRoute(async (req, res) => {
    const actor = await actorFrom(req)
    const review = await reviews.updateReview(req.params.id, req.body, actor)
    if (!review) return res.status(404).json({ error: 'That review no longer exists.' })
    res.json({ review })
})

const acknowledgeReview = asyncRoute(async (req, res) => {
    const actor = await actorFrom(req)
    const result = await reviews.acknowledgeReview(req.params.id, req.body, actor)
    if (!result) return res.status(404).json({ error: 'That review no longer exists.' })
    if (result.error) return res.status(400).json(result)
    res.json({ review: result })
})

const deleteReview = asyncRoute(async (req, res) => {
    const removed = await reviews.deleteReview(req.params.id)
    if (!removed) return res.status(404).json({ error: 'That review no longer exists.' })
    res.json({ ok: true })
})

// --- One person's record -----------------------------------------------------

const getEmployee = asyncRoute(async (req, res) => {
    const dossier = await reviews.employeeDossier(req.params.id)
    if (!dossier) return res.status(404).json({ error: 'That employee is not on the roster.' })

    const signals = await agent.listSignals({ employee: req.params.id })
    res.json({ ...dossier, signals })
})

// --- Calibration -------------------------------------------------------------

const getCalibration = asyncRoute(async (req, res) => {
    res.json(await calibration.calibration({ cycle: req.query.cycle }))
})

// --- Record against reviewers -------------------------------------------------

// The one endpoint in this module that reads the performance module. It is a
// read, never a write: this asks Module 4 what its own score says and puts it
// beside what people said, without either module owning the other.
const getReconciliation = asyncRoute(async (req, res) => {
    res.json(await reconciliation.reconcile({ department: req.query.department }))
})

// --- The agent ---------------------------------------------------------------

const runScan = asyncRoute(async (req, res) => {
    const result = await agent.scan({ employee: req.body?.employee })
    const signals = await agent.listSignals({ status: 'proposed' })
    res.json({ ...result, signals })
})

const listSignals = asyncRoute(async (req, res) => {
    res.json({ signals: await agent.listSignals(req.query) })
})

const approveSignal = asyncRoute(async (req, res) => {
    const actor = await actorFrom(req)
    if (!actor.id) return res.status(400).json({ error: 'Choose who is approving this before it goes ahead.' })

    const result = await agent.approveSignal(req.params.id, req.body, actor)
    if (!result) return res.status(404).json({ error: 'That proposal no longer exists.' })
    if (result.error) return res.status(400).json(result)
    res.json({ signal: result })
})

const dismissSignal = asyncRoute(async (req, res) => {
    const actor = await actorFrom(req)
    if (!actor.id) return res.status(400).json({ error: 'Choose who is dismissing this before it goes ahead.' })

    const result = await agent.dismissSignal(req.params.id, req.body, actor)
    if (!result) return res.status(404).json({ error: 'That proposal no longer exists.' })
    if (result.error) return res.status(400).json(result)
    res.json({ signal: result })
})

// --- Trust log ---------------------------------------------------------------

const getAudit = asyncRoute(async (req, res) => {
    res.json({
        events: await audit.list({ limit: req.query.limit, subjectId: req.query.subjectId }),
        counts: {
            proposed: await FeedbackSignal.countDocuments({ status: 'proposed' }),
            approved: await FeedbackSignal.countDocuments({ status: 'approved' }),
            dismissed: await FeedbackSignal.countDocuments({ status: 'dismissed' })
        }
    })
})

module.exports = {
    getMeta, getOverview,
    listReviews, getReview, createReview, updateReview, acknowledgeReview, deleteReview,
    getEmployee, getCalibration, getReconciliation,
    runScan, listSignals, approveSignal, dismissSignal,
    getAudit
}
