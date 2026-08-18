const mongoose = require('mongoose')

const holidaySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Holiday name is required'],
        minlength: [2, 'Holiday name must be at least 2 characters'],
        trim: true,
    },
    date: {
        type: Date,
        required: [true, 'Holiday date is required'],
    },
    type: {
        type: String,
        required: [true, 'Holiday type is required'],
        enum: {
            values: ['National', 'Religious', 'Company'],
            message: '{VALUE} is not a valid holiday type',
        },
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    googleEventId: {
        type: String,
        default: '',
    },
    isRecurring: {
        type: Boolean,
        default: false,
    },
    recurringMonth: {
        type: Number,
        min: 1,
        max: 12,
    },
    recurringDay: {
        type: Number,
        min: 1,
        max: 31,
    },
}, {
    timestamps: true,
})

module.exports = mongoose.model('Holiday', holidaySchema)
