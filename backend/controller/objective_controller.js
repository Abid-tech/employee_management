const service = require('../service/objective_service')
const { STATUSES } = require('../model/objective')

const asyncRoute = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next)

const listObjectives = asyncRoute(async (req, res) => {
    const objectives = await service.listObjectives()
    res.json({ objectives, statuses: STATUSES })
})

const getObjective = asyncRoute(async (req, res) => {
    const found = await service.getObjective(req.params.id)
    if (!found) return res.status(404).json({ error: 'That project no longer exists.' })

    res.json(found)
})

const createObjective = asyncRoute(async (req, res) => {
    if (!req.body.title || !String(req.body.title).trim()) {
        return res.status(400).json({ error: 'Give the project a name.' })
    }
    if (req.body.status && !STATUSES.includes(req.body.status)) {
        return res.status(400).json({ error: 'That is not a valid project status.' })
    }

    const objective = await service.createObjective(req.body)
    res.status(201).json({ objective })
})

const updateObjective = asyncRoute(async (req, res) => {
    if (req.body.status && !STATUSES.includes(req.body.status)) {
        return res.status(400).json({ error: 'That is not a valid project status.' })
    }

    const objective = await service.updateObjective(req.params.id, req.body)
    if (!objective) return res.status(404).json({ error: 'That project no longer exists.' })

    res.json({ objective })
})

// The tasks survive; they are only released back to their departments.
const deleteObjective = asyncRoute(async (req, res) => {
    const removed = await service.deleteObjective(req.params.id)
    if (!removed) return res.status(404).json({ error: 'That project no longer exists.' })

    res.json({ ok: true })
})

module.exports = { listObjectives, getObjective, createObjective, updateObjective, deleteObjective }
