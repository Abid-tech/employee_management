const Notification = require('../model/Notification')
const User = require('../model/User')
const { sendEmail } = require('./emailService')

const createNotification = async (recipientId, type, title, message, link = '') => {
    try {
        return await Notification.create({ recipient: recipientId, type, title, message, link })
    } catch (err) {
        console.error('[notificationService] Create failed:', err.message)
        return null
    }
}

const notifyUser = async (recipientId, type, title, message, link = '') => {
    const notification = await createNotification(recipientId, type, title, message, link)

    // Also send email
    try {
        const user = await User.findById(recipientId)
        if (user?.email) {
            const emailSent = await sendEmail(
                user.email,
                title,
                `<div style="font-family: Montserrat, sans-serif; padding: 20px;">
                    <h2 style="color: #0A2947;">${title}</h2>
                    <p>${message}</p>
                    ${link ? `<p><a href="http://localhost:5173${link}" style="color: #0A2947;">View Details</a></p>` : ''}
                </div>`
            )
            if (notification && emailSent) {
                notification.emailSent = true
                await notification.save()
            }
        }
    } catch (err) {
        console.error('[notificationService] Email step failed:', err.message)
    }

    return notification
}

const notifyAll = async (type, title, message, link = '') => {
    try {
        const users = await User.find({}, '_id email')
        for (const u of users) {
            await notifyUser(u._id, type, title, message, link)
        }
    } catch (err) {
        console.error('[notificationService] Broadcast failed:', err.message)
    }
}

module.exports = { createNotification, notifyUser, notifyAll }
