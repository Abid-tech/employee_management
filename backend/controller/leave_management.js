const leaveManagement = require("../model/leave_management")
const User = require("../model/user")


const HandleGetLeave = async (req, res) => {

    try {

        const userId = req.user.userId
        const role = req.user.role

        let leaves


        // Admin and Director can see all leave requests
        if (role === "Admin" || role === "Director") {

            leaves = await leaveManagement
                .find()
                .populate(
                    "user",
                    "firstName lastName email department"
                )
                .sort({ createdAt: -1 })

        }

        // Employee can see only their own leaves
        else {

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



const HandleCreateLeave = async (req, res) => {

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


        // Find logged-in user
        const user = await User.findById(userId)


        if (!user) {

            return res.status(404).json({

                success: false,
                message: "User not found"

            })

        }


        // Validate number of leave days
        const requestedDays = Number(TotalDays)


        if (!requestedDays || requestedDays <= 0) {

            return res.status(400).json({

                success: false,
                message: "Invalid number of leave days"

            })

        }


        // Check current remaining balance
        if (requestedDays > user.leaveBalance) {

            return res.status(400).json({

                success: false,
                message: "You do not have enough leave balance",
                leaveBalance: user.leaveBalance

            })

        }



        const leave = await leaveManagement.create({

            user: userId,

            leaveType,

            leaveDuration,

            Priority,

            StartDate,

            EndDate,

            TotalDays: requestedDays,

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
            "Pending",
            "Accepted",
            "Rejected"
        ]


        // Validate status
        if (!validStatuses.includes(status)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid status. Must be Pending, Accepted, or Rejected"

            })

        }


        // Find leave
        const leave = await leaveManagement.findById(id)


        if (!leave) {

            return res.status(404).json({

                success: false,

                message: "Leave request not found"

            })

        }


        const oldStatus = leave.status


        // No change
        if (oldStatus === status) {

            return res.status(400).json({

                success: false,

                message: `Leave is already ${status}`

            })

        }


        const user = await User.findById(leave.user)


        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found"

            })

        }



        if ( oldStatus === "Pending" &&status === "Accepted") {

  
            if (leave.TotalDays > user.leaveBalance) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Employee does not have enough leave balance",

                    leaveBalance:
                        user.leaveBalance

                })

            }

            user.leaveBalance = user.leaveBalance - leave.TotalDays


            await user.save()

        }



        if (
            oldStatus === "Accepted" &&
            (status === "Rejected" || status === "Pending")
        ) {

            user.leaveBalance =
                user.leaveBalance + leave.TotalDays


            await user.save()

        }


        leave.status = status

        await leave.save()


        res.status(200).json({

            success: true,

            message: "Leave status updated successfully",

            leave,

            leaveBalance: user.leaveBalance

        })

    } catch (err) {

        console.log(err)

        res.status(500).json({

            success: false,
            error: err.message

        })

    }

}



module.exports = {HandleCreateLeave, HandleGetLeave, HandleUpdateStatus}