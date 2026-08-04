const express = require('express')
const router = express.Router()
const { getEmployees, createEmployee } = require('../controller/employeeController')

// Base path "/api/employees" is set in server.js when we mount this router.
router.get('/', getEmployees)      // GET  /api/employees
router.post('/', createEmployee)   // POST /api/employees

module.exports = router
