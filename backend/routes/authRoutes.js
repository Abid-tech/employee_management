const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/authMiddleware')
const { handleRegister, handleLogin, handleAuthMe, handleLogout } = require('../controller/authController')

router.post('/register', handleRegister)
router.post('/login', handleLogin)
router.get('/me', authMiddleware, handleAuthMe)
router.post('/logout', handleLogout)

module.exports = router
