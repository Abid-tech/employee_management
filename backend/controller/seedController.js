const Notification = require('../model/Notification')
const Attendance = require('../model/Attendance')
const User = require('../model/User')
const { sendEmail } = require('../service/emailService')

const seedDemoNotifications = async (req, res) => {
    try {
        const userId = req.user.userId
        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ error: 'User not found' })

        const demoNotifs = [
            {
                recipient: userId,
                type: 'deadline',
                title: 'Task Deadline Approaching',
                message: 'Your task "Build Dashboard UI" is due in 2 days. Please ensure timely completion.',
                link: '/dashboard',
            },
            {
                recipient: userId,
                type: 'meeting',
                title: 'Meeting Reminder',
                message: 'Team standup meeting scheduled for tomorrow at 10:00 AM in Room 3.',
                link: '/calendar',
            },
            {
                recipient: userId,
                type: 'leave',
                title: 'Leave Approved',
                message: 'Your annual leave request (Aug 25 - Aug 27) has been approved by the admin.',
                link: '/dashboard',
            },
            {
                recipient: userId,
                type: 'announcement',
                title: 'Company Announcement',
                message: 'Office will remain closed on Aug 30 due to scheduled maintenance. Work from home.',
                link: '/holidays',
            },
            {
                recipient: userId,
                type: 'task',
                title: 'New Task Assigned',
                message: 'You have been assigned a new task: "API Integration Testing" for the HR module project.',
                link: '/dashboard',
            },
            {
                recipient: userId,
                type: 'attendance',
                title: 'Monthly Attendance Summary',
                message: 'Your attendance for this month: 18/22 days present, 2 late arrivals. On-time rate: 89%.',
                link: '/dashboard',
            },
            {
                recipient: userId,
                type: 'holiday',
                title: 'New Holiday Added',
                message: 'Victory Day (Dec 16) has been added to the company calendar. Enjoy your day off!',
                link: '/holidays',
            },
        ]

        const created = await Notification.insertMany(demoNotifs)

        let emailSent = false
        if (user.email) {
            emailSent = await sendEmail(
                user.email,
                'Demo: Task Deadline Approaching',
                `<div style="font-family: Montserrat, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #0A2947, #2a5070); color: #F3E4C9; padding: 24px 28px; border-radius: 12px 12px 0 0;">
                        <h2 style="margin: 0; font-size: 20px;">Task Deadline Approaching</h2>
                        <p style="margin: 8px 0 0; opacity: 0.85; font-size: 13px;">Employee Management System</p>
                    </div>
                    <div style="background: #fff; padding: 24px 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                            Hi <strong>${user.firstName}</strong>,
                        </p>
                        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                            Your task <strong>"Build Dashboard UI"</strong> is due in <strong>2 days</strong>. 
                            Please ensure timely completion to maintain your delivery metrics.
                        </p>
                        <div style="margin: 20px 0; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #0A2947;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">Project: HR Module Redesign</p>
                            <p style="margin: 4px 0 0; color: #374151; font-size: 13px; font-weight: 600;">Deadline: ${new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <a href="http://localhost:5173/dashboard" style="display: inline-block; background: #0A2947; color: #F3E4C9; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px;">
                            View Dashboard ->
                        </a>
                        <p style="color: #9ca3af; font-size: 11px; margin-top: 20px;">
                            This is a demo notification from the Smart Employee Management System.
                        </p>
                    </div>
                </div>`
            )
        }

        res.json({
            message: `Created ${created.length} demo notifications${emailSent ? ' and sent a demo email' : ''}`,
            emailSent,
            emailTo: emailSent ? user.email : null,
            notificationsCreated: created.length,
        })
    } catch (err) {
        console.error('[seedDemo]', err)
        res.status(500).json({ error: 'Failed to seed demo data' })
    }
}

const seedAttendanceHeatmap = async (req, res) => {
    try {
        const users = await User.find({}, '_id').lean()
        if (!users.length) return res.status(400).json({ error: 'No users found' })

        const today = new Date()
        let totalCreated = 0

        for (const user of users) {
            for (let i = 364; i >= 0; i--) {
                const d = new Date(today)
                d.setDate(d.getDate() - i)

                const dow = d.getDay()
                if (dow === 0 || dow === 6) continue

                if (Math.random() > 0.70) continue

                const dateStr = d.toISOString().split('T')[0]

                const exists = await Attendance.findOne({ user: user._id, date: dateStr })
                if (exists) continue

                const checkInHour = 8 + Math.floor(Math.random() * 2)
                const checkInMin = Math.floor(Math.random() * 60)
                const checkInTime = new Date(d)
                checkInTime.setHours(checkInHour, checkInMin, 0, 0)

                const checkOutHour = 17 + Math.floor(Math.random() * 2)
                const checkOutMin = Math.floor(Math.random() * 60)
                const checkOutTime = new Date(d)
                checkOutTime.setHours(checkOutHour, checkOutMin, 0, 0)

                const totalMinutes = Math.round((checkOutTime - checkInTime) / 60000)

                await Attendance.create({
                    user: user._id,
                    date: dateStr,
                    checkIn: {
                        time: checkInTime,
                        latitude: 23.8103 + (Math.random() * 0.01 - 0.005),
                        longitude: 90.4125 + (Math.random() * 0.01 - 0.005),
                        accuracy: 10 + Math.floor(Math.random() * 20),
                    },
                    checkOut: {
                        time: checkOutTime,
                        latitude: 23.8103 + (Math.random() * 0.01 - 0.005),
                        longitude: 90.4125 + (Math.random() * 0.01 - 0.005),
                        accuracy: 10 + Math.floor(Math.random() * 20),
                    },
                    totalWorkingMinutes: totalMinutes,
                })
                totalCreated++
            }
        }

        res.json({
            message: `Seeded ${totalCreated} attendance records for ${users.length} users`,
            totalRecords: totalCreated,
            userCount: users.length,
        })
    } catch (err) {
        console.error('[seedHeatmap]', err)
        res.status(500).json({ error: 'Failed to seed attendance data' })
    }
}

module.exports = { seedDemoNotifications, seedAttendanceHeatmap }
