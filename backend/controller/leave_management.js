const leaveManagement = require('../model/leave_management')
const User = require('../model/user')

const HandleGetLeave = async(req,res)=>{

    try {

        const userId = req.user.userId
        const role = req.user.role

        let leaves

        if (role === "Admin" || role === "Director") {

            leaves = await leaveManagement
                .find()
                .populate(
                    "user",
                    "firstName lastName email department"
                )
                .sort({ createdAt: -1 })

        } else {

            // Employee can see only their own leaves
            leaves = await leaveManagement
                .find({
                    user: userId
                })
                .sort({ createdAt: -1 })
        }


        res.status(200).json({
            success: true,
            leaves
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            error: err.message
        })
    }


}


const HandleCreateLeave = async(req,res)=>{



    try {
        const userId = req.user.userId

        const {
            leaveType,
            leaveDuration,
            Priority,
            StartDate,
            EndDate,
            TotalDays,
            Reason,
            ReplacementEmployee
        } = req.body


        const user = await User.findById(userId)


        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }


        // Check leave balance
        if (TotalDays > user.leaveBalance) {

            return res.status(400).json({
                success: false,
                message: "You do not have enough leave balance",
                leaveBalance: user.leaveBalance
            })
        }


        // Create leave
        const leave = await leaveManagement.create({

            // IMPORTANT
            // Comes from JWT, NOT frontend
            user: userId,

            leaveType,
            leaveDuration,
            Priority,
            StartDate,
            EndDate,
            TotalDays,
            Reason,
            ReplacementEmployee
        })


        res.status(201).json({

            success: true,

            message: "Successfully submitted leave application",

            leave

        })

    } catch (err) {

        console.log(err)

        res.status(500).json({

            success: false,
            error: err.message

        })
    }
}



const HandleUpdateStatus = async (req, res) => {

    try {

        const { id } = req.params
        const { status } = req.body


        const validStatuses = [
            'Pending',
            'Accepted',
            'Rejected'
        ]


        if (!validStatuses.includes(status)) {

            return res.status(400).json({

                success: false,

                error:
                    'Invalid status. Must be Pending, Accepted, or Rejected'

            })
        }


        const leave = await leaveManagement.findById(id)


        if (!leave) {

            return res.status(404).json({

                success: false,
                error: 'Leave request not found'

            })
        }


        const oldStatus = leave.status


        // Prevent unnecessary balance changes
        if (
            oldStatus === "Accepted" &&
            status === "Accepted"
        ) {

            return res.status(400).json({

                success: false,
                message: "Leave is already accepted"

            })
        }


        // If changing to Accepted
        if (
            status === "Accepted" &&
            oldStatus !== "Accepted"
        ) {

            const user = await User.findById(leave.user)


            if (!user) {

                return res.status(404).json({

                    success: false,
                    message: "User not found"

                })
            }


            // Make sure user still has enough leave
            if (leave.TotalDays > user.leaveBalance) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Employee does not have enough leave balance",

                    leaveBalance:
                        user.leaveBalance

                })
            }


            // Deduct leave
            user.leaveBalance -= leave.TotalDays

            await user.save()
        }




        leave.status = status

        await leave.save()


        res.status(200).json({

            success: true,

            message: "Leave status updated",

            leave

        })

    } catch (err) {

        console.log(err)

        res.status(500).json({

            success: false,
            error: err.message

        })
    }
}



module.exports = {HandleCreateLeave,HandleGetLeave,HandleUpdateStatus}