const nodemailer = require('nodemailer')

let transporter = null

const getTransporter = () => {
    if (transporter) return transporter

    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD

    if (!user || !pass) {
        console.warn('[emailService] GMAIL_USER or GMAIL_APP_PASSWORD not set - emails disabled')
        return null
    }

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    })

    return transporter
}

const sendEmail = async (to, subject, html) => {
    const t = getTransporter()
    if (!t) return false

    try {
        await t.sendMail({
            from: `"Employee Management" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
        })
        return true
    } catch (err) {
        console.error('[emailService] Send failed:', err.message)
        return false
    }
}

module.exports = { sendEmail }
