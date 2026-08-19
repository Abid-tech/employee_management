const mongoose = require('mongoose')

// A proposal the agent wants to make, and the record of who decided on it.
//
// This is the difference between "the AI wrote a summary" and "the AI closed the
// loop". When the same theme keeps appearing in somebody's reviews, the agent
// does not stop at noting it — it drafts the objective or task that would
// address it, ready for a manager to approve into the Task & Objective module.
//
// It never writes into that module by itself. Under the EU AI Act, software that
// influences performance decisions is high-risk and must keep a human in the
// loop, so every proposal sits at `proposed` until a named person approves or
// dismisses it. `decidedBy` and `decidedAt` are what make that provable rather
// than merely claimed.

const STATUSES = ['proposed', 'approved', 'dismissed']
const KINDS = ['objective', 'task']

const signalSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },

    // What kept coming up. Tied to a competency so the proposal can be traced
    // back to the axis it came from.
    theme: { type: String, required: true, trim: true },
    competency: { type: String, default: '', trim: true },

    // Every review that contributed. The manager can read the evidence before
    // deciding, which is the whole point of showing the work.
    evidence: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    occurrences: { type: Number, default: 0 },
    averageScore: { type: Number },

    // Plain English, written for the manager rather than for a log file.
    rationale: { type: String, default: '', trim: true },
    severity: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },

    // The draft itself, shaped so it can be handed straight to the objective or
    // task service on approval without a second round of editing.
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

    // Set once approved, so the proposal and the thing it created stay linked
    // and the agent can see it already acted on this theme.
    createdRef: { type: mongoose.Schema.Types.ObjectId, default: null },

    // Which engine produced this. The interface names it, so a reader always
    // knows whether they are looking at a model's judgement or a rule's.
    engine: { type: String, default: 'rules' },

    // Lets a re-run recognise a theme it has already raised instead of stacking
    // duplicates every time somebody opens the page.
    fingerprint: { type: String, index: true }
}, { timestamps: true })

signalSchema.index({ employee: 1, status: 1 })

module.exports = mongoose.model('FeedbackSignal', signalSchema)
module.exports.STATUSES = STATUSES
module.exports.KINDS = KINDS
