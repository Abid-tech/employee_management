const express = require("express")
const router = express.Router()

const authMiddleware = require("../middleware/authMiddleware")
const controller = require("../controller/calendar_controller")

// The feed is public: calendar apps fetch it with no session.
router.get("/holidays.ics", controller.holidayFeed)

router.get("/events", authMiddleware, controller.listEvents)
router.get("/reminders", authMiddleware, controller.listReminders)
router.post("/reminders", authMiddleware, controller.createReminder)
router.delete("/reminders/:id", authMiddleware, controller.deleteReminder)

module.exports = router
