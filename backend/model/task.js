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

    // Stamped by the service layer as the task moves, so the detail page can
    // show when work actually started and finished rather than only when the
    // record was created. Cleared again if a task is reopened.
    assignedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },

    subtasks: [subtaskSchema],
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }],

    // Every time a deadline moved, who moved it and why.
    //
    // A due date that can be edited silently is not a commitment — the date
    // simply becomes whatever it needs to be, and a project that slipped four
    // times looks identical to one that never slipped at all. Keeping the
    // original alongside each change is what makes "this is the third
    // extension" a visible fact rather than something only the person who did
    // it remembers.
    deadlineChanges: [{
        from: { type: Date },
        to: { type: Date },
        reason: { type: String, default: '', trim: true },
        byId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
        byName: { type: String, default: '', trim: true },
        at: { type: Date, default: Date.now }
    }],

    // Filled in when the task came out of an imported document.
    source: { type: String, enum: ['manual', 'ai'], default: 'manual' },
    aiReason: { type: String, default: '' }
}, { timestamps: true })

// Progress is calculated, never stored. A number somebody typed in drifts from
// reality the moment the checklist changes underneath it.
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
