const mongoose = require('mongoose')

const PRIORITIES = ['critical', 'high', 'medium', 'low']
const STATUSES = ['todo', 'in_progress', 'review', 'done']

const subtaskSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
    completedAt: { type: Date }
}, { _id: true })

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    department: { type: String, required: true, trim: true, index: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    objective: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective', default: null },
    priority: { type: String, enum: PRIORITIES, default: 'medium', index: true },
    status: { type: String, enum: STATUSES, default: 'todo', index: true },
    estimateHours: { type: Number, default: 4, min: 0 },
    spentHours: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date },
    assignedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    subtasks: [subtaskSchema],
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }],
    source: { type: String, enum: ['manual', 'ai'], default: 'manual' },
    aiReason: { type: String, default: '' }
}, { timestamps: true })

taskSchema.methods.progressPercent = function () {
    if (this.status === 'done') return 100
    if (this.subtasks.length > 0) {
        const done = this.subtasks.filter(s => s.done).length
        return Math.round((done / this.subtasks.length) * 100)
    }
    return { todo: 0, in_progress: 40, review: 80, done: 100 }[this.status] ?? 0
}

module.exports = mongoose.model('Task', taskSchema)
module.exports.PRIORITIES = PRIORITIES
module.exports.STATUSES = STATUSES
