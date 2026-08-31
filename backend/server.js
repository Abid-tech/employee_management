// Anchored to this file rather than the working directory, so `node
// backend/server.js` from the project root picks up the same .env as
// `npm run dev` from inside backend/. Behaves identically either way.
require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const express = require('express')
const http = require('http')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { Server } = require('socket.io')
const connectDB = require('./config/db')

const app = express()
const PORT = process.env.PORT || 9505

// Socket.IO needs the raw HTTP server; the meeting module signals over it.
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
    }
})

// Middleware
//
// The login flow merged in from main keeps its token in a cookie, so the
// browser only sends it when the response names the exact origin and allows
// credentials — origin: true echoes whichever port Vite happened to take.
app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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

// Most of this backend is CommonJS, but the room-booking module is written as
// ES modules. Requiring an ES module hands back its namespace object rather
// than the export itself, so `app.use` receives `{ default: router }` and
// throws "argument handler must be a function".
//
// Unwrapping it here means that module's own files stay exactly as their author
// wrote them — the adaptation belongs in the file doing the mounting, not in
// somebody else's code.
const useModule = (mod) => (mod && mod.__esModule !== undefined) || (mod && mod.default) ? mod.default : mod

// Make sure the database is connected before any route runs.
//
// Running locally, start() connects once and then listens. On a serverless host
// the module is imported instead, start() never runs, and nothing opens the
// connection — so every query sat in Mongoose's buffer until it timed out ten
// seconds later and returned a 500. connectDB caches its promise, so this costs
// nothing after the first request on a container.
app.use(async (req, res, next) => {
    try {
        await connectDB()
        next()
    } catch (err) {
        next(err)
    }
})

// Says whether the API can reach the database, and why not when it cannot.
// Nothing secret is returned: the host is public in any connection string and
// the message is the driver's own.
app.get('/api/health', async (req, res) => {
    const mongoose = require('mongoose')
    const started = Date.now()

    try {
        await connectDB()
        res.json({
            api: 'up',
            database: 'connected',
            name: mongoose.connection.db.databaseName,
            host: mongoose.connection.host,
            ms: Date.now() - started
        })
    } catch (err) {
        res.status(503).json({
            api: 'up',
            database: 'unreachable',
            reason: err.message,
            ms: Date.now() - started
        })
    }
})

// --- Routes ----------------------------------------------------------------
// Meetings, resources and assets. Mounted first so its own upload error
// handler does not catch other modules' uploads.
require('./routes/meeting_resource_asset')(app, io)

// Room booking
app.use('/api', useModule(require('./routes/roomRoutes')))

// Leave management
app.use('/leave-management', require('./routes/leave_management'))

// Accounts, attendance, internal communication and salary
app.use('/user', require('./routes/user'))
app.use('/attendance', require('./routes/attendance'))
app.use('/communication', require('./routes/communication'))
app.use('/salary', require('./routes/salary'))

// Task & objective management
app.use('/api/tasks', require('./routes/task_routes'))
app.use('/api/objectives', require('./routes/objective_routes'))
app.use('/api/ai', require('./routes/ai_routes'))

// Company holidays and the shared calendar.
app.use('/api/holidays', require('./routes/holiday_routes'))
app.use('/api/calendar', require('./routes/calendar_routes'))

// Employee performance management
app.use('/api/performance', require('./routes/performance_routes'))

// Employee feedback & evaluation
app.use('/api/feedback', require('./routes/feedback_routes'))

// Project budget tracker & time logging
app.use('/api/budget', require('./routes/budget_routes'))

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

        // Backstop for the gap between the check above and the bind below.
        // EADDRINUSE arrives as an event rather than a throw, so the try/catch
        // around this would never see it.
        server.listen(PORT, () => {
            console.log(`Listening on port ${PORT}`)
            console.log('Socket.IO signalling ready')
        })
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
