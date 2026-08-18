const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/authMiddleware')
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} = require('../controller/notificationController')

router.get('/', authMiddleware, getNotifications)
router.get('/unread-count', authMiddleware, getUnreadCount)
router.put('/:id/read', authMiddleware, markAsRead)
router.put('/read-all', authMiddleware, markAllAsRead)

module.exports = router
