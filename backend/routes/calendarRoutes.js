const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/authMiddleware')
const {
    getCalendarEvents,
    getPersonalReminders,
    createPersonalReminder,
    updatePersonalReminder,
    deletePersonalReminder,
} = require('../controller/calendarController')

// Company calendar feed - public (events are org-wide)
router.get('/events', getCalendarEvents)

// Google Calendar subscribe URL from Module 2
router.get('/subscribe-link', (req, res) => {
    const url = process.env.GOOGLE_CALENDAR_SUBSCRIBE_URL
    if (!url) {
        return res.status(404).json({ error: 'Subscribe URL not configured' })
    }
    res.json({ url })
})

// Personal reminders - auth required
router.get('/reminders', authMiddleware, getPersonalReminders)
router.post('/reminders', authMiddleware, createPersonalReminder)
router.put('/reminders/:id', authMiddleware, updatePersonalReminder)
router.delete('/reminders/:id', authMiddleware, deletePersonalReminder)

module.exports = router
