const mongoose = require('mongoose')

const reminderSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
    time: {
        type: String,
        default: '',
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
