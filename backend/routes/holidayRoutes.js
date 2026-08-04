const express = require('express')
const router = express.Router()
const {
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday
} = require('../controller/holidayController')

// Each route maps an HTTP method + path to a controller function.
// The base path "/api/holidays" is set in server.js when we mount this router.
router.get('/', getHolidays)          // GET    /api/holidays
router.post('/', createHoliday)       // POST   /api/holidays
router.put('/:id', updateHoliday)     // PUT    /api/holidays/:id
router.delete('/:id', deleteHoliday)  // DELETE /api/holidays/:id

module.exports = router
