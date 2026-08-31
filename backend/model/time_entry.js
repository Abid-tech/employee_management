const mongoose = require('mongoose')

// One block of work, by one person, on one day.

const SOURCES = ['clock', 'manual', 'derived']

const timeEntrySchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null, index: true },
    objective: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective', default: null, index: true },

    hours: { type: Number, required: true, min: 0 },

    // The day the work happened.
    workedOn: { type: Date, required: true, index: true },

    clockIn: { type: Date },
    clockOut: { type: Date },

    source: { type: String, enum: SOURCES, default: 'clock' },
    note: { type: String, default: '', trim: true },

    // Set only when this specific piece of work was agreed at a different rate.
    costRateOverride: { type: Number, default: null },
    billRateOverride: { type: Number, default: null },
    overrideReason: { type: String, default: '', trim: true },

    billable: { type: Boolean, default: true }
}, { timestamps: true })

timeEntrySchema.index({ objective: 1, workedOn: -1 })
timeEntrySchema.index({ employee: 1, workedOn: -1 })

module.exports = mongoose.model('TimeEntry', timeEntrySchema)
module.exports.SOURCES = SOURCES
