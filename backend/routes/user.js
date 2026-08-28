const express = require('express')
const router = express.Router()
const authMiddleware = require("../middleware/authMiddleware")
const {HandleRegistration,HandleLogin,HandleAuthMe,HandleLogout,HandleGetAllEmployees} = require('../controller/user')
const User = require("../model/user")  // Required for test route

router.post('/registration',HandleRegistration)
router.post('/login',HandleLogin)
router.get("/auth/me", authMiddleware, HandleAuthMe)
router.post("/logout", HandleLogout)
router.get("/employees", authMiddleware, HandleGetAllEmployees)




module.exports = router
