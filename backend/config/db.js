const mongoose = require('mongoose')

// Serverless platforms (Vercel) may call the handler many times on the same container.
let connection = null

// Kept so a health check can report why a connection failed without the caller having.
let lastError = null

const connectDB = async () => {
    if (connection) return connection

    const uri = process.env.MONGODB_URI
    if (!uri) {
        throw new Error('MONGODB_URI is missing. Copy backend/.env.example to backend/.env first.')
    }

    mongoose.set('strictQuery', true)

    // Below the platform's request limit.
    connection = mongoose.connect(uri, { serverSelectionTimeoutMS: 7000 })

    try {
        await connection
        lastError = null
    } catch (err) {
        lastError = err
        connection = null          // let the next request try again
        throw err
    }
    return connection
}

module.exports = connectDB
module.exports.lastError = () => lastError
