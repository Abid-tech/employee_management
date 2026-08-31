// Merged event feed and the iCalendar subscription file.

const LeaveManagement = require("../model/leave_management")
const Booking = require("../model/Booking")
const Task = require("../model/task")
const Reminder = require("../model/reminder")

// Registers the User and Employee schemas for populate().
require("../model/employee")
require("../model/user")
const mongoose = require("mongoose")
const holidayService = require("./holiday_service")

const pad = (n) => String(n).padStart(2, "0")

const toKey = (value) => {
    const d = new Date(value)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const dayWindow = (date) => {
    const [y, m, d] = date.split("-").map(Number)
    return {
        start: new Date(y, m - 1, d, 0, 0, 0, 0),
        end: new Date(y, m - 1, d, 23, 59, 59, 999)
    }
}

// Every date from `from` to `to` inclusive, as 'YYYY-MM-DD'.
const datesBetween = (from, to) => {
    const out = []
    const [fy, fm, fd] = from.split("-").map(Number)
    const [ty, tm, td] = to.split("-").map(Number)

    const cursor = new Date(fy, fm - 1, fd)
    const last = new Date(ty, tm - 1, td)

    while (cursor <= last) {
        out.push(toKey(cursor))
        cursor.setDate(cursor.getDate() + 1)
    }

    return out
}

// All events between two dates, flattened.
const eventsBetween = async ({ from, to, userId = null }) => {
    if (!holidayService.isDate(from) || !holidayService.isDate(to)) {
        throw new Error("Both dates must be written as YYYY-MM-DD.")
    }

    const window = { start: dayWindow(from).start, end: dayWindow(to).end }
    const span = datesBetween(from, to)
    const spanSet = new Set(span)

    // Holidays are listed per year, so a range crossing new year needs both.
    const years = [...new Set(span.map((d) => Number(d.slice(0, 4))))]
    const holidayLists = await Promise.all(years.map((y) => holidayService.listForYear(y)))

    // Meeting is registered by its own module; read it from the registry.
    const Meeting = mongoose.models.Meeting || null

    const [leaves, bookings, tasks, reminders, meetings] = await Promise.all([
        LeaveManagement.find({
            status: "Accepted",
            StartDate: { $lte: window.end },
            EndDate: { $gte: window.start }
        })
            .populate("user", "firstName lastName")
            .lean(),

        Booking.find({ date: { $in: span } }).lean(),

        Task.find({ dueDate: { $gte: window.start, $lte: window.end } })
            .select("title dueDate status priority assignee")
            .populate("assignee", "name")
            .lean(),

        userId
            ? Reminder.find({ user: userId, date: { $in: span } }).lean()
            : Promise.resolve([]),

        Meeting
            ? Meeting.find({ scheduledDate: { $in: span } })
                .select("meetingId title scheduledDate scheduledTime status")
                .lean()
                .catch(() => [])
            : Promise.resolve([])
    ])

    const events = []

    for (const list of holidayLists) {
        for (const holiday of list) {
            if (!spanSet.has(holiday.occursOn)) continue

            events.push({
                source: "holiday",
                date: holiday.occursOn,
                title: holiday.name,
                detail: holiday.type + (holiday.recurringAnnually ? " · repeats yearly" : ""),
                id: String(holiday._id)
            })
        }
    }

    // Leave spans days, so it appears on each day it covers.
    for (const leave of leaves) {
        const person = leave.user
            ? `${leave.user.firstName || ""} ${leave.user.lastName || ""}`.trim()
            : "Someone"

        for (const date of datesBetween(toKey(leave.StartDate), toKey(leave.EndDate))) {
            if (!spanSet.has(date)) continue

            events.push({
                source: "leave",
                date,
                title: `${person || "Someone"} on leave`,
                detail: `${leave.leaveType} · ${leave.leaveDuration}`,
                id: String(leave._id)
            })
        }
    }

    for (const booking of bookings) {
        events.push({
            source: "booking",
            date: booking.date,
            title: `Room ${booking.roomNo}`,
            detail: `${booking.startTime}–${booking.endTime} · ${booking.bookedBy}`,
            id: String(booking._id)
        })
    }

    for (const task of tasks) {
        events.push({
            source: "deadline",
            date: toKey(task.dueDate),
            title: task.title,
            detail: `Due · ${(task.assignee && task.assignee.name) || "Unassigned"}`,
            id: String(task._id)
        })
    }

    for (const meeting of meetings) {
        events.push({
            source: "meeting",
            date: meeting.scheduledDate,
            title: meeting.title || "Meeting",
            detail: [meeting.scheduledTime, meeting.status].filter(Boolean).join(" · "),
            id: String(meeting._id)
        })
    }

    for (const reminder of reminders) {
        events.push({
            source: "reminder",
            date: reminder.date,
            title: reminder.title,
            detail: reminder.note || "Personal reminder",
            id: String(reminder._id)
        })
    }

    return events.sort((a, b) => a.date.localeCompare(b.date) || a.source.localeCompare(b.source))
}

// Escape the characters iCalendar treats as separators.
const escapeText = (value) =>
    String(value)
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r?\n/g, "\\n")

// RFC 5545 folds lines at 75 octets.
const fold = (line) => {
    if (line.length <= 75) return line

    const parts = [line.slice(0, 75)]
    let rest = line.slice(75)

    while (rest.length > 74) {
        parts.push(" " + rest.slice(0, 74))
        rest = rest.slice(74)
    }

    if (rest.length) parts.push(" " + rest)
    return parts.join("\r\n")
}

// Holidays as an iCalendar feed. Holidays only - the URL is public.
const holidaysAsIcs = async ({ years }) => {
    const lists = await Promise.all(years.map((y) => holidayService.listForYear(y)))

    // Emit a recurring holiday once, with an RRULE.
    const seen = new Set()
    const rows = []

    for (const list of lists) {
        for (const holiday of list) {
            const key = String(holiday._id)

            if (holiday.recurringAnnually) {
                if (seen.has(key)) continue
                seen.add(key)
                rows.push({ ...holiday, emitOn: holiday.date })
            } else {
                rows.push({ ...holiday, emitOn: holiday.occursOn })
            }
        }
    }

    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Company Booster//Company Holidays//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Company Booster holidays",
        "X-WR-TIMEZONE:Asia/Dhaka"
    ]

    for (const holiday of rows) {
        const day = holiday.emitOn.replace(/-/g, "")

        // DTEND is exclusive, so an all-day event ends the next day.
        const [y, m, d] = holiday.emitOn.split("-").map(Number)
        const next = new Date(y, m - 1, d + 1)
        const end = `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`

        lines.push("BEGIN:VEVENT")
        lines.push(`UID:holiday-${holiday._id}@company-booster`)
        lines.push(`DTSTAMP:${stamp}`)
        lines.push(`DTSTART;VALUE=DATE:${day}`)
        lines.push(`DTEND;VALUE=DATE:${end}`)
        lines.push(fold(`SUMMARY:${escapeText(holiday.name)}`))

        if (holiday.description) {
            lines.push(fold(`DESCRIPTION:${escapeText(holiday.description)}`))
        }

        lines.push(fold(`CATEGORIES:${escapeText(holiday.type)}`))

        if (holiday.recurringAnnually) {
            lines.push("RRULE:FREQ=YEARLY")
        }

        lines.push("TRANSP:TRANSPARENT")
        lines.push("END:VEVENT")
    }

    lines.push("END:VCALENDAR")

    // The format requires CRLF between lines, not LF.
    return lines.join("\r\n") + "\r\n"
}

module.exports = {
    eventsBetween,
    holidaysAsIcs,
    datesBetween,
    toKey
}
