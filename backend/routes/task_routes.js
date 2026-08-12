const express = require('express')
const controller = require('../controller/task_controller')
const { attachmentUpload } = require('../middleware/upload')

const router = express.Router()

// Module 3 — Task & Objective Management
router.get('/board', controller.getBoard)
router.get('/options', controller.getFormOptions)

router.get('/:id', controller.getTask)
router.post('/', controller.createTask)
router.patch('/:id', controller.updateTask)
router.delete('/:id', controller.deleteTask)

router.post('/:id/subtasks', controller.addSubtask)
router.patch('/:id/subtasks/:subtaskId', controller.toggleSubtask)

router.post('/:id/comments', controller.addComment)

router.post('/:id/attachments', attachmentUpload.single('file'), controller.uploadAttachment)
router.get('/:id/attachments/:fileId', controller.downloadAttachment)
router.delete('/:id/attachments/:fileId', controller.deleteAttachment)

module.exports = router
