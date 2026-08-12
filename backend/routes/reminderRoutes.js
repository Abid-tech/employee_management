const express = require('express')
const router = express.Router()
const {
    getReminders,
    createReminder,
    updateReminder,
    deleteReminder,
} = require('../controller/reminderController')

router.get('/:employeeId', getReminders)
router.post('/', createReminder)
router.put('/:id', updateReminder)
router.delete('/:id', deleteReminder)

module.exports = router
