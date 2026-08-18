const mongoose = require('mongoose')

const STATUSES = ['planning', 'active', 'paused', 'delivered']

const objectiveSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    client: { type: String, default: '', trim: true },
    startDate: { type: Date },
    dueDate: { type: Date },
    status: { type: String, enum: STATUSES, default: 'active', index: true },
    source: { type: String, enum: ['manual', 'ai'], default: 'manual' },
    sourceDocument: { type: String, default: '' },
    summary: { type: String, default: '', trim: true }
}, { timestamps: true })

module.exports = mongoose.model('Objective', objectiveSchema)
module.exports.STATUSES = STATUSES
