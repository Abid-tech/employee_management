const express = require('express')
const router = express.Router()
const { authMiddleware, requireRole } = require('../middleware/authMiddleware')
const { getEmployeeDashboard, getAdminDashboard, updateLeaveStatus } = require('../controller/dashboardController')

router.get('/employee', authMiddleware, getEmployeeDashboard)
router.get('/admin', authMiddleware, requireRole('Admin'), getAdminDashboard)
router.put('/leave-status/:id', authMiddleware, requireRole('Admin'), updateLeaveStatus)

module.exports = router
