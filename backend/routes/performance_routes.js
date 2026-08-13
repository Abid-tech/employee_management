const express = require('express')
const controller = require('../controller/performance_controller')

const router = express.Router()

// Module 4 — Employee Performance Management.
// Every route is a read: performance is derived from work already recorded
// elsewhere, so there is nothing here to create or edit.

router.get('/overview', controller.getOverview)
router.get('/rules', controller.getRules)

// Ordered before '/employee/:id' would matter if they shared a prefix; kept
// separate so the report paths can never be read as an employee id.
router.get('/report', controller.getReport)
router.get('/report.csv', controller.getReportCsv)

router.get('/employee/:id', controller.getEmployee)

module.exports = router
