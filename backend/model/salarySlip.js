const mongoose = require("mongoose")


const salarySlipSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        month: {
            type: Number,
            required: true
        },

        year: {
            type: Number,
            required: true
        },

        // Admin input
        hourlyRate: {
            type: Number,
            required: true,
            min: 0
        },

        bonusPerOvertimeHour: {
            type: Number,
            default: 0,
            min: 0
        },

        deductions: {
            type: Number,
            default: 0,
            min: 0
        },

        // Auto-calculated from attendance
        presentDays: {
            type: Number,
            default: 0
        },

        overtimeDays: {
            type: Number,
            default: 0
        },

        totalWorkingHours: {
            type: Number,
            default: 0
        },

        overtimeHours: {
            type: Number,
            default: 0
        },

        regularPay: {
            type: Number,
            default: 0
        },

        overtimeBonus: {
            type: Number,
            default: 0
        },

        grossPay: {
            type: Number,
            required: true
        },

        netPay: {
            type: Number,
            required: true
        },

        // Payment tracking
        paymentStatus: {
            type: String,
            enum: ["Pending", "Processing", "Paid"],
            default: "Pending"
        },

        paidOn: {
            type: Date,
            default: null
        },

        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },

    {
        timestamps: true
    }
)


salarySlipSchema.index(
    { employee: 1, month: 1, year: 1 },
    { unique: true }
)


module.exports = mongoose.model("SalarySlip", salarySlipSchema)