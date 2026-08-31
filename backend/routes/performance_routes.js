const express = require('express')
const controller = require('../controller/performance_controller')

const router = express.Router()

// Module 4 — Employee Performance Management.

router.get('/overview', controller.getOverview)
router.get('/rules', controller.getRules)
router.get('/rebalance', controller.getRebalance)

// Ordered before '/employee/:id' would matter if they shared a prefix.
router.get('/report', controller.getReport)
router.get('/report.csv', controller.getReportCsv)

router.get('/employee/:id', controller.getEmployee)

module.exports = router
