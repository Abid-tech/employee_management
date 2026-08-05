const leaveManagement = require('../model/leave_management')


const HandleGetLeave = async(req,res)=>{
    try{
        const AllLeave = await leaveManagement.find().sort({ createdAt: -1 })
        res.json(AllLeave)
    }catch(err){
        console.log(err)
    }
}


const HandleCreateLeave = async(req,res)=>{

    try{
    const {leaveType,leaveDuration,Priority,StartDate,EndDate,TotalDays,Reason,ReplacementEmployee} = req.body

    const leave = await leaveManagement.create({leaveType,leaveDuration,Priority,StartDate,EndDate,TotalDays,Reason,ReplacementEmployee})

    res.status(201).json({
        message:"Successfuly stored the data"
    })
    }catch(err){
        res.status(500).json({
            error:err.message
        })
    }
}



const HandleUpdateStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body

        const validStatuses = ['Pending', 'Accepted', 'Rejected']
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be Pending, Accepted, or Rejected'
            })
        }

        const updatedLeave = await leaveManagement.findByIdAndUpdate(
            id,
            { status: status },
            { new: true, runValidators: true }
        )

        if (!updatedLeave) {
            return res.status(404).json({
                success: false,
                error: 'Leave request not found'
            })
        }

        res.status(200).json({
            success: true,
            message: `Leave status updated`,
        })
    } catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
}



module.exports = {HandleCreateLeave,HandleGetLeave,HandleUpdateStatus}