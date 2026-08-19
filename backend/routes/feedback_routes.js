const express = require('express')
const controller = require('../controller/feedback_controller')

const router = express.Router()

// Employee Feedback & Evaluation.
//
// Static paths are declared before '/employee/:id' and '/signals/:id' so a word
// like "calibration" can never be read as an id.

router.get('/meta', controller.getMeta)
router.get('/overview', controller.getOverview)
router.get('/calibration', controller.getCalibration)
router.get('/reconciliation', controller.getReconciliation)
router.get('/audit', controller.getAudit)

// The agent proposes; a named human decides. Nothing reaches the Task &
// Objective module except through one of the two decision routes below.
router.post('/agent/scan', controller.runScan)
router.get('/signals', controller.listSignals)
router.post('/signals/:id/approve', controller.approveSignal)
router.post('/signals/:id/dismiss', controller.dismissSignal)

router.get('/reviews', controller.listReviews)
router.post('/reviews', controller.createReview)
router.get('/reviews/:id', controller.getReview)
router.patch('/reviews/:id', controller.updateReview)
router.post('/reviews/:id/acknowledge', controller.acknowledgeReview)
router.delete('/reviews/:id', controller.deleteReview)

router.get('/employee/:id', controller.getEmployee)

module.exports = router
