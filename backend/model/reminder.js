const mongoose = require("mongoose")

// A personal note pinned to a day on the company calendar.
//
// Deliberately private: every query filters by the signed-in user, and reminders
// never appear in the shared event feed or the subscription feed. The calendar
// shows company events everyone shares plus whatever this one person added.
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

        // Same 'YYYY-MM-DD' convention as Holiday, so a reminder and a holiday
        // on the same day compare as equal strings.
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
