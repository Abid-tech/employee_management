const express = require('express')
const controller = require('../controller/budget_controller')

const router = express.Router()

// Project Budget Tracker.
// Static paths first, so "portfolio" and "rates" can never be read as a
// project id by '/project/:id'.

router.get('/meta', controller.getMeta)
router.get('/portfolio', controller.getPortfolio)
router.get('/advisor', controller.getAdvice)

router.get('/shift', controller.getShift)
router.post('/clock-in', controller.postClockIn)
router.post('/clock-out', controller.postClockOut)
router.post('/log', controller.postManual)
router.get('/entries', controller.listEntries)

router.get('/rates', controller.getRates)
router.post('/rates', controller.postRate)

router.post('/budget', controller.postBudget)

router.get('/simulate/leave', controller.simLeave)
router.get('/simulate/:id/quote', controller.simQuote)
router.get('/simulate/:id/add-person', controller.simAddPerson)

router.get('/project/:id', controller.getProject)

module.exports = router
