const Reminder = require('../model/Reminder')

const getReminders = async (req, res) => {
    try {
        const { employeeId } = req.params
        const reminders = await Reminder.find({ employeeId }).sort({ date: 1 })
        res.json(reminders)
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reminders' })
    }
}

const createReminder = async (req, res) => {
    try {
        const { employeeId, title, date, note, isAlarm } = req.body
        const reminder = await Reminder.create({ employeeId, title, date, note, isAlarm })
        res.status(201).json(reminder)
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message)
            return res.status(400).json({ error: messages.join(', ') })
        }
        res.status(500).json({ error: 'Failed to create reminder' })
    }
}

const updateReminder = async (req, res) => {
    try {
        const { id } = req.params
        const { title, date, note, isAlarm } = req.body

        const updated = await Reminder.findByIdAndUpdate(
            id,
            { title, date, note, isAlarm },
            { new: true, runValidators: true }
        )

        if (!updated) {
            return res.status(404).json({ error: 'Reminder not found' })
        }

        res.json(updated)
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message)
            return res.status(400).json({ error: messages.join(', ') })
        }
        res.status(500).json({ error: 'Failed to update reminder' })
    }
}

const deleteReminder = async (req, res) => {
    try {
        const { id } = req.params
        const deleted = await Reminder.findByIdAndDelete(id)

        if (!deleted) {
            return res.status(404).json({ error: 'Reminder not found' })
        }

        res.json(deleted)
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete reminder' })
    }
}

module.exports = { getReminders, createReminder, updateReminder, deleteReminder }
