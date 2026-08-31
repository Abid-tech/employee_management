const express = require("express")
const router = express.Router()

const authMiddleware = require("../middleware/authMiddleware")
const controller = require("../controller/holiday_controller")

// Anyone signed in may read; the controller decides who may write.
router.get("/", authMiddleware, controller.listHolidays)
router.get("/conflicts", authMiddleware, controller.previewConflicts)

router.post("/import", authMiddleware, controller.importHolidays)
router.post("/", authMiddleware, controller.createHoliday)
router.put("/:id", authMiddleware, controller.updateHoliday)
router.delete("/:id", authMiddleware, controller.deleteHoliday)

module.exports = router
