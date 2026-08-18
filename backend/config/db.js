const mongoose = require('mongoose')

let connection = null

const connectDB = async () => {
    if (connection) return connection

    const uri = process.env.MONGODB_URI
    if (!uri) {
        throw new Error('MONGODB_URI is missing. Fill in backend/.env first.')
    }

    mongoose.set('strictQuery', true)
    connection = mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })

    await connection
    return connection
}

module.exports = connectDB
