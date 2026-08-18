const mongoose = require('mongoose')

// One thread per task. A "question" stays open until somebody replies to it,
// which is what drives the unanswered-question count on the task page.
const commentSchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    authorName: { type: String, default: 'Someone', trim: true },
    body: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['comment', 'question'], default: 'comment' },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    resolved: { type: Boolean, default: false }
}, { timestamps: true })

module.exports = mongoose.model('Comment', commentSchema)
