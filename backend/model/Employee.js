const mongoose = require('mongoose')

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
    team: {
        type: String,
        default: '',
        trim: true,
    },
    employeeId: {
        type: String,
        default: '',
        trim: true,
    },
    email: {
        type: String,
        default: '',
        trim: true,
        lowercase: true,
    },
    joiningDate: {
        type: Date,
        default: null,
    },
    department: {
        type: String,
        default: '',
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
})

module.exports = mongoose.model('Employee', employeeSchema)
