const mongoose = require("mongoose")


const communicationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["Announcement", "Poll"],
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },

        // Only used when type === "Poll"
        options: [
            {
                text: {
                    type: String,
                    required: true,
                    trim: true
                },

                votes: {
                    type: Number,
                    default: 0
                }
            }
        ],

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        expiresAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
)


module.exports = mongoose.model("Communication",communicationSchema)