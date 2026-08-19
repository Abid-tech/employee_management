const mongoose = require('mongoose')

// One block of work, by one person, on one day.
//
// The ledger the whole budget module is built on. Cost is deliberately NOT
// stored here: it is worked out at read time from the rate that was in force on
// `workedOn`. Storing a cost would freeze it at whatever the rate happened to be
// when the row was written, and then correcting a mistyped rate would leave the
// old cost sitting in the database forever.
//
// A rate override can be attached to the entry itself. The resolution order is
// deliberate and matches how agencies actually work:
//
//   1. an override on this entry            (a senior doing junior cleanup)
//   2. the project's override for this task
//   3. the person's effective-dated rate    (the usual case)
//
// A senior developer doing a junior's tidy-up should not be billed at senior
// rate just because of who they are.

const SOURCES = ['clock', 'manual', 'derived']

const timeEntrySchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null, index: true },
    objective: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective', default: null, index: true },

    hours: { type: Number, required: true, min: 0 },

    // The day the work happened — which is what the rate is resolved against,
    // not the day the row was created. Someone logging Friday's hours on Monday
    // must still be costed at Friday's rate.
    workedOn: { type: Date, required: true, index: true },

    clockIn: { type: Date },
    clockOut: { type: Date },

    source: { type: String, enum: SOURCES, default: 'clock' },
    note: { type: String, default: '', trim: true },

    // Set only when this specific piece of work was agreed at a different rate.
    // Null means "use the normal resolution order".
    costRateOverride: { type: Number, default: null },
    billRateOverride: { type: Number, default: null },
    overrideReason: { type: String, default: '', trim: true },

    billable: { type: Boolean, default: true }
}, { timestamps: true })

timeEntrySchema.index({ objective: 1, workedOn: -1 })
timeEntrySchema.index({ employee: 1, workedOn: -1 })

module.exports = mongoose.model('TimeEntry', timeEntrySchema)
module.exports.SOURCES = SOURCES
