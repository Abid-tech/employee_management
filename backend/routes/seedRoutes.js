const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/authMiddleware')
const { seedDemoNotifications, seedAttendanceHeatmap } = require('../controller/seedController')

router.post('/notifications', authMiddleware, seedDemoNotifications)
router.post('/attendance-heatmap', authMiddleware, seedAttendanceHeatmap)

module.exports = router
