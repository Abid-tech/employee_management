require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors'); 
const app = express()
const cookieParser = require("cookie-parser")

dotenv.config();
// Anchored to this file rather than the working directory, so `node
// backend/server.js` from the project root picks up the same .env as
// `npm run dev` from inside backend/. Behaves identically either way.
require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')

app.use(cookieParser())
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))





const PORT = process.env.PORT || 5000



// --- Module 3: Task & Objective Management ---------------------------------
// Express 5 leaves req.body undefined when no parser matched — a POST sent with
// no Content-Type, for instance. Defaulting it to an empty object means a
// handler reading req.body.title returns its own validation message instead of
// crashing on a TypeError. Multer sets req.body itself on multipart routes and
// runs after this, so nothing here gets in its way.
app.use((req, res, next) => {
    if (req.body === undefined) req.body = {}
    next()
})

// --- Routes ----------------------------------------------------------------
// Room booking
app.use('/api', require('./routes/roomRoutes'))

// Leave management
app.use('/leave-management', require('./routes/leave_management'))

// Task & objective management
app.use('/api/tasks', require('./routes/task_routes'))
app.use('/api/objectives', require('./routes/objective_routes'))
app.use('/api/ai', require('./routes/ai_routes'))

// Employee performance management
app.use('/api/performance', require('./routes/performance_routes'))

app.use(require('./middleware/upload').handleUploadErrors)

// One place that decides what an error looks like to the browser. Validation
// and bad-id errors become 400s; anything unexpected is logged in full on the
// server and reported generically.
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err)

    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(e => e.message).join(' ')
        return res.status(400).json({ error: message || 'Some fields are missing or invalid.' })
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ error: 'That record id is not valid.' })
    }

    console.error('[api]', err)
    res.status(500).json({ error: 'Something went wrong on our side.' })
})
// ---------------------------------------------------------------------------

// Is something already answering on PORT? A second `npm run dev` in another
// terminal is the usual reason, and it used to fail in the worst possible way:
// the duplicate connected to Atlas, lost the bind, and sat there holding an idle
// connection pool while serving nothing — so the pages it should have answered
// span on "Loading..." with no clue why. Checking first means a duplicate stops
// before it opens a pool at all.
const portIsTaken = () => new Promise(resolve => {
    const socket = require('net').connect({ port: PORT, host: '127.0.0.1' })
    const done = (taken) => { socket.destroy(); resolve(taken) }
    socket.setTimeout(1000)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
})

// Connect once, then listen. On Vercel the module is imported instead of run
// directly, so the export stays and the listen is skipped.
const start = async () => {
    if (await portIsTaken()) {
        console.error(`Port ${PORT} is already in use — the API is probably running in another terminal. Stop that one first.`)
        process.exit(1)
    }

    try {
        const mongoose = require('mongoose')
        await connectDB()
        console.log('Connected DB:', mongoose.connection.db.databaseName)

// API Endpoints
app.use('/leave-management',require('./routes/leave_management'))
app.use('/user',require('./routes/user'))
app.use("/attendance", require("./routes/attendance"))
        // Backstop for the gap between the check above and the bind below.
        // EADDRINUSE arrives as an event rather than a throw, so the try/catch
        // around this would never see it.
        const server = app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
        server.on('error', async (error) => {
            console.error(error.code === 'EADDRINUSE'
                ? `Port ${PORT} is already in use — the API is probably running in another terminal. Stop that one first.`
                : `Server error: ${error.message}`)
            await mongoose.connection.close().catch(() => {})
            process.exit(1)
        })
    } catch (error) {
        console.error('MongoDB connection error:', error.message)
        process.exit(1)
    }
}

if (require.main === module) start()

module.exports = app
