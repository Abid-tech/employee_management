const mongoose = require('mongoose')

const reminderSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: [true, 'Employee ID is required'],
        index: true,
    },
    title: {
        type: String,
        required: [true, 'Reminder title is required'],
        trim: true,
    },
    date: {
        type: Date,
        required: [true, 'Reminder date is required'],
    },
    note: {
        type: String,
        default: '',
        trim: true,
    },
    isAlarm: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
})

module.exports = mongoose.model('Reminder', reminderSchema)
