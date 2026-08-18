const mongoose = require('mongoose')

const STATUSES = ['planning', 'active', 'paused', 'delivered']

// A project: the goal a group of tasks works towards.
//
// Objectives deliberately cut across departments — that is what makes them
// different from a department. A supplier portal needs engineering, design and
// a launch campaign, and the point of this record is to hold those together so
// there is one place that answers "how is the whole thing going".
//
// Nothing about progress is stored here. It is counted from the tasks that
// point at this objective, for the same reason a task's own progress is counted
// from its checklist: a stored number and the work underneath it will disagree
// the moment anybody touches either one.
const objectiveSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },

    // Who the work is for, when it is expected, and where it stands. Kept
    // deliberately small — this is a delivery record, not a CRM.
    client: { type: String, default: '', trim: true },
    startDate: { type: Date },
    dueDate: { type: Date },
    status: { type: String, enum: STATUSES, default: 'active', index: true },

    // Set when the objective came out of an imported document, so the project
    // page can say which brief it was read from.
    source: { type: String, enum: ['manual', 'ai'], default: 'manual' },
    sourceDocument: { type: String, default: '' },
    summary: { type: String, default: '', trim: true }
}, { timestamps: true })

module.exports = mongoose.model('Objective', objectiveSchema)
module.exports.STATUSES = STATUSES
