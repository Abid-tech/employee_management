const mongoose = require('mongoose')

const NOTIFICATION_TYPES = [
    'meeting',
    'deadline',
    'leave',
    'attendance',
    'announcement',
    'task',
    'replacement',
    'holiday',
    'conflict'
]

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: NOTIFICATION_TYPES,
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    link: {
        type: String,
        default: '',
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    emailSent: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
})

module.exports = mongoose.model('Notification', notificationSchema)
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES
