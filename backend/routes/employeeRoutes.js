const express = require('express')
const router = express.Router()
const { getEmployees, getEmployeeById } = require('../controller/employeeController')

router.get('/', getEmployees)
router.get('/:id', getEmployeeById)

module.exports = router
