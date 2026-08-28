// The whole Express API as one serverless function.
//
// server.js only calls listen() when it is run directly, so importing it here
// hands Vercel the same app the local server uses. vercel.json rewrites every
// API path onto this file, and Express does its own routing from there.
module.exports = require('../backend/server')
