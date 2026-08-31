const Objective = require('../model/objective')
const Task = require('../model/task')
const { decorate } = require('./task_service')

// Everything about projects.

const ASSIGNEE_FIELDS = 'name email jobTitle department color'

// --- The rollup -------------------------------------------------------------

// Progress is weighted by estimated hours rather than counted per task.
const rollUp = (tasks) => {
    const open = tasks.filter(task => task.status !== 'done')
    const totalHours = tasks.reduce((sum, task) => sum + (task.estimateHours || 0), 0)

    const progress = tasks.length === 0
        ? 0
        : totalHours > 0
            ? Math.round(tasks.reduce((sum, task) => sum + task.progress * (task.estimateHours || 0), 0) / totalHours)
            : Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length)

    const dated = tasks.filter(task => task.dueDate).map(task => new Date(task.dueDate))
    const completions = tasks.filter(task => task.completedAt).map(task => new Date(task.completedAt))

    // The day the project is really working towards: the last thing due.
    const lastDue = dated.length ? new Date(Math.max(...dated)) : null

    return {
        taskCount: tasks.length,
        doneCount: tasks.filter(task => task.status === 'done').length,
        openCount: open.length,
        overdueCount: open.filter(task => task.overdue).length,
        unassignedCount: open.filter(task => !task.assignee).length,
        blockedCount: open.filter(task => task.priority === 'critical').length,

        progress,
        estimatedHours: Math.round(totalHours),
        remainingHours: Math.round(open.reduce((sum, task) => sum + (task.remainingHours || 0), 0)),

        departments: [...new Set(tasks.map(task => task.department))].sort(),
        people: [...new Map(
            tasks.filter(task => task.assignee)
                .map(task => [String(task.assignee._id || task.assignee), task.assignee])
        ).values()],

        lastDueDate: lastDue,
        lastCompletedAt: completions.length ? new Date(Math.max(...completions)) : null,
        firstStartedAt: (() => {
            const started = tasks.filter(t => t.startedAt).map(t => new Date(t.startedAt))
            return started.length ? new Date(Math.min(...started)) : null
        })(),

        byStatus: ['todo', 'in_progress', 'review', 'done'].reduce((acc, status) => {
            acc[status] = tasks.filter(task => task.status === status).length
            return acc
        }, {}),

        byDepartment: [...new Set(tasks.map(task => task.department))].sort().map(name => ({
            name,
            total: tasks.filter(task => task.department === name).length,
            done: tasks.filter(task => task.department === name && task.status === 'done').length
        }))
    }
}

// A project is late if anything in it is late, or its own target has passed with work still open.
const healthOf = (objective, stats) => {
    if (stats.taskCount === 0) return 'empty'
    if (stats.doneCount === stats.taskCount) return 'delivered'

    const targetPassed = objective.dueDate && new Date(objective.dueDate) < new Date()
    if (stats.overdueCount > 0 || targetPassed) return 'late'
    if (stats.unassignedCount > 0) return 'unowned'
    return 'on_track'
}

const shape = (objective, tasks) => {
    const plain = objective.toObject ? objective.toObject() : { ...objective }
    const stats = rollUp(tasks)

    return {
        ...plain,
        id: plain._id.toString(),
        ...stats,
        health: healthOf(plain, stats)
    }
}

// --- Reads ------------------------------------------------------------------

// One query for every task rather than one per project.
const listObjectives = async () => {
    const [objectives, tasks] = await Promise.all([
        Objective.find().sort({ createdAt: -1 }),
        Task.find().populate('assignee', ASSIGNEE_FIELDS)
    ])

    const decorated = tasks.map(decorate)

    return objectives.map(objective => shape(
        objective,
        decorated.filter(task => task.objectiveId === objective._id.toString())
    ))
}

const getObjective = async (id) => {
    const objective = await Objective.findById(id)
    if (!objective) return null

    const tasks = await Task.find({ objective: id })
        .populate('assignee', ASSIGNEE_FIELDS)
        .sort({ createdAt: 1 })

    const decorated = tasks.map(decorate)

    return { objective: shape(objective, decorated), tasks: decorated }
}

// --- Writes -----------------------------------------------------------------

const EDITABLE = ['title', 'description', 'client', 'status', 'startDate', 'dueDate']

const createObjective = async (input) => {
    const objective = await Objective.create({
        title: String(input.title).trim(),
        description: input.description || '',
        client: input.client || '',
        status: input.status || 'active',
        startDate: input.startDate || new Date(),
        dueDate: input.dueDate || null,
        source: input.source || 'manual',
        sourceDocument: input.sourceDocument || '',
        summary: input.summary || ''
    })

    return objective
}

const updateObjective = async (id, changes) => {
    const objective = await Objective.findById(id)
    if (!objective) return null

    for (const key of EDITABLE) {
        if (key in changes) objective[key] = changes[key] || null
    }

    await objective.save()
    const full = await getObjective(id)
    return full.objective
}

// Deleting a project must not delete the work.
const deleteObjective = async (id) => {
    const removed = await Objective.findByIdAndDelete(id)
    if (!removed) return false

    await Task.updateMany({ objective: id }, { $set: { objective: null } })
    return true
}

module.exports = {
    listObjectives, getObjective, createObjective, updateObjective, deleteObjective, rollUp
}
