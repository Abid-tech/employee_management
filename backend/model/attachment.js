const mongoose = require('mongoose')

// Files are stored in MongoDB rather than on disk on purpose: Vercel's
// filesystem is read-only, so writing uploads to a folder would work locally
// and then fail in production. Size is capped in the upload middleware, well
// under MongoDB's 16 MB document limit.
const attachmentSchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', index: true },
    filename: { type: String, required: true },
    mimetype: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },

    // select: false so listing attachments never drags the bytes along.
    data: { type: Buffer, required: true, select: false }
}, { timestamps: true })

module.exports = mongoose.model('Attachment', attachmentSchema)
