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

// Telling somebody work has landed on them.
//
// Deliberately fired after the write has succeeded and never awaited by the
// caller in a way that could fail it: a task that is genuinely assigned must not
// come back as an error because a mail server was slow. Failures are recorded in
// the outbox instead, where they can be seen and retried.
const announce = async (taskIds) => {
    if (!taskIds || taskIds.length === 0) return

    try {
        const mail = require('./mail_service')
        const tasks = await Task.find({ _id: { $in: taskIds }, assignee: { $ne: null } })
            .populate('assignee', 'name email department')
            .populate('objective', 'title')

        await mail.notifyAssignments(tasks)
    } catch (error) {
        console.error('[mail] could not send assignment notice:', error.message)
    }
}

const createTask = async (input) => {
    const task = await Task.create(buildTaskDocument(input))
    if (task.assignee) await announce([task._id])
    return getTask(task._id)
}

// Used when a whole plan is accepted from an imported document, so the lot
// lands as one action rather than a dozen separate saves.
//
// The notice goes out once the whole batch is written, which is what makes a
// nine-task import arrive as one email per person rather than nine.
const createManyTasks = async (inputs) => {
    const created = await Task.insertMany(inputs.map(buildTaskDocument))
    await announce(created.filter(t => t.assignee).map(t => t._id))
    return created.length
}

// Moving a deadline, on the record.
//
// A manager can already change `dueDate` through the ordinary edit path, and
// that is fine for correcting a typo. This is the deliberate version: it keeps
// the date it moved from, who moved it, and why, so a task that has been pushed
// three times says so on its own face.
//
// The assignee is told, because a deadline that moves without the person
// working to it hearing about it is how work gets done to the wrong date.
const extendDeadline = async (id, { dueDate, reason } = {}, actor) => {
    const task = await Task.findById(id)
    if (!task) return null

    if (!dueDate) return { error: 'Choose the new date first.' }

    const next = new Date(dueDate)
    if (Number.isNaN(next.getTime())) return { error: 'That is not a date I can read.' }

    const previous = task.dueDate ? new Date(task.dueDate) : null
    if (previous && next.getTime() === previous.getTime()) {
        return { error: 'That is already the deadline.' }
    }

    task.deadlineChanges.push({
        from: previous,
        to: next,
        reason: (reason || '').trim(),
        byId: actor?.id || null,
        byName: actor?.name || 'A manager',
        at: new Date()
    })
    task.dueDate = next
    await task.save()

    try {
        const mail = require('./mail_service')
        const full = await Task.findById(id)
            .populate('assignee', 'name email department')
            .populate('objective', 'title')

        if (full?.assignee?.email) {
            const moved = previous
                ? (next > previous ? 'pushed back' : 'brought forward')
                : 'set'
            await mail.notifyDeadlineChange(full, { previous, reason, actor, moved })
        }
    } catch (error) {
        console.error('[mail] could not send deadline notice:', error.message)
    }

    return getTask(id)
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

const updateTask = async (id, changes, actor) => {
    const task = await Task.findById(id)
    if (!task) return null

    // Noted before the change so a reassignment can be told apart from an edit
    // to a task that was already theirs — only the former is worth an email.
    const previousAssignee = task.assignee ? String(task.assignee) : null
    const previousDue = task.dueDate ? new Date(task.dueDate) : null

    for (const key of EDITABLE) {
        if (key in changes) task[key] = changes[key]
    }

    // These two carry a different name on the wire than in the schema.
    if ('assigneeId' in changes) task.assignee = changes.assigneeId || null
    if ('objectiveId' in changes) task.objective = changes.objectiveId || null

    // Ticking the first checklist item should move the task off "to do",
    // otherwise the orbit and the task page disagree with each other.
    if (task.status === 'todo' && task.subtasks.some(s => s.done)) task.status = 'in_progress'

    // A deadline moved through the ordinary edit path still gets recorded.
    //
    // Without this the audit trail had a hole straight through it: `dueDate` is
    // an editable field, so anyone could move a date with a plain PATCH and
    // leave no trace, which makes the extension history worth exactly nothing.
    // The reason is empty here because none was asked for — and that absence is
    // itself worth seeing on the record.
    const nextDue = task.dueDate ? new Date(task.dueDate) : null
    const dueMoved = (previousDue?.getTime() ?? null) !== (nextDue?.getTime() ?? null)

    if (dueMoved && 'dueDate' in changes) {
        task.deadlineChanges.push({
            from: previousDue,
            to: nextDue,
            reason: '',
            byId: actor?.id || null,
            byName: actor?.name || 'Edited directly',
            at: new Date()
        })
    }

    stampDates(task)
    await task.save()

    // Only when the work has genuinely moved to somebody new — editing a title
    // on a task somebody already owns is not worth an email.
    const nowAssignee = task.assignee ? String(task.assignee) : null
    if (nowAssignee && nowAssignee !== previousAssignee) await announce([task._id])
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
    createTask, createManyTasks, updateTask, extendDeadline, toggleSubtask, addSubtask, deleteTask,
    listComments, addComment,
    addAttachment, getAttachment, deleteAttachment,
    decorate
}
