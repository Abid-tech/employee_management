const mongoose = require('mongoose')

// NOTE FOR THE TEAM: a lean employee record so tasks can be assigned. When
// Module 1 adds its HR fields, extend this schema rather than creating a
// second collection of people.
const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    jobTitle: { type: String, default: 'Employee', trim: true },
    department: { type: String, required: true, trim: true },

    // Used by the AI import to match work to the right person.
    skills: [{ type: String, trim: true, lowercase: true }],

    // Two initials on a coloured disc, so no photo uploads are needed.
    color: { type: String, default: '#0A2947' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true })

employeeSchema.index({ department: 1 })

module.exports = mongoose.model('Employee', employeeSchema)
