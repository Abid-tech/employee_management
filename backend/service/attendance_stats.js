// Attendance shaped for the heatmap and the seven-day trend.

const Attendance = require("../model/attendance")

const pad = (n) => String(n).padStart(2, "0")
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Hours worked. null means clocked in but not out.
const hoursWorked = (record) => {
    const start = record.checkIn && record.checkIn.time
    const end = record.checkOut && record.checkOut.time

    if (!start) return 0
    if (!end) return null

    const hours = (new Date(end) - new Date(start)) / 3600000
    return hours > 0 ? Math.round(hours * 100) / 100 : 0
}

// One entry per day, oldest first, including days with no record.
const daily = async (userId, days) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const from = new Date(today)
    from.setDate(from.getDate() - (days - 1))

    const records = await Attendance.find({
        user: userId,
        date: { $gte: key(from), $lte: key(today) }
    }).lean()

    const byDate = new Map(records.map((r) => [r.date, r]))

    const out = []
    const cursor = new Date(from)

    while (cursor <= today) {
        const date = key(cursor)
        const record = byDate.get(date)
        const hours = record ? hoursWorked(record) : 0

        out.push({
            date,
            weekday: cursor.getDay(),
            present: Boolean(record && record.checkIn && record.checkIn.time),
            open: record ? hours === null : false,
            hours: hours === null ? 0 : hours
        })

        cursor.setDate(cursor.getDate() + 1)
    }

    return out
}

// 365 days for the heatmap, the last 7 for the trend, plus totals.
const summary = async (userId) => {
    const year = await daily(userId, 365)
    const week = year.slice(-7)

    const presentDays = year.filter((d) => d.present).length
    const totalHours = year.reduce((sum, d) => sum + d.hours, 0)

    // Averaged over days attended, not over the whole year.
    const averageHours = presentDays ? totalHours / presentDays : 0

    const weekHours = week.reduce((sum, d) => sum + d.hours, 0)

    return {
        heatmap: year,
        trend: week,
        totals: {
            presentDays,
            totalHours: Math.round(totalHours * 10) / 10,
            averageHours: Math.round(averageHours * 10) / 10,
            weekHours: Math.round(weekHours * 10) / 10,
            weekPresent: week.filter((d) => d.present).length,
            busiestDay: year.reduce((best, d) => (d.hours > (best ? best.hours : 0) ? d : best), null)
        }
    }
}

module.exports = { summary, daily }
