const mongoose = require('mongoose')

const leaveSchema = new mongoose.Schema({
    leaveType : {
        type: String,
        enum: ['Annual Leave','Medical Leave','Casual Leave','Emergency Leave'],
        required: true,
    },
    leaveDuration :{
        type: String,
        enum: ['Full Day','Half Day'],
        default: 'Full Day',
    },
    Priority :{
        type: String,
        enum:['Normal','Urgent'],
        required: true,
    },
    StartDate :{
        type: Date,
        required: true,
    },
    EndDate :{
        type: Date,
        required: true,
    },
    TotalDays:{
        type: Number,
        required: true,
    },
    Reason:{
        type: String,
        required: true,
        maxlength : 500,
    },
    ReplacementEmployee :{
        type: String,
        default: null
    },
    status:{
        type: String,
        enum : ['Pending','Accepted','Rejected'],
        default: 'Pending'
    }
}, { 
  timestamps: true 
})

module.exports = mongoose.model("LeaveManagement",leaveSchema)