const mongoose = require('mongoose')

// Departments are a collection of their own so Module 1 can manage them later
// without Module 3 having to change.
const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    mark: { type: String, default: '•' },
    blurb: { type: String, default: '', trim: true }
}, { timestamps: true })

module.exports = mongoose.model('Department', departmentSchema)
