const Notification = require('../model/Notification')

const getNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 20
        const skip = (page - 1) * limit

        const notifications = await Notification.find({ recipient: req.user.userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()

        const total = await Notification.countDocuments({ recipient: req.user.userId })

        res.json({ notifications, total, page, pages: Math.ceil(total / limit) })
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notifications' })
    }
}

const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user.userId,
            isRead: false,
        })
        res.json({ count })
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch unread count' })
    }
}

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params
        const updated = await Notification.findOneAndUpdate(
            { _id: id, recipient: req.user.userId },
            { isRead: true },
            { new: true }
        )
        if (!updated) return res.status(404).json({ error: 'Notification not found' })
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark notification as read' })
    }
}

const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.userId, isRead: false },
            { isRead: true }
        )
        res.json({ message: 'All notifications marked as read' })
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark all as read' })
    }
}

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead }
