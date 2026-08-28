const mongoose = require('mongoose')

// What a person costs, and what they are charged out at, from a given date.
//
// Rates are effective-dated rather than stored as a single number on the
// employee. This is the correctness detail most time-tracking tools get wrong:
// edit somebody's rate in Harvest and it rewrites the cost of hours they logged
// months ago, so last quarter's margin silently changes after the books were
// closed. A raise happened on a date. Hours logged before that date cost what
// they cost.
//
// Two rates, not one:
//   costRate  what the hour costs the company — salary, loaded
//   billRate  what the client is charged for it
// The gap between them is margin, which is the number an owner actually cares
// about. "Budget used" cannot tell you whether a project made money.

const rateSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },

    costRate: { type: Number, required: true, min: 0 },
    billRate: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', trim: true },

    // The rate applies to work done on or after this date. There is no end date:
    // a rate runs until a later one supersedes it, which means history can never
    // develop a gap.
    effectiveFrom: { type: Date, required: true, index: true },

    reason: { type: String, default: '', trim: true },
    createdByName: { type: String, default: '', trim: true }
}, { timestamps: true })

rateSchema.index({ employee: 1, effectiveFrom: -1 })

module.exports = mongoose.model('Rate', rateSchema)
