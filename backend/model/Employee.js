const mongoose = require('mongoose')

const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    jobTitle: { type: String, default: 'Employee', trim: true },
    department: { type: String, required: true, trim: true },
    skills: [{ type: String, trim: true, lowercase: true }],
    color: { type: String, default: '#0A2947' },
    isActive: { type: Boolean, default: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true })

employeeSchema.index({ department: 1 })
employeeSchema.index({ userId: 1 })

module.exports = mongoose.model('Employee', employeeSchema)
