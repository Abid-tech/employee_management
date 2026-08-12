const express = require('express')
const router = express.Router()

router.get('/subscribe-link', (req, res) => {
    const url = process.env.GOOGLE_CALENDAR_SUBSCRIBE_URL
    if (!url) {
        return res.status(404).json({ error: 'Subscribe URL not configured' })
    }
    res.json({ url })
})

module.exports = router
