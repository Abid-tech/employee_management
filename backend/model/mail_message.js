const mongoose = require('mongoose')

// Every notification the system produced, whether or not a mail server was configured to carry it.

const STATUSES = ['queued', 'sent', 'failed']

const mailSchema = new mongoose.Schema({
    to: { type: String, required: true, trim: true },
    toName: { type: String, default: '', trim: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },

    subject: { type: String, required: true, trim: true },
    text: { type: String, default: '' },
    html: { type: String, default: '' },

    kind: { type: String, default: 'task_assignment', index: true },

    // The tasks this message was about.
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    taskCount: { type: Number, default: 0 },

    status: { type: String, enum: STATUSES, default: 'queued', index: true },
    // 'smtp' when a real server carried it, 'outbox' when it was recorded only.
    transport: { type: String, default: 'outbox' },
    error: { type: String, default: '' },
    sentAt: { type: Date }
}, { timestamps: true })

mailSchema.index({ createdAt: -1 })

module.exports = mongoose.model('MailMessage', mailSchema)
module.exports.STATUSES = STATUSES
