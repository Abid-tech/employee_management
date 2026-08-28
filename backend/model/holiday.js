const mongoose = require("mongoose")

// Dates are held as 'YYYY-MM-DD' strings rather than Date objects.
//
// A company holiday is a calendar day, not an instant. Storing it as a Date
// means it carries a time and a zone, and a holiday saved in Dhaka reads as the
// previous day to anyone whose server is behind UTC — the classic off-by-one
// that makes a holiday land on the wrong date. Room bookings and attendance in
// this app already key on 'YYYY-MM-DD' for the same reason, so this matches them
// and the three can be compared without converting anything.
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

        // Repeats on the same month and day every year. The stored date is the
        // first occurrence; later years are projected when a year is listed, so
        // one record covers all of them and editing it corrects every year.
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

// A recurring holiday may share a month and day with a one-off in another year,
// so the guard is on the exact stored date rather than on the name.
holidaySchema.index({ date: 1 }, { unique: true })

module.exports = mongoose.model("Holiday", holidaySchema)
