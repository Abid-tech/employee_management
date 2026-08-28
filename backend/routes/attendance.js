const express = require("express")

const router = express.Router()

const {
    HandleGetTodayAttendance,
    HandleCheckIn,
    HandleCheckOut
} = require("../controller/attendance")

const authMiddleware = require("../middleware/authMiddleware")


router.get("/today",authMiddleware,HandleGetTodayAttendance)


router.post("/check-in",authMiddleware,HandleCheckIn)


router.post("/check-out", authMiddleware, HandleCheckOut)


module.exports = router