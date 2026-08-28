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


// A year of attendance for the heatmap and the last seven days for the trend
// chart, both for the signed-in person.
router.get("/stats", authMiddleware, async (req, res, next) => {
    try {
        const stats = await require("../service/attendance_stats").summary(req.user.userId)
        res.json({ success: true, ...stats })
    } catch (err) {
        next(err)
    }
})


module.exports = router