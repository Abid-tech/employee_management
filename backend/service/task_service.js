const Task = require('../model/task')
const Employee = require('../model/employee')
const Department = require('../model/department')
const Objective = require('../model/objective')
const Comment = require('../model/comment')
const Attachment = require('../model/attachment')

// All database access for Module 3 lives here, so the controllers stay about
// HTTP and never build a query themselves.

const ASSIGNEE_FIELDS = 'name email jobTitle department color skills'

// --- Calculated fields ------------------------------------------------------
// Worked out on read rather than stored, so they can never disagree with the
// checklist underneath them.

// Whole days between now and the deadline. Negative once the date has passed,
// and zero for the whole of the day something is due.
const daysUntil = (dueDate) =>
    dueDate ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

// The one definition of "late", used by both the per-task fields and the
// department counts. They were worked out separately before, and disagreed: a
// raw `dueDate < now` calls a task late from one minute past midnight on the
// day it is due, while the task list is still calling it "due today". A task is
// late only once its day has fully passed.
const isOverdue = (task) => {
    if (task.status === 'done') return false
    const days = daysUntil(task.dueDate)
    return days !== null && days < 0
}

const decorate = (doc) => {
    const task = doc.toObject ? doc.toObject() : { ...doc }

    const progress = doc.progressPercent
        ? doc.progressPercent()
        : (task.status === 'done' ? 100 : 0)

    const daysLeft = daysUntil(task.dueDate)

    return {
        ...task,
        id: task._id.toString(),
        assigneeId: task.assignee?._id ? task.assignee._id.toString() : (task.assignee ? task.assignee.toString() : null),
        objectiveId: task.objective?._id ? task.objective._id.toString() : (task.objective ? task.objective.toString() : null),
        subtasks: (task.subtasks || []).map(s => ({ ...s, id: s._id.toString() })),
        progress,
        daysLeft,
        overdue: isOverdue(task),
        remainingHours: Math.round((task.estimateHours || 0) * (1 - progress / 100) * 10) / 10,
        subtasksDone: (task.subtasks || []).filter(s => s.done).length
    }
}

// --- Reads ------------------------------------------------------------------

const listTasks = async ({ department, includeDone = true } = {}) => {
    const filter = {}
    if (department) filter.department = department
    if (!includeDone) filter.status = { $ne: 'done' }

    const tasks = await Task.find(filter)
        .populate('assignee', ASSIGNEE_FIELDS)
        .populate('objective', 'title')
        .sort({ createdAt: -1 })

    return tasks.map(decorate)
}

const getTask = async (id) => {
    const task = await Task.findById(id)
        .populate('assignee', ASSIGNEE_FIELDS)
        .populate('objective', 'title')
        .populate('attachments', 'filename mimetype size createdAt')

    return task ? decorate(task) : null
}

// Per-department counts for the switcher on page 1.
const listDepartments = async () => {
    const [departments, tasks, employees] = await Promise.all([
        Department.find().sort({ name: 1 }),
        Task.find().select('department status priority dueDate subtasks estimateHours'),
        Employee.find({ isActive: true }).select('department')
    ])

    return departments.map(department => {
        const own = tasks.filter(task => task.department === department.name)
        const open = own.filter(task => task.status !== 'done')

        return {
            name: department.name,
            mark: department.mark,
            blurb: department.blurb,
            taskCount: own.length,
            openCount: open.length,
            overdueCount: open.filter(isOverdue).length,
            criticalCount: open.filter(task => task.priority === 'critical').length,
            people: employees.filter(person => person.department === department.name).length
        }
    })
}

const listEmployees = () => Employee.find({ isActive: true }).select(ASSIGNEE_FIELDS).sort({ name: 1 }).lean()
const listObjectives = () => Objective.find().select('title').sort({ createdAt: -1 }).lean()

// --- Writes -----------------------------------------------------------------

const buildTaskDocument = (input) => ({
    title: String(input.title).trim(),
    description: input.description || '',
    department: input.department,
    assignee: input.assigneeId || null,
    objective: input.objectiveId || null,
    priority: input.priority || 'medium',
    status: input.status || 'todo',
    estimateHours: Number(input.estimateHours) > 0 ? Number(input.estimateHours) : 4,
    dueDate: input.dueDate || null,
    subtasks: (input.subtasks || [])
        .map(title => String(title).trim())
        .filter(Boolean)
        .map(title => ({ title, done: false })),
    source: input.source || 'manual',
    aiReason: input.aiReason || '',

    // Set here as well as in stampDates, because createManyTasks goes through
    // insertMany, which writes straight to the driver and runs no document code.
    assignedAt: input.assigneeId ? new Date() : undefined
})

const createTask = async (input) => {
    const task = await Task.create(buildTaskDocument(input))
    return getTask(task._id)
}

// Used when a whole plan is accepted from an imported document, so the lot
// lands as one action rather than a dozen separate saves.
const createManyTasks = async (inputs) => {
    const created = await Task.insertMany(inputs.map(buildTaskDocument))
    return created.length
}

const EDITABLE = ['title', 'description', 'department', 'priority', 'status', 'estimateHours', 'spentHours', 'dueDate']

// Keeps the three timestamps honest wherever a task's status moves — from an
// edit, from a checklist item being ticked, or from "Mark done". Written in one
// place so the dates cannot depend on which route happened to change the task.
//
// Reopening a finished task clears completedAt rather than leaving a completion
// date on work that is running again.
const stampDates = (task) => {
    const now = new Date()

    if (task.assignee && !task.assignedAt) task.assignedAt = now
    if (!task.assignee) task.assignedAt = undefined

    if (task.status !== 'todo' && !task.startedAt) task.startedAt = now
    if (task.status === 'todo') task.startedAt = undefined

    if (task.status === 'done' && !task.completedAt) task.completedAt = now
    if (task.status !== 'done') task.completedAt = undefined
}

const updateTask = async (id, changes) => {
    const task = await Task.findById(id)
    if (!task) return null

    for (const key of EDITABLE) {
        if (key in changes) task[key] = changes[key]
    }

    // These two carry a different name on the wire than in the schema.
    if ('assigneeId' in changes) task.assignee = changes.assigneeId || null
    if ('objectiveId' in changes) task.objective = changes.objectiveId || null

    // Ticking the first checklist item should move the task off "to do",
    // otherwise the orbit and the task page disagree with each other.
    if (task.status === 'todo' && task.subtasks.some(s => s.done)) task.status = 'in_progress'

    stampDates(task)
    await task.save()
    return getTask(task._id)
}

const toggleSubtask = async (taskId, subtaskId) => {
    const task = await Task.findById(taskId)
    if (!task) return null

    const subtask = task.subtasks.id(subtaskId)
    if (!subtask) return null

    subtask.done = !subtask.done
    subtask.completedAt = subtask.done ? new Date() : undefined

    if (task.status === 'todo' && task.subtasks.some(s => s.done)) task.status = 'in_progress'
    if (task.subtasks.length > 0 && task.subtasks.every(s => s.done) && task.status !== 'done') {
        task.status = 'review'
    }

    stampDates(task)
    await task.save()
    return getTask(task._id)
}

const addSubtask = async (taskId, title) => {
    const task = await Task.findById(taskId)
    if (!task) return null

    task.subtasks.push({ title: String(title).trim(), done: false })
    await task.save()
    return getTask(task._id)
}

const deleteTask = async (id) => {
    const task = await Task.findByIdAndDelete(id)
    if (!task) return false

    // The thread and the files belong to the task; nothing should outlive it.
    await Promise.all([
        Comment.deleteMany({ task: id }),
        Attachment.deleteMany({ task: id })
    ])

    return true
}

// --- Discussion -------------------------------------------------------------

const listComments = (taskId) =>
    Comment.find({ task: taskId }).populate('author', 'name color jobTitle').sort({ createdAt: 1 }).lean()

const addComment = async (taskId, { body, kind, authorId, authorName, replyTo }) => {
    const comment = await Comment.create({
        task: taskId,
        author: authorId || null,
        authorName: authorName || 'Someone',
        body: String(body).trim(),
        kind: kind === 'question' ? 'question' : 'comment',
        replyTo: replyTo || null
    })

    // An answer closes the question it replies to.
    if (replyTo) await Comment.findByIdAndUpdate(replyTo, { resolved: true })

    return Comment.findById(comment._id).populate('author', 'name color jobTitle').lean()
}

// --- Files ------------------------------------------------------------------

const addAttachment = async (taskId, file) => {
    const attachment = await Attachment.create({
        task: taskId,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        data: file.buffer
    })

    await Task.findByIdAndUpdate(taskId, { $push: { attachments: attachment._id } })

    return {
        _id: attachment._id,
        filename: attachment.filename,
        mimetype: attachment.mimetype,
        size: attachment.size,
        createdAt: attachment.createdAt
    }
}

const getAttachment = (fileId) => Attachment.findById(fileId).select('+data')

const deleteAttachment = async (taskId, fileId) => {
    const removed = await Attachment.findByIdAndDelete(fileId)
    if (!removed) return false

    await Task.findByIdAndUpdate(taskId, { $pull: { attachments: fileId } })
    return true
}

module.exports = {
    listTasks, getTask, listDepartments, listEmployees, listObjectives,
    createTask, createManyTasks, updateTask, toggleSubtask, addSubtask, deleteTask,
    listComments, addComment,
    addAttachment, getAttachment, deleteAttachment,
    decorate
}
