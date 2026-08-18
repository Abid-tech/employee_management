const express = require('express')
const router = express.Router()
const authMiddleware = require("../middleware/authMiddleware")
const {HandleRegistration,HandleLogin,HandleAuthMe,HandleLogout} = require('../controller/user')


router.post('/registration',HandleRegistration)
router.post('/login',HandleLogin)
router.get("/auth/me", authMiddleware, HandleAuthMe)
router.post("/logout", HandleLogout)


module.exports=router;
