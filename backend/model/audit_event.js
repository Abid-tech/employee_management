const mongoose = require('mongoose')

// The trust layer: an append-only record of everything the agent touched and
// every human decision that followed it.
//
// Performance evaluation is one of the areas the EU AI Act treats as high-risk,
// and the obligations that come with that are less about the model and more
// about the paperwork: a human stays in the loop, and you can show afterwards
// who that human was. This collection is that record.
//
// Nothing here is ever updated or deleted. A log you can edit is not evidence.

const ACTIONS = [
    'agent.scanned',            // the agent read a set of reviews
    'agent.proposed',           // it drafted something for a human to decide on
    'human.approved',           // a manager accepted a proposal
    'human.dismissed',          // a manager rejected one
    'human.edited',             // a manager changed a draft before accepting
    'review.submitted',
    'review.acknowledged',
    'calibration.flagged'
]

const auditSchema = new mongoose.Schema({
    action: { type: String, enum: ACTIONS, required: true, index: true },

    // Who did it. `agent` is the software acting on its own; `human` is a named
    // person. Keeping the distinction explicit is the point of the log.
    actorKind: { type: String, enum: ['agent', 'human'], required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    actorName: { type: String, default: '', trim: true },

    // What it was done to, kept loose because the subject may be a review, a
    // signal, an employee or an objective.
    subjectKind: { type: String, default: '', trim: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },

    // Readable in the interface without a lookup, so the log is legible to a
    // person rather than only to a developer.
    summary: { type: String, default: '', trim: true },
    detail: { type: mongoose.Schema.Types.Mixed, default: {} },

    engine: { type: String, default: '' }
}, { timestamps: { createdAt: true, updatedAt: false } })

auditSchema.index({ createdAt: -1 })

module.exports = mongoose.model('AuditEvent', auditSchema)
module.exports.ACTIONS = ACTIONS
