// Attendance shaped for the two charts the dashboard requirement names: a
// year-long heatmap and a seven-day trend.
//
// Both read the same records the clock-in screen writes, so nothing here has to
// be kept in step with anything — the charts are a view of the ledger.

const Attendance = require("../model/attendance")

const pad = (n) => String(n).padStart(2, "0")
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Hours between the two stamps. A day clocked in but never clocked out returns
// null rather than zero, so an open day is drawn as "still in" instead of being
// averaged in as a day of no work.
const hoursWorked = (record) => {
    const start = record.checkIn && record.checkIn.time
    const end = record.checkOut && record.checkOut.time

    if (!start) return 0
    if (!end) return null

    const hours = (new Date(end) - new Date(start)) / 3600000
    return hours > 0 ? Math.round(hours * 100) / 100 : 0
}

/**
 * One entry per day for the last `days` days, oldest first, including days with
 * no record — a heatmap with gaps knocked out of it is unreadable, and absence
 * is exactly what the chart is meant to show.
 */
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

/**
 * Everything the dashboard needs in one call: 365 days for the heatmap, the
 * last 7 for the trend, and the headline numbers underneath them.
 */
const summary = async (userId) => {
    const year = await daily(userId, 365)
    const week = year.slice(-7)

    const presentDays = year.filter((d) => d.present).length
    const totalHours = year.reduce((sum, d) => sum + d.hours, 0)

    // Averaged over days actually attended, not over the whole year — dividing
    // by 365 would report about two hours a day for a full-time employee and
    // read as a bug.
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
