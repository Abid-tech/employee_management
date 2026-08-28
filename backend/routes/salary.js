const express = require("express")

const router = express.Router()

const {
    HandleGetAttendanceSummary,
    HandleGenerateSalarySlip,
    HandleGetAllSalarySlips,
    HandleGetMySalarySlips,
    HandleGetSalarySlipById,
    HandleUpdatePaymentStatus,
    HandleDeleteSalarySlip
} = require("../controller/salary")

const authMiddleware = require("../middleware/authMiddleware")




router.get("/my", authMiddleware, HandleGetMySalarySlips)

// Admin routes
router.get("/attendance-summary", authMiddleware, HandleGetAttendanceSummary)
router.post("/generate", authMiddleware, HandleGenerateSalarySlip)
router.get("/", authMiddleware, HandleGetAllSalarySlips)
router.put("/:id/status", authMiddleware, HandleUpdatePaymentStatus)
router.delete("/:id", authMiddleware, HandleDeleteSalarySlip)

router.get("/:id", authMiddleware, HandleGetSalarySlipById)


module.exports = router