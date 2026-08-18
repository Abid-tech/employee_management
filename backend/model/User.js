const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        department: {
            type: String,
            required: true,
            enum: [
                "Human Resources",
                "Finance",
                "IT",
                "Marketing",
                "Administration"
            ]
        },
        password: {
            type: String,
            required: true,
            minlength: 6
        },
        role: {
            type: String,
            enum: ["Employee", "Director", "Admin"],
            default: "Employee"
        },
        leaveBalance: {
            type: Number,
            default: 30,
            min: 0
        }
    },
    {
        timestamps: true
    }
)

const User = mongoose.model("User", userSchema)

module.exports = User
