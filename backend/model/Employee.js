const mongoose = require('mongoose')

// ---------------------------------------------------------------------------
// Employee schema
// Minimal for sprint 1 — just a name and a role string.
// The role is free-text (not an enum) because the admin UI lets users
// pick from a preset list OR type a custom role via an "Other" option.
// ---------------------------------------------------------------------------
const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Employee name is required'],
        trim: true,
    },
    role: {
        type: String,
        required: [true, 'Employee role is required'],
        trim: true,
    },
}, {
    timestamps: true,
})

module.exports = mongoose.model('Employee', employeeSchema)
