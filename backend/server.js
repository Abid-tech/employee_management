import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import roomRoutes from './routes/roomRoutes.js';

dotenv.config();
// Anchored to this file rather than the working directory, so `node
// backend/server.js` from the project root picks up the same .env as
// `npm run dev` from inside backend/. Behaves identically either way.
require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors');
const app = express()


const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  
  .catch((error) => console.error('MongoDB connection error:', error));

  
mongoose.connection.once("open", async () => {
  console.log("Connected DB:", mongoose.connection.db.databaseName);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors())

// connect to db
mongoose.connect(process.env.MONGODB_URI)
.then(()=>{
    app.listen(5000, ()=>{
    console.log("Listening to port 5000")
})
})
.catch((error)=>{
    console.log(error)
})

  const count = await mongoose.connection.db
    .collection("rooms")
    .countDocuments();

  console.log("Native Mongo Count:", count);
});
// Routes
app.use('/api', roomRoutes);

// API Endpoints
app.use('/leave-management',require('./routes/leave_management'))

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

app.use('/api/tasks', require('./routes/task_routes'))
app.use('/api/objectives', require('./routes/objective_routes'))
app.use('/api/ai', require('./routes/ai_routes'))

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

module.exports = app
