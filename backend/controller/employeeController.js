const Employee = require('../model/Employee')

// ---------------------------------------------------------------------------
// GET /api/employees
// Fetch all employees, newest first.
// ---------------------------------------------------------------------------
const getEmployees = async (req, res) => {
    try {
        const employees = await Employee.find().sort({ createdAt: -1 })
        res.json(employees)
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch employees' })
    }
}

// ---------------------------------------------------------------------------
// POST /api/employees
// Create a new employee with a name and role.
// ---------------------------------------------------------------------------
const createEmployee = async (req, res) => {
    try {
        const { name, role } = req.body
        const employee = await Employee.create({ name, role })
        res.status(201).json(employee)
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message)
            return res.status(400).json({ error: messages.join(', ') })
        }
        res.status(500).json({ error: 'Failed to create employee' })
    }
}

module.exports = { getEmployees, createEmployee }
