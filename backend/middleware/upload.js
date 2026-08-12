const multer = require('multer')

// Files stay in memory: task attachments go straight into MongoDB and imported
// documents are read then discarded. Nothing touches the disk, which is what
// lets the same code run on Vercel.
const memory = multer.memoryStorage()

const attachmentUpload = multer({ storage: memory, limits: { fileSize: 5 * 1024 * 1024, files: 1 } })
const documentUpload = multer({ storage: memory, limits: { fileSize: 8 * 1024 * 1024, files: 1 } })

// Turns multer's own errors into the same shape as the rest of the API.
const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'That file is too large. The limit is 5 MB for attachments and 8 MB for documents.' })
        }
        return res.status(400).json({ error: `Upload failed: ${err.message}` })
    }
    next(err)
}

module.exports = { attachmentUpload, documentUpload, handleUploadErrors }
