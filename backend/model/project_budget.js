const mongoose = require('mongoose')

// The money side of a project, kept beside the Objective rather than inside it.
//
// A separate collection on purpose: the Objective schema belongs to the Task &
// Objective module, and a budget is not part of what a project *is*. Keeping
// them apart means the budget feature can be added, changed or removed without
// anybody having to touch that module's model.

const budgetSchema = new mongoose.Schema({
    objective: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective', required: true, unique: true, index: true },

    totalBudget: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', trim: true },

    // Several thresholds rather than one.
    //
    // A single bar that turns red at 100% tells you when it is already too late.
    // Real projects want a nudge at 50, a conversation at 75 and an escalation
    // at 90 — and each fires once, so a project sitting at 78% for a fortnight
    // does not send the same alert every day.
    thresholds: {
        type: [Number],
        default: [50, 75, 90, 100]
    },
    firedThresholds: { type: [Number], default: [] },

    // Optional. When on, logging time against a project that has hit its cap is
    // refused rather than merely warned about. Off by default, because silently
    // blocking people from recording work they genuinely did is worse than an
    // overrun in most teams.
    hardStop: { type: Boolean, default: false },

    // A rate agreed for a whole project, overriding each person's normal rate
    // but still beaten by an override on a single entry.
    projectCostRate: { type: Number, default: null },
    projectBillRate: { type: Number, default: null },

    note: { type: String, default: '', trim: true }
}, { timestamps: true })

module.exports = mongoose.model('ProjectBudget', budgetSchema)
