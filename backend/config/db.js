const mongoose = require('mongoose')

// Serverless platforms (Vercel) may call the handler many times on the same
// container, so the connection promise is cached instead of reconnecting.
let connection = null

const connectDB = async () => {
    if (connection) return connection

    const uri = process.env.MONGODB_URI
    if (!uri) {
        throw new Error('MONGODB_URI is missing. Copy backend/.env.example to backend/.env first.')
    }

    mongoose.set('strictQuery', true)
    connection = mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })

    await connection
    return connection
}

module.exports = connectDB
