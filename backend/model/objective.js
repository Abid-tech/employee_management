const mongoose = require('mongoose')

const STATUSES = ['planning', 'active', 'paused', 'delivered']

// A project: the goal a group of tasks works towards.
const objectiveSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },

    // Who the work is for, when it is expected, and where it stands.
    client: { type: String, default: '', trim: true },
    startDate: { type: Date },
    dueDate: { type: Date },
    status: { type: String, enum: STATUSES, default: 'active', index: true },

    // Set when the objective came out of an imported document.
    source: { type: String, enum: ['manual', 'ai'], default: 'manual' },
    sourceDocument: { type: String, default: '' },
    summary: { type: String, default: '', trim: true }
}, { timestamps: true })

module.exports = mongoose.model('Objective', objectiveSchema)
module.exports.STATUSES = STATUSES
