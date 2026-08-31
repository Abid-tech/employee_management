const Holiday = require("../model/holiday")
const holidayService = require("../service/holiday_service")

// Roles allowed to change the calendar.
const MAY_EDIT = ["Admin", "Director"]

const canEdit = (req) => MAY_EDIT.includes(req.user && req.user.role)

const forbidden = (res) =>
    res.status(403).json({
        success: false,
        message: "Only an administrator or director can change company holidays."
    })

const currentYear = () => new Date().getFullYear()

// GET /api/holidays?year=2026
const listHolidays = async (req, res, next) => {
    try {
        const year = Number(req.query.year) || currentYear()

        if (!Number.isInteger(year) || year < 1970 || year > 2200) {
            return res.status(400).json({
                success: false,
                message: "That is not a year this calendar can show."
            })
        }

        const holidays = await holidayService.listForYear(year)

        res.json({ success: true, year, count: holidays.length, holidays })
    } catch (err) {
        next(err)
    }
}

// GET /api/holidays/conflicts?date=  - checked as the form is filled in.
const previewConflicts = async (req, res, next) => {
    try {
        if (!canEdit(req)) return forbidden(res)

        const conflicts = await holidayService.findConflicts(req.query.date)

        res.json({
            success: true,
            date: req.query.date,
            conflicts,
            affected: holidayService.affectedPeople(conflicts)
        })
    } catch (err) {
        if (err.message.includes("YYYY-MM-DD")) {
            return res.status(400).json({ success: false, message: err.message })
        }
        next(err)
    }
}

// POST /api/holidays. A conflict warns but never blocks the save. — a public
const createHoliday = async (req, res, next) => {
    try {
        if (!canEdit(req)) return forbidden(res)

        const { name, date, type, recurringAnnually, description } = req.body || {}

        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, message: "Give the holiday a name." })
        }

        if (!holidayService.isDate(date)) {
            return res.status(400).json({
                success: false,
                message: "Pick a date. It must be written as YYYY-MM-DD."
            })
        }

        const existing = await Holiday.findOne({ date }).lean()

        if (existing) {
            return res.status(409).json({
                success: false,
                message: `${existing.name} is already set for ${date}.`
            })
        }

        const conflicts = await holidayService.findConflicts(date)

        const holiday = await Holiday.create({
            name: String(name).trim(),
            date,
            type: type || "Company",
            recurringAnnually: Boolean(recurringAnnually),
            description: description || "",
            createdBy: (req.user && req.user.email) || ""
        })

        res.status(201).json({
            success: true,
            holiday,
            conflicts,
            affected: holidayService.affectedPeople(conflicts)
        })
    } catch (err) {
        next(err)
    }
}

// PUT /api/holidays/:id
const updateHoliday = async (req, res, next) => {
    try {
        if (!canEdit(req)) return forbidden(res)

        const { name, date, type, recurringAnnually, description } = req.body || {}
        const update = {}

        if (name !== undefined) update.name = String(name).trim()
        if (type !== undefined) update.type = type
        if (description !== undefined) update.description = description
        if (recurringAnnually !== undefined) update.recurringAnnually = Boolean(recurringAnnually)

        if (date !== undefined) {
            if (!holidayService.isDate(date)) {
                return res.status(400).json({
                    success: false,
                    message: "The date must be written as YYYY-MM-DD."
                })
            }

            const clash = await Holiday.findOne({ date, _id: { $ne: req.params.id } }).lean()

            if (clash) {
                return res.status(409).json({
                    success: false,
                    message: `${clash.name} is already set for ${date}.`
                })
            }

            update.date = date
        }

        const holiday = await Holiday.findByIdAndUpdate(req.params.id, update, {
            new: true,
            runValidators: true
        })

        if (!holiday) {
            return res.status(404).json({ success: false, message: "That holiday no longer exists." })
        }

        const conflicts = await holidayService.findConflicts(holiday.date)

        res.json({
            success: true,
            holiday,
            conflicts,
            affected: holidayService.affectedPeople(conflicts)
        })
    } catch (err) {
        next(err)
    }
}

// DELETE /api/holidays/:id
const deleteHoliday = async (req, res, next) => {
    try {
        if (!canEdit(req)) return forbidden(res)

        const holiday = await Holiday.findByIdAndDelete(req.params.id)

        if (!holiday) {
            return res.status(404).json({ success: false, message: "That holiday no longer exists." })
        }

        res.json({ success: true, message: `${holiday.name} was removed.` })
    } catch (err) {
        next(err)
    }
}

// POST /api/holidays/import { csv: "name,date,type,recurring\n..." }
const importHolidays = async (req, res, next) => {
    try {
        if (!canEdit(req)) return forbidden(res)

        const csv = (req.body && req.body.csv) || ""

        if (!String(csv).trim()) {
            return res.status(400).json({
                success: false,
                message: "No CSV content arrived. Choose a file and try again."
            })
        }

        const { rows, errors } = holidayService.parseCsv(csv)

        const created = []
        const skipped = []

        for (const row of rows) {
            const existing = await Holiday.findOne({ date: row.date }).lean()

            if (existing) {
                skipped.push({ date: row.date, reason: `${existing.name} is already set for this date.` })
                continue
            }

            const holiday = await Holiday.create({
                ...row,
                createdBy: (req.user && req.user.email) || ""
            })

            created.push(holiday)
        }

        // Report conflicts for the dates that saved.
        const conflicts = []

        for (const holiday of created) {
            const found = await holidayService.findConflicts(holiday.date)
            if (found.length) conflicts.push({ date: holiday.date, name: holiday.name, conflicts: found })
        }

        res.json({
            success: true,
            imported: created.length,
            skipped,
            rejected: errors,
            conflicts,
            holidays: created
        })
    } catch (err) {
        next(err)
    }
}

module.exports = {
    listHolidays,
    previewConflicts,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    importHolidays
}
