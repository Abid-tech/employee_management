const mongoose = require('mongoose')

// One document per evaluation, whoever wrote it.

const SOURCES = ['manager', 'peer', 'self', 'client']
const STATUSES = ['draft', 'submitted', 'acknowledged']

// A fixed list, because a radar chart needs the same axes for everybody.
const COMPETENCIES = [
    { key: 'delivery', label: 'Delivery', blurb: 'Finishes what they take on, at the standard agreed' },
    { key: 'quality', label: 'Quality', blurb: 'Work holds up — few reopens, careful edge cases' },
    { key: 'communication', label: 'Communication', blurb: 'Clear, timely, and adjusts to the audience' },
    { key: 'collaboration', label: 'Collaboration', blurb: 'Unblocks others and shares what they know' },
    { key: 'ownership', label: 'Ownership', blurb: 'Follows problems through without being chased' },
    { key: 'initiative', label: 'Initiative', blurb: 'Improves things nobody asked them to improve' }
]

const COMPETENCY_KEYS = COMPETENCIES.map(c => c.key)

const ratingSchema = new mongoose.Schema({
    competency: { type: String, enum: COMPETENCY_KEYS, required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    // Optional per-competency evidence.
    note: { type: String, default: '', trim: true }
}, { _id: false })

const reviewSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },

    source: { type: String, enum: SOURCES, required: true, index: true },

    // Null for client feedback, where the author is outside the company.
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    reviewerName: { type: String, default: '', trim: true },
    clientName: { type: String, default: '', trim: true },

    // Feedback that arrives because a piece of work finished.
    objective: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective', default: null, index: true },

    cycle: { type: String, default: '', trim: true, index: true },

    ratings: { type: [ratingSchema], default: [] },

    // Stored rather than derived.
    overall: { type: Number, min: 1, max: 5 },

    strengths: { type: String, default: '', trim: true },
    improvements: { type: String, default: '', trim: true },
    comment: { type: String, default: '', trim: true },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
    submittedAt: { type: Date },

    // The employee has seen it.
    acknowledgedAt: { type: Date },
    employeeResponse: { type: String, default: '', trim: true }
}, { timestamps: true })

reviewSchema.index({ employee: 1, createdAt: -1 })

// The overall score is the mean of whatever competencies were rated.
reviewSchema.pre('save', async function () {
    if (this.ratings.length > 0) {
        const sum = this.ratings.reduce((total, r) => total + r.score, 0)
        this.overall = Math.round((sum / this.ratings.length) * 100) / 100
    }
    if (this.status === 'submitted' && !this.submittedAt) this.submittedAt = new Date()
    if (this.status === 'acknowledged' && !this.acknowledgedAt) this.acknowledgedAt = new Date()
})

module.exports = mongoose.model('Review', reviewSchema)
module.exports.SOURCES = SOURCES
module.exports.STATUSES = STATUSES
module.exports.COMPETENCIES = COMPETENCIES
module.exports.COMPETENCY_KEYS = COMPETENCY_KEYS
