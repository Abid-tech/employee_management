const mongoose = require("mongoose")

// Dates are 'YYYY-MM-DD' strings, matching Booking and Attendance.
const holidaySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },

        date: {
            type: String,
            required: true,
            match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be written as YYYY-MM-DD."]
        },

        type: {
            type: String,
            enum: ["Public", "Company", "Optional"],
            default: "Company"
        },

        // Repeats on the same month and day every year
        recurringAnnually: {
            type: Boolean,
            default: false
        },

        description: {
            type: String,
            default: "",
            maxlength: 500
        },

        createdBy: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
)

// One holiday per date.
holidaySchema.index({ date: 1 }, { unique: true })

module.exports = mongoose.model("Holiday", holidaySchema)
