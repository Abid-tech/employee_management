const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')
const Holiday = require('../model/Holiday')
const Booking = require('../model/Booking')
const LeaveManagement = require('../model/LeaveManagement')
const Task = require('../model/Task')
const User = require('../model/User')
const { createNotification, notifyUser } = require('../service/notificationService')
const {
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
} = require('../service/googleCalendarService')

const getHolidays = async (req, res) => {
    try {
        const holidays = await Holiday.find().sort({ date: 1 })
        res.json(holidays)
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch holidays' })
    }
}

const createHoliday = async (req, res) => {
    try {
        const { name, date, type, description, isRecurring } = req.body
        const d = new Date(date)
        const data = { name, date, type, description }

        if (isRecurring) {
            data.isRecurring = true
            data.recurringMonth = d.getMonth() + 1
            data.recurringDay = d.getDate()
        }

        const holiday = await Holiday.create(data)

        const googleEventId = await createCalendarEvent(holiday)
        if (googleEventId) {
            holiday.googleEventId = googleEventId
            await holiday.save()
        }

        res.status(201).json(holiday)
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message)
            return res.status(400).json({ error: messages.join(', ') })
        }
        res.status(500).json({ error: 'Failed to create holiday' })
    }
}

const updateHoliday = async (req, res) => {
    try {
        const { id } = req.params
        const { name, date, type, description, isRecurring } = req.body
        const updates = { name, date, type, description }

        if (isRecurring && date) {
            const d = new Date(date)
            updates.isRecurring = true
            updates.recurringMonth = d.getMonth() + 1
            updates.recurringDay = d.getDate()
        } else if (isRecurring === false) {
            updates.isRecurring = false
            updates.recurringMonth = undefined
            updates.recurringDay = undefined
        }

        const updated = await Holiday.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        })
        if (!updated) return res.status(404).json({ error: 'Holiday not found' })

        await updateCalendarEvent(updated.googleEventId, updated)

        res.json(updated)
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message)
            return res.status(400).json({ error: messages.join(', ') })
        }
        res.status(500).json({ error: 'Failed to update holiday' })
    }
}

const deleteHoliday = async (req, res) => {
    try {
        const { id } = req.params
        const holiday = await Holiday.findById(id)
        if (!holiday) return res.status(404).json({ error: 'Holiday not found' })

        await deleteCalendarEvent(holiday.googleEventId)

        await Holiday.findByIdAndDelete(id)
        res.json(holiday)
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete holiday' })
    }
}

const generateRecurring = async (req, res) => {
    try {
        const { year } = req.body
        const targetYear = year || new Date().getFullYear() + 1

        const recurring = await Holiday.find({ isRecurring: true })
        if (!recurring.length) {
            return res.json({ message: 'No recurring holidays defined', created: [] })
        }

        const created = []
        for (const h of recurring) {
            const targetDate = new Date(targetYear, h.recurringMonth - 1, h.recurringDay)

            const exists = await Holiday.findOne({
                name: h.name,
                date: {
                    $gte: new Date(targetYear, 0, 1),
                    $lt: new Date(targetYear + 1, 0, 1),
                },
            })
            if (exists) continue

            const newHoliday = await Holiday.create({
                name: h.name,
                date: targetDate,
                type: h.type,
                description: h.description,
                isRecurring: true,
                recurringMonth: h.recurringMonth,
                recurringDay: h.recurringDay,
            })

            const googleEventId = await createCalendarEvent(newHoliday)
            if (googleEventId) {
                newHoliday.googleEventId = googleEventId
                await newHoliday.save()
            }

            created.push(newHoliday)
        }

        res.status(201).json({
            message: `Generated ${created.length} holidays for ${targetYear}`,
            created,
        })
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate recurring holidays' })
    }
}

const importCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file uploaded' })
        }

        const results = []
        const errors = []
        const rows = []

        const stream = require('stream')
        const bufferStream = new stream.PassThrough()
        bufferStream.end(req.file.buffer)

        await new Promise((resolve, reject) => {
            bufferStream
                .pipe(csv())
                .on('data', (row) => rows.push(row))
                .on('end', resolve)
                .on('error', reject)
        })

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            try {
                const data = {
                    name: (row.name || '').trim(),
                    date: new Date(row.date),
                    type: (row.type || '').trim(),
                    description: (row.description || '').trim(),
                }

                if (isNaN(data.date.getTime())) {
                    errors.push({ row: i + 1, error: 'Invalid date' })
                    continue
                }

                if (row.isRecurring === 'true' || row.isRecurring === '1') {
                    data.isRecurring = true
                    data.recurringMonth = data.date.getMonth() + 1
                    data.recurringDay = data.date.getDate()
                }

                const holiday = await Holiday.create(data)

                const googleEventId = await createCalendarEvent(holiday)
                if (googleEventId) {
                    holiday.googleEventId = googleEventId
                    await holiday.save()
                }

                results.push({ row: i + 1, holiday })
            } catch (err) {
                const msg = err.name === 'ValidationError'
                    ? Object.values(err.errors).map(e => e.message).join(', ')
                    : err.message
                errors.push({ row: i + 1, error: msg })
            }
        }

        res.json({
            message: `Processed ${rows.length} rows: ${results.length} created, ${errors.length} failed`,
            created: results,
            errors,
        })
    } catch (err) {
        res.status(500).json({ error: 'Failed to import CSV' })
    }
}

const checkConflicts = async (req, res) => {
    try {
        const { date } = req.body
        if (!date) return res.status(400).json({ error: 'Date is required' })

        const targetDate = new Date(date)
        const dateStr = targetDate.toISOString().split('T')[0]

        const bookings = await Booking.find({ date: dateStr })

        const leaves = await LeaveManagement.find({
            StartDate: { $lte: targetDate },
            EndDate: { $gte: targetDate },
            status: { $in: ['Pending', 'Accepted'] },
        }).populate('user', 'firstName lastName email')

        const dayStart = new Date(targetDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(targetDate)
        dayEnd.setHours(23, 59, 59, 999)

        const tasks = await Task.find({
            dueDate: { $gte: dayStart, $lte: dayEnd },
        }).populate('assignee', 'name email')

        const conflicts = {
            bookings: bookings.map(b => ({
                _id: b._id,
                type: 'booking',
                roomNo: b.roomNo,
                date: b.date,
                startTime: b.startTime,
                endTime: b.endTime,
                bookedBy: b.bookedBy,
            })),
            leaves: leaves.map(l => ({
                _id: l._id,
                type: 'leave',
                user: l.user ? `${l.user.firstName} ${l.user.lastName}` : 'Unknown',
                userEmail: l.user?.email,
                leaveType: l.leaveType,
                startDate: l.StartDate,
                endDate: l.EndDate,
                status: l.status,
            })),
            tasks: tasks.map(t => ({
                _id: t._id,
                type: 'task',
                title: t.title,
                assignee: t.assignee?.name || 'Unassigned',
                assigneeEmail: t.assignee?.email,
                dueDate: t.dueDate,
                priority: t.priority,
            })),
        }

        const hasConflicts =
            conflicts.bookings.length > 0 ||
            conflicts.leaves.length > 0 ||
            conflicts.tasks.length > 0

        res.json({ hasConflicts, conflicts })
    } catch (err) {
        console.error('[checkConflicts]', err)
        res.status(500).json({ error: 'Failed to check conflicts' })
    }
}

const flagConflicts = async (req, res) => {
    try {
        const { holidayName, date, conflicts } = req.body
        if (!conflicts) return res.status(400).json({ error: 'No conflicts to flag' })

        const notifications = []

        if (conflicts.bookingIds?.length) {
            const bookings = await Booking.find({ _id: { $in: conflicts.bookingIds } })
            for (const b of bookings) {
                const user = await User.findOne({
                    $expr: {
                        $eq: [
                            { $concat: ['$firstName', ' ', '$lastName'] },
                            b.bookedBy,
                        ],
                    },
                })
                if (user) {
                    await notifyUser(
                        user._id,
                        'conflict',
                        `Holiday Conflict: ${holidayName}`,
                        `Your booking for Room ${b.roomNo} on ${b.date} conflicts with the new holiday "${holidayName}". Please reschedule.`,
                        '/book-room'
                    )
                    notifications.push({ type: 'booking', userId: user._id })
                }
            }
        }

        if (conflicts.leaveIds?.length) {
            const leaves = await LeaveManagement.find({ _id: { $in: conflicts.leaveIds } })
            for (const l of leaves) {
                await notifyUser(
                    l.user,
                    'conflict',
                    `Holiday Conflict: ${holidayName}`,
                    `Your ${l.leaveType} (${new Date(l.StartDate).toLocaleDateString()} - ${new Date(l.EndDate).toLocaleDateString()}) overlaps with the new holiday "${holidayName}". You may want to adjust your leave.`,
                    '/Leave-management'
                )
                notifications.push({ type: 'leave', userId: l.user })
            }
        }

        if (conflicts.taskIds?.length) {
            const tasks = await Task.find({ _id: { $in: conflicts.taskIds } }).populate('assignee')
            for (const t of tasks) {
                if (t.assignee?.email) {
                    const user = await User.findOne({ email: t.assignee.email })
                    if (user) {
                        await notifyUser(
                            user._id,
                            'conflict',
                            `Holiday Conflict: ${holidayName}`,
                            `Your task "${t.title}" has a deadline on ${new Date(t.dueDate).toLocaleDateString()} which conflicts with the new holiday "${holidayName}". Consider requesting a deadline extension.`,
                            `/tasks/${t._id}`
                        )
                        notifications.push({ type: 'task', userId: user._id })
                    }
                }
            }
        }

        res.json({
            message: `Flagged conflicts and sent ${notifications.length} notifications`,
            notifications,
        })
    } catch (err) {
        console.error('[flagConflicts]', err)
        res.status(500).json({ error: 'Failed to flag conflicts' })
    }
}

module.exports = {
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    generateRecurring,
    importCSV,
    checkConflicts,
    flagConflicts,
}
