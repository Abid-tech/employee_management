const mongoose = require('mongoose')

// The trust layer: an append-only record of everything the agent touched and every human decision.

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

    // Who did it.
    actorKind: { type: String, enum: ['agent', 'human'], required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    actorName: { type: String, default: '', trim: true },

    // What it was done to.
    subjectKind: { type: String, default: '', trim: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },

    // Readable in the interface without a lookup.
    summary: { type: String, default: '', trim: true },
    detail: { type: mongoose.Schema.Types.Mixed, default: {} },

    engine: { type: String, default: '' }
}, { timestamps: { createdAt: true, updatedAt: false } })

auditSchema.index({ createdAt: -1 })

module.exports = mongoose.model('AuditEvent', auditSchema)
module.exports.ACTIONS = ACTIONS
