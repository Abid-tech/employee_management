const express = require('express')
const controller = require('../controller/ai_controller')
const { documentUpload } = require('../middleware/upload')

const router = express.Router()

router.get('/status', controller.status)

// Reads a document and returns a draft. Saves nothing.
router.post('/analyse', documentUpload.single('document'), controller.analyseDocument)

// Creates the tasks the manager kept from that draft.
router.post('/create-tasks', controller.createFromDraft)

module.exports = router
