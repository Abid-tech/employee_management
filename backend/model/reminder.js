const mongoose = require("mongoose")

// A personal note pinned to a day on the company calendar
const reminderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },

        // Same date format as Holiday.
        date: {
            type: String,
            required: true,
            match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be written as YYYY-MM-DD."]
        },

        note: {
            type: String,
            default: "",
            maxlength: 500
        }
    },
    { timestamps: true }
)

reminderSchema.index({ user: 1, date: 1 })

module.exports = mongoose.model("Reminder", reminderSchema)
