const Holiday = require('../model/Holiday')

// ---------------------------------------------------------------------------
// GET /api/holidays
// Fetch every holiday, sorted by date (earliest first) so the calendar
// and lists show them in chronological order.
// ---------------------------------------------------------------------------
const getHolidays = async (req, res) => {
    try {
        const holidays = await Holiday.find().sort({ date: 1 })
        res.json(holidays)
    } catch (err) {
        // 500 = something went wrong on the server, not the client's fault
        res.status(500).json({ error: 'Failed to fetch holidays' })
    }
}

// ---------------------------------------------------------------------------
// POST /api/holidays
// Create a new holiday.  Mongoose validates required fields, enum values,
// and minlength — if validation fails, we catch the error and send back
// a readable message instead of a raw stack trace.
// ---------------------------------------------------------------------------
const createHoliday = async (req, res) => {
    try {
        const { name, date, type } = req.body
        const holiday = await Holiday.create({ name, date, type })
        // 201 = "Created" — the standard success code for POST
        res.status(201).json(holiday)
    } catch (err) {
        // Mongoose validation errors have a `.name` of "ValidationError"
        if (err.name === 'ValidationError') {
            // Pull out the first human-readable validation message
            const messages = Object.values(err.errors).map(e => e.message)
            return res.status(400).json({ error: messages.join(', ') })
        }
        res.status(500).json({ error: 'Failed to create holiday' })
    }
}

// ---------------------------------------------------------------------------
// PUT /api/holidays/:id
// Update an existing holiday by its MongoDB _id.
// Returns 404 if the id doesn't match any document.
// ---------------------------------------------------------------------------
const updateHoliday = async (req, res) => {
    try {
        const { id } = req.params
        const { name, date, type } = req.body

        // `runValidators: true` re-runs schema validation on the new values
        // `new: true` returns the updated document instead of the old one
        const updated = await Holiday.findByIdAndUpdate(
            id,
            { name, date, type },
            { new: true, runValidators: true }
        )

        if (!updated) {
            return res.status(404).json({ error: 'Holiday not found' })
        }

        res.json(updated)
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message)
            return res.status(400).json({ error: messages.join(', ') })
        }
        res.status(500).json({ error: 'Failed to update holiday' })
    }
}

// ---------------------------------------------------------------------------
// DELETE /api/holidays/:id
// Remove a holiday by its MongoDB _id.
// ---------------------------------------------------------------------------
const deleteHoliday = async (req, res) => {
    try {
        const { id } = req.params
        const deleted = await Holiday.findByIdAndDelete(id)

        if (!deleted) {
            return res.status(404).json({ error: 'Holiday not found' })
        }

        // Return the deleted document so the frontend can confirm what was removed
        res.json(deleted)
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete holiday' })
    }
}

module.exports = { getHolidays, createHoliday, updateHoliday, deleteHoliday }
