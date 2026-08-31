const service = require('../service/task_service')
const mail = require('../service/mail_service')
const objectiveService = require('../service/objective_service')
const { PRIORITIES, STATUSES } = require('../model/task')

// Saves writing try/catch in every handler; errors land on the error handler in server.js instead.
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

// Everything the first page needs in one call: the departments with their counts.
const getBoard = asyncRoute(async (req, res) => {
    const department = req.query.department || null

    const [departments, tasks, objectives] = await Promise.all([
        service.listDepartments(),
        service.listTasks({ department, includeDone: req.query.includeDone !== 'false' }),
        objectiveService.listObjectives()
    ])

    res.json({ departments, tasks, objectives, selected: department })
})

// Fills the dropdowns on the new-task form.
const getFormOptions = asyncRoute(async (req, res) => {
    const [departments, employees, objectives] = await Promise.all([
        service.listDepartments(),
        service.listEmployees(),
        service.listObjectives()
    ])

    res.json({ departments, employees, objectives, priorities: PRIORITIES, statuses: STATUSES })
})

const getTask = asyncRoute(async (req, res) => {
    const task = await service.getTask(req.params.id)
    if (!task) return res.status(404).json({ error: 'That task no longer exists.' })

    const [employees, comments] = await Promise.all([
        service.listEmployees(),
        service.listComments(req.params.id)
    ])

    res.json({ task, employees, comments })
})

const createTask = asyncRoute(async (req, res) => {
    const { title, department, priority, estimateHours } = req.body

    if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'Give the task a title.' })
    }
    if (!department) {
        return res.status(400).json({ error: 'Choose which department this belongs to.' })
    }
    if (priority && !PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: 'That is not a valid priority.' })
    }
    if (estimateHours !== undefined && (Number(estimateHours) <= 0 || Number(estimateHours) > 200)) {
        return res.status(400).json({ error: 'The estimate should be between 1 and 200 hours.' })
    }

    const task = await service.createTask(req.body)
    res.status(201).json({ task })
})

const updateTask = asyncRoute(async (req, res) => {
    if (req.body.status && !STATUSES.includes(req.body.status)) {
        return res.status(400).json({ error: 'That is not a valid status.' })
    }
    if (req.body.priority && !PRIORITIES.includes(req.body.priority)) {
        return res.status(400).json({ error: 'That is not a valid priority.' })
    }

    const Employee = require('../model/employee')
    const person = req.body?.actorId ? await Employee.findById(req.body.actorId).catch(() => null) : null

    const task = await service.updateTask(req.params.id, req.body,
        person ? { id: person._id, name: person.name } : null)
    if (!task) return res.status(404).json({ error: 'That task no longer exists.' })

    res.json({ task })
})

const toggleSubtask = asyncRoute(async (req, res) => {
    const task = await service.toggleSubtask(req.params.id, req.params.subtaskId)
    if (!task) return res.status(404).json({ error: 'That checklist item no longer exists.' })

    res.json({ task })
})

const addSubtask = asyncRoute(async (req, res) => {
    if (!req.body.title || !String(req.body.title).trim()) {
        return res.status(400).json({ error: 'Give the checklist item a name.' })
    }

    const task = await service.addSubtask(req.params.id, req.body.title)
    if (!task) return res.status(404).json({ error: 'That task no longer exists.' })

    res.status(201).json({ task })
})

const deleteTask = asyncRoute(async (req, res) => {
    const removed = await service.deleteTask(req.params.id)
    if (!removed) return res.status(404).json({ error: 'That task no longer exists.' })

    res.json({ ok: true })
})

// --- Questions and comments -------------------------------------------------

const addComment = asyncRoute(async (req, res) => {
    if (!req.body.body || !String(req.body.body).trim()) {
        return res.status(400).json({ error: 'Write something first.' })
    }

    const comment = await service.addComment(req.params.id, req.body)
    res.status(201).json({ comment })
})

// --- Files ------------------------------------------------------------------

const uploadAttachment = asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Choose a file to upload.' })

    const task = await service.getTask(req.params.id)
    if (!task) return res.status(404).json({ error: 'That task no longer exists.' })

    const attachment = await service.addAttachment(req.params.id, req.file)
    res.status(201).json({ attachment })
})

const downloadAttachment = asyncRoute(async (req, res) => {
    const attachment = await service.getAttachment(req.params.fileId)
    if (!attachment) return res.status(404).json({ error: 'That file is no longer available.' })

    res.setHeader('Content-Type', attachment.mimetype)
    // attachment.
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.filename)}"`)
    res.send(attachment.data)
})

const deleteAttachment = asyncRoute(async (req, res) => {
    const removed = await service.deleteAttachment(req.params.id, req.params.fileId)
    if (!removed) return res.status(404).json({ error: 'That file is no longer available.' })

    res.json({ ok: true })
})

// Assignment notifications ----------------------------------------------- Every notice.
const getMailOutbox = asyncRoute(async (req, res) => {
    res.json({
        mail: mail.status(),
        messages: await mail.listMessages({ limit: req.query.limit, employee: req.query.employee })
    })
})

// Pushing a deadline, deliberately and on the record.
const extendDeadline = asyncRoute(async (req, res) => {
    const Employee = require('../model/employee')
    const actorId = req.body?.actorId
    const person = actorId ? await Employee.findById(actorId).catch(() => null) : null
    const actor = person ? { id: person._id, name: person.name } : { id: null, name: 'A manager' }

    const result = await service.extendDeadline(req.params.id, req.body, actor)
    if (!result) return res.status(404).json({ error: 'That task no longer exists.' })
    if (result.error) return res.status(400).json(result)

    res.json({ task: result })
})

// What moving this deadline would cost, before anyone commits to it.
const extendImpact = asyncRoute(async (req, res) => {
    const Task = require('../model/task')
    const budget = require('../service/budget_service')

    const task = await Task.findById(req.params.id).populate('objective', 'title')
    if (!task) return res.status(404).json({ error: 'That task no longer exists.' })
    if (!req.query.dueDate) return res.status(400).json({ error: 'Give the date you are considering.' })

    res.json({ impact: await budget.deadlineImpact(task, req.query.dueDate) })
})

module.exports = {
    extendImpact,
    extendDeadline,
    getMailOutbox,
    getBoard, getFormOptions, getTask, createTask, updateTask,
    toggleSubtask, addSubtask, deleteTask,
    addComment, uploadAttachment, downloadAttachment, deleteAttachment
}
