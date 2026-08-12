require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const app = express()

app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        app.listen(process.env.PORT || 5000, () => {
            console.log(`Listening to port ${process.env.PORT || 5000}`)
        })
    })
    .catch((error) => {
        console.log(error)
    })

app.use('/api/holidays', require('./routes/holidayRoutes'))
app.use('/api/employees', require('./routes/employeeRoutes'))
app.use('/api/reminders', require('./routes/reminderRoutes'))
app.use('/api/calendar', require('./routes/calendarRoutes'))

