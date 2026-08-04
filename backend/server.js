require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors');
const app = express()

// Allow requests from the Vercel frontend (set FRONTEND_URL in Render env vars)
// In dev, cors() with no args allows everything — fine for localhost
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// connect to db
mongoose.connect(process.env.MONGODB_URI)
.then(()=>{
    app.listen(process.env.PORT || 5000, ()=>{
    console.log(`Listening to port ${process.env.PORT || 5000}`)
})
})
.catch((error)=>{
    console.log(error)
})

// API Endpoints — Holiday Management only
app.use('/api/holidays', require('./routes/holidayRoutes'))
app.use('/api/employees', require('./routes/employeeRoutes'))
