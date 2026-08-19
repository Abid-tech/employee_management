const mongoose = require('mongoose')

// One document per evaluation, whoever wrote it.
//
// Manager reviews, peer reviews, self-assessments and client feedback are the
// same shape deliberately. Storing them in four collections is what produces
// four tabs nobody cross-references — keeping one collection with a `source`
// field is what lets the profile plot all four on a single axis and ask "does
// this person see themselves the way their team sees them?".

const SOURCES = ['manager', 'peer', 'self', 'client']
const STATUSES = ['draft', 'submitted', 'acknowledged']

// A fixed list, because a radar chart needs the same axes for everybody. Free
// text competencies would make two employees incomparable, which defeats the
// point of calibration.
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
    // Optional per-competency evidence. The calibration checker rewards a
    // reviewer who points at something that happened.
    note: { type: String, default: '', trim: true }
}, { _id: false })

const reviewSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },

    source: { type: String, enum: SOURCES, required: true, index: true },

    // Null for client feedback, where the author is outside the company.
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    reviewerName: { type: String, default: '', trim: true },
    clientName: { type: String, default: '', trim: true },

    // Feedback that arrives because a piece of work finished, rather than
    // because the calendar said so. This is what makes it useful — it lands
    // while everyone still remembers the project.
    objective: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective', default: null, index: true },

    cycle: { type: String, default: '', trim: true, index: true },

    ratings: { type: [ratingSchema], default: [] },

    // Stored rather than derived, so a historical review keeps the number it was
    // signed off with even if the averaging rule changes later.
    overall: { type: Number, min: 1, max: 5 },

    strengths: { type: String, default: '', trim: true },
    improvements: { type: String, default: '', trim: true },
    comment: { type: String, default: '', trim: true },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
    submittedAt: { type: Date },

    // The employee has seen it. Feedback nobody read is not feedback, so the
    // system tracks delivery rather than assuming it.
    acknowledgedAt: { type: Date },
    employeeResponse: { type: String, default: '', trim: true }
}, { timestamps: true })

reviewSchema.index({ employee: 1, createdAt: -1 })

// The overall score is the mean of whatever competencies were rated. Reviewers
// are allowed to skip an axis they have no evidence for — scoring it zero would
// punish honesty, and forcing a guess is how rating noise gets in.
// Declared async rather than taking a `next` callback: this project is on
// Mongoose 9, which calls promise-style middleware without one, so a hook
// written the old way throws "next is not a function" on every save.
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
