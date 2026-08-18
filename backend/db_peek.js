// Show what is actually in the database, from the terminal.
//
//   node db_peek.js                 every collection with a document count
//   node db_peek.js tasks           the first few documents in one collection
//   node db_peek.js tasks 10        the first 10
//
// Useful when demonstrating that the app is talking to a real database rather
// than to hard-coded arrays — it connects with the same MONGODB_URI the server
// uses, so if this prints data, the server is reading that same data.
//
// It never prints the connection string or the password.

require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const mongoose = require('mongoose')
const connectDB = require('./config/db')

const [, , wanted, limitArg] = process.argv
const limit = Number(limitArg) || 3

const main = async () => {
    await connectDB()

    const db = mongoose.connection.db
    const uri = process.env.MONGODB_URI || ''
    const host = /@([^/?]+)/.exec(uri)?.[1] || 'unknown host'

    console.log('')
    console.log('  Connected to : ' + host)
    console.log('  Database     : ' + db.databaseName)
    console.log('')

    const collections = (await db.listCollections().toArray())
        .map(c => c.name)
        .sort()

    if (!wanted) {
        const rows = await Promise.all(collections.map(async name => ({
            name,
            count: await db.collection(name).countDocuments()
        })))

        const width = Math.max(...rows.map(r => r.name.length), 10)
        console.log('  ' + 'COLLECTION'.padEnd(width) + '  DOCUMENTS')
        console.log('  ' + '-'.repeat(width) + '  ---------')
        for (const row of rows) {
            console.log('  ' + row.name.padEnd(width) + '  ' + String(row.count).padStart(9))
        }
        console.log('')
        console.log('  Look inside one with:  node db_peek.js ' + (rows[0]?.name || 'tasks'))
        console.log('')
        return
    }

    if (!collections.includes(wanted)) {
        console.log('  No collection called "' + wanted + '".')
        console.log('  Available: ' + collections.join(', '))
        console.log('')
        return
    }

    const docs = await db.collection(wanted).find({}).limit(limit).toArray()
    const total = await db.collection(wanted).countDocuments()

    console.log('  ' + wanted + ' — showing ' + docs.length + ' of ' + total + ' documents')
    console.log('')
    console.log(JSON.stringify(docs, null, 2))
    console.log('')
}

main()
    .then(() => mongoose.connection.close())
    .catch(async (error) => {
        console.error('  Could not read the database:', error.message)
        await mongoose.connection.close().catch(() => {})
        process.exit(1)
    })
