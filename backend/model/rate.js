const mongoose = require('mongoose')

// What a person costs, and what they are charged out at, from a given date.

const rateSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },

    costRate: { type: Number, required: true, min: 0 },
    billRate: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', trim: true },

    // The rate applies to work done on or after this date.
    effectiveFrom: { type: Date, required: true, index: true },

    reason: { type: String, default: '', trim: true },
    createdByName: { type: String, default: '', trim: true }
}, { timestamps: true })

rateSchema.index({ employee: 1, effectiveFrom: -1 })

module.exports = mongoose.model('Rate', rateSchema)
