const Employee = require('../model/Employee')

const getEmployees = async (req, res) => {
    try {
        const employees = await Employee.find().sort({ createdAt: -1 })
        res.json(employees)
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch employees' })
    }
}

const createEmployee = async (req, res) => {
    try {
        const { name, role, team, employeeId, email, joiningDate, department } = req.body
        const employee = await Employee.create({
            name, role, team, employeeId, email, joiningDate, department,
        })
        res.status(201).json(employee)
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message)
            return res.status(400).json({ error: messages.join(', ') })
        }
        res.status(500).json({ error: 'Failed to create employee' })
    }
}

const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params
        const { name, role, team, employeeId, email, joiningDate, department, isActive } = req.body

        const updated = await Employee.findByIdAndUpdate(
            id,
            { name, role, team, employeeId, email, joiningDate, department, isActive },
            { new: true, runValidators: true }
        )

        if (!updated) {
            return res.status(404).json({ error: 'Employee not found' })
        }

        res.json(updated)
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message)
            return res.status(400).json({ error: messages.join(', ') })
        }
        res.status(500).json({ error: 'Failed to update employee' })
    }
}

const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params
        const deleted = await Employee.findByIdAndDelete(id)

        if (!deleted) {
            return res.status(404).json({ error: 'Employee not found' })
        }

        res.json(deleted)
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete employee' })
    }
}

module.exports = { getEmployees, createEmployee, updateEmployee, deleteEmployee }
