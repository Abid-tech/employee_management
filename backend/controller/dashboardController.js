const User = require('../model/User')
const Employee = require('../model/Employee')
const Task = require('../model/Task')
const Objective = require('../model/Objective')
const Booking = require('../model/Booking')
const LeaveManagement = require('../model/LeaveManagement')
const Attendance = require('../model/Attendance')

const findEmployeeForUser = async (user) => {
    let emp = await Employee.findOne({ userId: user.userId })
    if (!emp) {
        emp = await Employee.findOne({ email: user.email })
    }
    return emp
}

const getEmployeeDashboard = async (req, res) => {
    try {
        const userId = req.user.userId
        const userEmail = req.user.email
        const employee = await findEmployeeForUser(req.user)

        let projects = []
        if (employee) {
            const assignedTasks = await Task.find({ assignee: employee._id })
                .populate('objective')
                .lean()
            const objIds = [...new Set(assignedTasks.filter(t => t.objective).map(t => t.objective._id.toString()))]
            projects = await Objective.find({ _id: { $in: objIds } })
                .sort({ dueDate: 1 })
                .lean()

            for (const p of projects) {
                const pTasks = assignedTasks.filter(t => t.objective && t.objective._id.toString() === p._id.toString())
                p.totalTasks = pTasks.length
                p.doneTasks = pTasks.filter(t => t.status === 'done').length
                p.isHighPriority = pTasks.some(t => t.priority === 'critical' || t.priority === 'high')
            }
        }

        let deadlines = []
        if (employee) {
            deadlines = await Task.find({
                assignee: employee._id,
                status: { $ne: 'done' },
                dueDate: { $gte: new Date() },
            })
                .sort({ dueDate: 1 })
                .limit(10)
                .populate('objective', 'title')
                .lean()

            deadlines = deadlines.map(t => ({
                _id: t._id,
                title: t.title,
                dueDate: t.dueDate,
                priority: t.priority,
                status: t.status,
                project: t.objective?.title || '',
                progress: t.status === 'done' ? 100
                    : t.subtasks?.length ? Math.round(t.subtasks.filter(s => s.done).length / t.subtasks.length * 100)
                    : { todo: 0, in_progress: 40, review: 80 }[t.status] ?? 0,
            }))
        }

        const user = await User.findById(userId)
        const fullName = user ? `${user.firstName} ${user.lastName}` : ''
        const today = new Date().toISOString().split('T')[0]

        const meetings = await Booking.find({
            date: { $gte: today },
            $or: [
                { bookedBy: fullName },
                { bookedBy: userEmail },
            ],
        })
            .sort({ date: 1, startTime: 1 })
            .limit(10)
            .lean()

        const leaves = await LeaveManagement.find({ user: userId }).lean()
        const leaveStatus = {
            pending: leaves.filter(l => l.status === 'Pending').length,
            accepted: leaves.filter(l => l.status === 'Accepted').length,
            rejected: leaves.filter(l => l.status === 'Rejected').length,
            total: leaves.length,
            balance: user?.leaveBalance ?? 0,
        }

        const last7 = []
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            last7.push(d.toISOString().split('T')[0])
        }
        const attendanceRecords = await Attendance.find({
            user: userId,
            date: { $in: last7 },
        }).lean()

        const attendanceTrend = last7.map(dateStr => {
            const rec = attendanceRecords.find(a => a.date === dateStr)
            return {
                date: dateStr,
                day: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
                checkedIn: !!rec?.checkIn?.time,
                checkInTime: rec?.checkIn?.time || null,
                totalMinutes: rec?.totalWorkingMinutes || 0,
            }
        })

        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

        const monthAttendance = await Attendance.find({
            user: userId,
            date: { $gte: monthStart, $lte: monthEnd },
            'checkIn.time': { $ne: null },
        }).lean()

        let onTimeCount = 0
        for (const a of monthAttendance) {
            if (a.checkIn?.time) {
                const checkInHour = new Date(a.checkIn.time).getHours()
                if (checkInHour < 9 || (checkInHour === 9 && new Date(a.checkIn.time).getMinutes() === 0)) {
                    onTimeCount++
                }
            }
        }
        const onTimeRate = monthAttendance.length ? Math.round((onTimeCount / monthAttendance.length) * 100) : 0

        let onTimeDelivery = 0, lateDelivery = 0
        if (employee) {
            const completedTasks = await Task.find({
                assignee: employee._id,
                status: 'done',
                completedAt: { $ne: null },
            }).lean()

            for (const t of completedTasks) {
                if (t.dueDate && t.completedAt <= t.dueDate) {
                    onTimeDelivery++
                } else {
                    lateDelivery++
                }
            }
        }

        res.json({
            projects,
            deadlines,
            meetings,
            leaveStatus,
            attendanceTrend,
            onTimeRate,
            totalAttendanceDays: monthAttendance.length,
            taskDelivery: { onTime: onTimeDelivery, late: lateDelivery },
            userName: fullName,
            userRole: req.user.role,
            department: user?.department || '',
        })
    } catch (err) {
        console.error('[employeeDashboard]', err)
        res.status(500).json({ error: 'Failed to load dashboard' })
    }
}

const getAdminDashboard = async (req, res) => {
    try {
        const yearAgo = new Date()
        yearAgo.setFullYear(yearAgo.getFullYear() - 1)
        const yearAgoStr = yearAgo.toISOString().split('T')[0]

        const allAttendance = await Attendance.find({
            date: { $gte: yearAgoStr },
            'checkIn.time': { $ne: null },
        }).lean()

        const heatmap = {}
        for (const a of allAttendance) {
            heatmap[a.date] = (heatmap[a.date] || 0) + 1
        }

        const employees = await Employee.find({ isActive: true }).lean()
        const users = await User.find({}, '-password').lean()
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        const employeeList = []
        for (const emp of employees) {
            const user = users.find(u =>
                (emp.userId && u._id.toString() === emp.userId.toString()) ||
                u.email === emp.email
            )

            let leaveDays = 0
            if (user) {
                const leaves = await LeaveManagement.find({
                    user: user._id,
                    status: 'Accepted',
                    StartDate: { $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0) },
                    EndDate: { $gte: monthStart },
                }).lean()
                leaveDays = leaves.reduce((sum, l) => sum + (l.TotalDays || 0), 0)
            }

            let attendanceCount = 0
            const totalWorkDays = Math.min(now.getDate(), 30)
            if (user) {
                const mStart = monthStart.toISOString().split('T')[0]
                const mEnd = now.toISOString().split('T')[0]
                attendanceCount = await Attendance.countDocuments({
                    user: user._id,
                    date: { $gte: mStart, $lte: mEnd },
                    'checkIn.time': { $ne: null },
                })
            }

            const completedTasks = await Task.countDocuments({ assignee: emp._id, status: 'done' })
            const totalTasks = await Task.countDocuments({ assignee: emp._id })

            employeeList.push({
                _id: emp._id,
                name: emp.name,
                email: emp.email || user?.email || '',
                department: emp.department,
                jobTitle: emp.jobTitle,
                leaveDaysThisMonth: leaveDays,
                attendanceRatio: `${attendanceCount}/${totalWorkDays}`,
                tasksCompleted: completedTasks,
                totalTasks,
                role: user?.role || 'Employee',
            })
        }

        const pendingLeaves = await LeaveManagement.find({ status: 'Pending' })
            .populate('user', 'firstName lastName email department')
            .sort({ createdAt: -1 })
            .lean()

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const onLeaveToday = await LeaveManagement.find({
            status: 'Accepted',
            StartDate: { $lte: today },
            EndDate: { $gte: today },
        })
            .populate('user', 'firstName lastName department')
            .lean()

        const departments = ['Human Resources', 'Finance', 'IT', 'Marketing', 'Administration']
        const monthStartStr = monthStart.toISOString().split('T')[0]
        const todayStr = now.toISOString().split('T')[0]

        const deptComparison = []
        for (const dept of departments) {
            const deptUsers = users.filter(u => u.department === dept)
            if (!deptUsers.length) continue

            let totalCheckins = 0
            for (const u of deptUsers) {
                totalCheckins += await Attendance.countDocuments({
                    user: u._id,
                    date: { $gte: monthStartStr, $lte: todayStr },
                    'checkIn.time': { $ne: null },
                })
            }

            const workDays = Math.min(now.getDate(), 30)
            const expectedTotal = deptUsers.length * workDays
            const rate = expectedTotal ? Math.round((totalCheckins / expectedTotal) * 100) : 0

            deptComparison.push({
                department: dept,
                employeeCount: deptUsers.length,
                attendanceRate: rate,
            })
        }

        res.json({
            heatmap,
            employees: employeeList,
            pendingLeaves,
            onLeaveToday,
            deptComparison,
        })
    } catch (err) {
        console.error('[adminDashboard]', err)
        res.status(500).json({ error: 'Failed to load admin dashboard' })
    }
}

const updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body
        const updated = await LeaveManagement.findByIdAndUpdate(id, { status }, { new: true })
        if (!updated) return res.status(404).json({ error: 'Leave request not found' })
        res.json({ success: true, leave: updated })
    } catch (err) {
        res.status(500).json({ error: 'Failed to update leave status' })
    }
}

module.exports = { getEmployeeDashboard, getAdminDashboard, updateLeaveStatus }
