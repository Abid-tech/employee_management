const Reminder = require("../model/reminder")
const calendarService = require("../service/calendar_service")
const holidayService = require("../service/holiday_service")

// GET /api/calendar/events?from=2026-08-01&to=2026-08-31
const listEvents = async (req, res, next) => {
    try {
        const { from, to } = req.query

        if (!holidayService.isDate(from) || !holidayService.isDate(to)) {
            return res.status(400).json({
                success: false,
                message: "Give a from and to date, both written as YYYY-MM-DD."
            })
        }

        // Cap the window; a wide range multiplies five queries by its length.
        if (calendarService.datesBetween(from, to).length > 400) {
            return res.status(400).json({
                success: false,
                message: "That range is longer than a year. Ask for a shorter one."
            })
        }

        const events = await calendarService.eventsBetween({
            from,
            to,
            userId: req.user && req.user.userId
        })

        res.json({ success: true, from, to, count: events.length, events })
    } catch (err) {
        next(err)
    }
}

// GET /api/calendar/reminders?from=&to=
const listReminders = async (req, res, next) => {
    try {
        const reminders = await Reminder.find({ user: req.user.userId })
            .sort({ date: 1 })
            .lean()

        res.json({ success: true, reminders })
    } catch (err) {
        next(err)
    }
}

// POST /api/calendar/reminders
const createReminder = async (req, res, next) => {
    try {
        const { title, date, note } = req.body || {}

        if (!title || !String(title).trim()) {
            return res.status(400).json({ success: false, message: "Give the reminder a title." })
        }

        if (!holidayService.isDate(date)) {
            return res.status(400).json({
                success: false,
                message: "Pick a date. It must be written as YYYY-MM-DD."
            })
        }

        const reminder = await Reminder.create({
            user: req.user.userId,
            title: String(title).trim(),
            date,
            note: note || ""
        })

        res.status(201).json({ success: true, reminder })
    } catch (err) {
        next(err)
    }
}

// DELETE /api/calendar/reminders/:id  - scoped to the signed-in user.
const deleteReminder = async (req, res, next) => {
    try {
        const reminder = await Reminder.findOneAndDelete({
            _id: req.params.id,
            user: req.user.userId
        })

        if (!reminder) {
            return res.status(404).json({ success: false, message: "That reminder no longer exists." })
        }

        res.json({ success: true, message: "Reminder removed." })
    } catch (err) {
        next(err)
    }
}

// GET /api/calendar/holidays.ics  - public, so it carries holidays only.
const holidayFeed = async (req, res, next) => {
    try {
        const base = new Date().getFullYear()

        // Last year through two ahead, so the feed does not run out.
        const years = [base - 1, base, base + 1, base + 2]

        const ics = await calendarService.holidaysAsIcs({ years })

        res.set("Content-Type", "text/calendar; charset=utf-8")
        res.set("Content-Disposition", 'inline; filename="company-holidays.ics"')

        // Calendar clients poll this, so cache for an hour.
        res.set("Cache-Control", "public, max-age=3600")

        res.send(ics)
    } catch (err) {
        next(err)
    }
}

module.exports = {
    listEvents,
    listReminders,
    createReminder,
    deleteReminder,
    holidayFeed
}
