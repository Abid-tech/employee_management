const Employee = require('../model/Employee')

const getEmployees = async (req, res) => {
    try {
        const employees = await Employee.find({ isActive: true }).sort({ createdAt: -1 })
        res.json(employees)
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch employees' })
    }
}

const getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id)
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' })
        }
        res.json(employee)
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch employee' })
    }
}

module.exports = { getEmployees, getEmployeeById }
