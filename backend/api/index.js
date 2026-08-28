// Serverless entry point.
//
// server.js only calls app.listen when it is run directly, so importing it here
// gives the same Express app without starting a second server. Vercel hands
// each request to this export.
module.exports = require('../server')
