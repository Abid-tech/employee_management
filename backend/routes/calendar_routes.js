const express = require("express")
const router = express.Router()

const authMiddleware = require("../middleware/authMiddleware")
const controller = require("../controller/calendar_controller")

// The subscription feed is mounted before the auth middleware on purpose: a
// calendar application fetches it with no session. It serves company holidays
// only — see the controller for why nothing else may go in it.
router.get("/holidays.ics", controller.holidayFeed)

router.get("/events", authMiddleware, controller.listEvents)
router.get("/reminders", authMiddleware, controller.listReminders)
router.post("/reminders", authMiddleware, controller.createReminder)
router.delete("/reminders/:id", authMiddleware, controller.deleteReminder)

module.exports = router
