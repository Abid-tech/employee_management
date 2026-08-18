const mongoose = require("mongoose")

const attendanceSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        date: {
            type: String,
            required: true
        },
        checkIn: {
            time: { type: Date, default: null },
            latitude: { type: Number, default: null },
            longitude: { type: Number, default: null },
            accuracy: { type: Number, default: null }
        },
        checkOut: {
            time: { type: Date, default: null },
            latitude: { type: Number, default: null },
            longitude: { type: Number, default: null },
            accuracy: { type: Number, default: null }
        },
        totalWorkingMinutes: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
)

attendanceSchema.index({ user: 1, date: 1 }, { unique: true })

module.exports = mongoose.model("Attendance", attendanceSchema)
