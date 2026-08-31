// Company holidays: listing, recurrence, conflict detection and CSV import

const Holiday = require("../model/holiday")
const LeaveManagement = require("../model/leave_management")
const Booking = require("../model/Booking")
const Task = require("../model/task")

// Registers the Employee schema for populate().
require("../model/employee")

const DATE = /^\d{4}-\d{2}-\d{2}$/

const isDate = (value) => typeof value === "string" && DATE.test(value)

// Start and end of a day, for models storing real Dates.
const dayWindow = (date) => {
    const [y, m, d] = date.split("-").map(Number)
    return {
        start: new Date(y, m - 1, d, 0, 0, 0, 0),
        end: new Date(y, m - 1, d, 23, 59, 59, 999)
    }
}

const pad = (n) => String(n).padStart(2, "0")
const toDate = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`

// Holidays in `year`, with recurring ones projected onto it.
const listForYear = async (year) => {
    const holidays = await Holiday.find({}).sort({ date: 1 }).lean()

    const out = []

    for (const holiday of holidays) {
        const [y, m, d] = holiday.date.split("-").map(Number)

        if (y === year) {
            out.push({ ...holiday, occursOn: holiday.date, projected: false })
            continue
        }

        // Recurring holidays project forward only.
        if (holiday.recurringAnnually && year > y) {
            // 29 Feb falls back to the 28th in a common year.
            const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
            const adjusted = m === 2 && d === 29 && !isLeap

            out.push({
                ...holiday,
                occursOn: toDate(year, m, adjusted ? 28 : d),
                projected: true,
                adjusted
            })
        }
    }

    return out.sort((a, b) => a.occursOn.localeCompare(b.occursOn))
}

// Bookings, approved leave and task deadlines already on `date`.
const findConflicts = async (date) => {
    if (!isDate(date)) {
        throw new Error("Date must be written as YYYY-MM-DD.")
    }

    const { start, end } = dayWindow(date)

    const [bookings, leaves, tasks] = await Promise.all([
        // Room bookings key on the same string, so this is a direct match.
        Booking.find({ date }).lean(),

        // Approved leave only; pending is not a commitment.
        LeaveManagement.find({
            status: "Accepted",
            StartDate: { $lte: end },
            EndDate: { $gte: start }
        })
            .populate("user", "firstName lastName email")
            .lean(),

        Task.find({ dueDate: { $gte: start, $lte: end } })
            .select("title dueDate assignee status")
            .populate("assignee", "name")
            .lean()
    ])

    const conflicts = []

    for (const booking of bookings) {
        conflicts.push({
            kind: "Room booking",
            summary: `Room ${booking.roomNo} is booked ${booking.startTime}–${booking.endTime}`,
            who: booking.bookedBy || "Unknown",
            id: String(booking._id)
        })
    }

    for (const leave of leaves) {
        const person = leave.user
            ? `${leave.user.firstName || ""} ${leave.user.lastName || ""}`.trim()
            : "Unknown"

        conflicts.push({
            kind: "Approved leave",
            summary: `${leave.leaveType} already approved across this day`,
            who: person || "Unknown",
            id: String(leave._id)
        })
    }

    // assignee is a ref, so an unassigned task reads as null.
    for (const task of tasks) {
        conflicts.push({
            kind: "Task deadline",
            summary: `"${task.title}" is due on this day`,
            who: (task.assignee && task.assignee.name) || "Unassigned",
            id: String(task._id)
        })
    }

    return conflicts
}

// De-duplicated names from a conflict list.
const affectedPeople = (conflicts) => {
    const seen = new Set()

    for (const conflict of conflicts) {
        if (conflict.who && conflict.who !== "Unknown" && conflict.who !== "Unassigned") {
            seen.add(conflict.who)
        }
    }

    return [...seen].sort()
}

// Parse a holidays CSV. Bad rows are reported, not fatal.
const parseCsv = (text) => {
    const lines = String(text)
        .replace(/^﻿/, "")            // Excel writes a byte-order mark
        .split(/\r\n|\n|\r/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

    if (lines.length === 0) {
        return { rows: [], errors: [{ line: 0, message: "The file is empty." }] }
    }

    const separator = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ","

    const splitRow = (line) => {
        const cells = []
        let cell = ""
        let quoted = false

        for (let i = 0; i < line.length; i++) {
            const ch = line[i]

            if (ch === '"') {
                // A doubled quote inside a quoted field is one literal quote.
                if (quoted && line[i + 1] === '"') {
                    cell += '"'
                    i++
                } else {
                    quoted = !quoted
                }
                continue
            }

            if (ch === separator && !quoted) {
                cells.push(cell.trim())
                cell = ""
                continue
            }

            cell += ch
        }

        cells.push(cell.trim())
        return cells
    }

    const first = splitRow(lines[0]).map((c) => c.toLowerCase())
    const hasHeader = first.includes("name") || first.includes("date")
    const body = hasHeader ? lines.slice(1) : lines
    const offset = hasHeader ? 2 : 1

    const rows = []
    const errors = []

    body.forEach((line, index) => {
        const lineNumber = index + offset
        const [name, date, type, recurring] = splitRow(line)

        if (!name) {
            errors.push({ line: lineNumber, message: "No holiday name in this row." })
            return
        }

        if (!isDate(date)) {
            errors.push({
                line: lineNumber,
                message: `"${date || ""}" is not a date written as YYYY-MM-DD.`
            })
            return
        }

        const wanted = (type || "Company").trim()
        const matched = ["Public", "Company", "Optional"]
            .find((t) => t.toLowerCase() === wanted.toLowerCase())

        if (!matched) {
            errors.push({
                line: lineNumber,
                message: `"${wanted}" is not one of Public, Company or Optional.`
            })
            return
        }

        const flag = String(recurring || "").trim().toLowerCase()

        rows.push({
            name,
            date,
            type: matched,
            recurringAnnually: ["yes", "true", "y", "1"].includes(flag)
        })
    })

    return { rows, errors }
}

module.exports = {
    listForYear,
    findConflicts,
    affectedPeople,
    parseCsv,
    isDate
}
