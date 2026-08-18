require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const connectDB = require('./config/db')

const app = express()

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}))

// Routes
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/holidays', require('./routes/holidayRoutes'))
app.use('/api/dashboard', require('./routes/dashboardRoutes'))
app.use('/api/calendar', require('./routes/calendarRoutes'))
app.use('/api/notifications', require('./routes/notificationRoutes'))
app.use('/api/seed', require('./routes/seedRoutes'))
app.use('/api/employees', require('./routes/employeeRoutes'))

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', module: 3 }))

// Error handler
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err)
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(e => e.message).join(' ')
        return res.status(400).json({ error: message || 'Validation failed' })
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid record ID' })
    }
    console.error('[api]', err)
    res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 5002

const start = async () => {
    try {
        await connectDB()
        const mongoose = require('mongoose')
        console.log('Connected DB:', mongoose.connection.db.databaseName)

        app.listen(PORT, () => console.log(`API listening on port ${PORT}`))
    } catch (err) {
        console.error('MongoDB connection error:', err.message)
        process.exit(1)
    }
}

if (require.main === module) start()

module.exports = app
