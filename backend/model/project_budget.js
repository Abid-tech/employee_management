const mongoose = require('mongoose')

// The money side of a project, kept beside the Objective rather than inside it.

const budgetSchema = new mongoose.Schema({
    objective: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective', required: true, unique: true, index: true },

    totalBudget: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', trim: true },

    // Several thresholds rather than one.
    thresholds: {
        type: [Number],
        default: [50, 75, 90, 100]
    },
    firedThresholds: { type: [Number], default: [] },

    // Optional.
    hardStop: { type: Boolean, default: false },

    // A rate agreed for a whole project.
    projectCostRate: { type: Number, default: null },
    projectBillRate: { type: Number, default: null },

    note: { type: String, default: '', trim: true }
}, { timestamps: true })

module.exports = mongoose.model('ProjectBudget', budgetSchema)
