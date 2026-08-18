const Holiday = require('../model/Holiday')
const Booking = require('../model/Booking')
const LeaveManagement = require('../model/LeaveManagement')
const Task = require('../model/Task')
const Reminder = require('../model/Reminder')
const User = require('../model/User')
const Employee = require('../model/Employee')

const getCalendarEvents = async (req, res) => {
    try {
        const { start, end } = req.query
        const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), 0, 1)
        const endDate = end ? new Date(end) : new Date(new Date().getFullYear(), 11, 31)
        const startStr = startDate.toISOString().split('T')[0]
        const endStr = endDate.toISOString().split('T')[0]

        const events = []

        const holidays = await Holiday.find({
            date: { $gte: startDate, $lte: endDate },
        }).lean()
        for (const h of holidays) {
            events.push({
                _id: h._id,
                category: 'holiday',
                title: h.name,
                date: h.date,
                type: h.type,
                description: h.description,
                isRecurring: h.isRecurring,
            })
        }

        const bookings = await Booking.find({
            date: { $gte: startStr, $lte: endStr },
        }).lean()
        for (const b of bookings) {
            events.push({
                _id: b._id,
                category: 'meeting',
                title: `Room ${b.roomNo} - ${b.bookedBy}`,
                date: b.date,
                startTime: b.startTime,
                endTime: b.endTime,
                bookedBy: b.bookedBy,
            })
        }

        const leaves = await LeaveManagement.find({
            status: 'Accepted',
            StartDate: { $lte: endDate },
            EndDate: { $gte: startDate },
        }).populate('user', 'firstName lastName').lean()
        for (const l of leaves) {
            events.push({
                _id: l._id,
                category: 'leave',
                title: `${l.user?.firstName || ''} ${l.user?.lastName || ''} - ${l.leaveType}`,
                date: l.StartDate,
                endDate: l.EndDate,
                leaveType: l.leaveType,
            })
        }

        const tasks = await Task.find({
            dueDate: { $gte: startDate, $lte: endDate },
        }).populate('assignee', 'name').lean()
        for (const t of tasks) {
            events.push({
                _id: t._id,
                category: 'deadline',
                title: t.title,
                date: t.dueDate,
                assignee: t.assignee?.name || 'Unassigned',
                priority: t.priority,
                status: t.status,
            })
        }

        events.sort((a, b) => new Date(a.date) - new Date(b.date))
        res.json(events)
    } catch (err) {
        console.error('[calendarEvents]', err)
        res.status(500).json({ error: 'Failed to fetch calendar events' })
    }
}

const getPersonalReminders = async (req, res) => {
    try {
        const userId = req.user.userId
        const reminders = await Reminder.find({ userId }).sort({ date: 1 }).lean()
        res.json(reminders)
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reminders' })
    }
}

const createPersonalReminder = async (req, res) => {
    try {
        const userId = req.user.userId
        const { title, date, time, note, isAlarm } = req.body
        const reminder = await Reminder.create({ userId, title, date, time, note, isAlarm })
        res.status(201).json(reminder)
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message)
            return res.status(400).json({ error: messages.join(', ') })
        }
        res.status(500).json({ error: 'Failed to create reminder' })
    }
}

const updatePersonalReminder = async (req, res) => {
    try {
        const { id } = req.params
        const { title, date, time, note, isAlarm } = req.body
        const updated = await Reminder.findOneAndUpdate(
            { _id: id, userId: req.user.userId },
            { title, date, time, note, isAlarm },
            { new: true, runValidators: true }
        )
        if (!updated) return res.status(404).json({ error: 'Reminder not found' })
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: 'Failed to update reminder' })
    }
}

const deletePersonalReminder = async (req, res) => {
    try {
        const { id } = req.params
        const deleted = await Reminder.findOneAndDelete({ _id: id, userId: req.user.userId })
        if (!deleted) return res.status(404).json({ error: 'Reminder not found' })
        res.json(deleted)
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete reminder' })
    }
}

module.exports = {
    getCalendarEvents,
    getPersonalReminders,
    createPersonalReminder,
    updatePersonalReminder,
    deletePersonalReminder,
}
