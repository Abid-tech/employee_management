const mongoose = require('mongoose')

// A proposal the agent wants to make, and the record of who decided on it.

const STATUSES = ['proposed', 'approved', 'dismissed']
const KINDS = ['objective', 'task']

const signalSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },

    // What kept coming up.
    theme: { type: String, required: true, trim: true },
    competency: { type: String, default: '', trim: true },

    // Every review that contributed.
    evidence: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    occurrences: { type: Number, default: 0 },
    averageScore: { type: Number },

    // Plain English, written for the manager rather than for a log file.
    rationale: { type: String, default: '', trim: true },
    severity: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },

    // The draft itself.
    proposal: {
        kind: { type: String, enum: KINDS, default: 'objective' },
        title: { type: String, default: '', trim: true },
        description: { type: String, default: '', trim: true },
        department: { type: String, default: '', trim: true },
        priority: { type: String, default: 'medium' },
        estimateHours: { type: Number, default: 8 },
        dueInDays: { type: Number, default: 30 }
    },

    status: { type: String, enum: STATUSES, default: 'proposed', index: true },

    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    decidedByName: { type: String, default: '', trim: true },
    decidedAt: { type: Date },
    decisionNote: { type: String, default: '', trim: true },

    // Set once approved.
    createdRef: { type: mongoose.Schema.Types.ObjectId, default: null },

    // Which engine produced this.
    engine: { type: String, default: 'rules' },

    // Lets a re-run recognise a theme it has already raised instead of stacking duplicates every time.
    fingerprint: { type: String, index: true }
}, { timestamps: true })

signalSchema.index({ employee: 1, status: 1 })

module.exports = mongoose.model('FeedbackSignal', signalSchema)
module.exports.STATUSES = STATUSES
module.exports.KINDS = KINDS
