const Holiday = require('../model/Holiday')
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
        const { name, date, type, description } = req.body
        const holiday = await Holiday.create({ name, date, type, description })

        // Sync to Google Calendar (non-blocking for the user — errors are logged)
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
        const { name, date, type, description } = req.body

        const updated = await Holiday.findByIdAndUpdate(
            id,
            { name, date, type, description },
            { new: true, runValidators: true }
        )

        if (!updated) {
            return res.status(404).json({ error: 'Holiday not found' })
        }

        // Sync the change to Google Calendar
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

        if (!holiday) {
            return res.status(404).json({ error: 'Holiday not found' })
        }

        // Remove from Google Calendar first
        await deleteCalendarEvent(holiday.googleEventId)

        await Holiday.findByIdAndDelete(id)

        res.json(holiday)
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete holiday' })
    }
}

module.exports = { getHolidays, createHoliday, updateHoliday, deleteHoliday }
