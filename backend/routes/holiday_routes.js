const express = require("express")
const router = express.Router()

const authMiddleware = require("../middleware/authMiddleware")
const controller = require("../controller/holiday_controller")

// Everyone signed in can read the holiday list; the controller decides who may
// change it, so an employee sees the calendar but cannot edit it.
router.get("/", authMiddleware, controller.listHolidays)
router.get("/conflicts", authMiddleware, controller.previewConflicts)

router.post("/import", authMiddleware, controller.importHolidays)
router.post("/", authMiddleware, controller.createHoliday)
router.put("/:id", authMiddleware, controller.updateHoliday)
router.delete("/:id", authMiddleware, controller.deleteHoliday)

module.exports = router
