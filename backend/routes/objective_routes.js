const express = require('express')
const controller = require('../controller/objective_controller')

const router = express.Router()

// Module 3 — Projects (objectives) and their roll-up progress.
router.get('/', controller.listObjectives)
router.post('/', controller.createObjective)

router.get('/:id', controller.getObjective)
router.patch('/:id', controller.updateObjective)
router.delete('/:id', controller.deleteObjective)

module.exports = router
