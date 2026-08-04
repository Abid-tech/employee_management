const mongoose = require('mongoose')

// ---------------------------------------------------------------------------
// Holiday schema
// Each document represents one company holiday (e.g. "Independence Day").
// We lean on Mongoose's built-in validators (required, enum, minlength)
// instead of adding an external library like Joi — for a 3-field schema
// that would be overkill.
// ---------------------------------------------------------------------------
const holidaySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Holiday name is required'],
        minlength: [2, 'Holiday name must be at least 2 characters'],
        trim: true,                       // strip leading/trailing whitespace
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
            message: '{VALUE} is not a valid holiday type',  // friendly error
        },
    },
}, {
    timestamps: true,   // adds createdAt & updatedAt automatically
})

// "Holiday" becomes the "holidays" collection in MongoDB
module.exports = mongoose.model('Holiday', holidaySchema)
