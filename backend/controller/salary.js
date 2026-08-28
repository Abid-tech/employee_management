const SalarySlip = require("../model/salarySlip")
const Attendance = require("../model/attendance")
const User = require("../model/user")


const OVERTIME_THRESHOLD_MINUTES = 8 * 60 


const getMonthDateRange = (month, year) => {

    const paddedMonth = String(month).padStart(2, "0")

    const start = `${year}-${paddedMonth}-01`

    const lastDay = new Date(year, month, 0).getDate()

    const end = `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`

    return { start, end }
}



const computeAttendanceSummary = async (employeeId, month, year) => {

    const { start, end } = getMonthDateRange(month, year)

    const records = await Attendance.find({
        user: employeeId,
        date: { $gte: start, $lte: end }
    })

    let presentDays = 0
    let overtimeDays = 0
    let totalWorkingMinutes = 0
    let overtimeMinutes = 0

    records.forEach((record) => {

        if (record.totalWorkingMinutes > 0) {

            presentDays += 1
            totalWorkingMinutes += record.totalWorkingMinutes

            if (record.totalWorkingMinutes > OVERTIME_THRESHOLD_MINUTES) {

                overtimeDays += 1
                overtimeMinutes += (record.totalWorkingMinutes - OVERTIME_THRESHOLD_MINUTES)
            }
        }
    })

    // Round to 2 decimals so hours display cleanly (e.g. 7.25 hrs)
    const totalWorkingHours = Math.round((totalWorkingMinutes / 60) * 100) / 100
    const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100

    return { presentDays, overtimeDays, totalWorkingHours, overtimeHours }
}


// GET /salary/attendance-summary?employeeId=&month=&year=  (admin preview)
const HandleGetAttendanceSummary = async (req, res) => {

    try {

        const { employeeId, month, year } = req.query

        if (!employeeId || !month || !year) {

            return res.status(400).json({
                success: false,
                message: "employeeId, month and year are required"
            })
        }

        const summary = await computeAttendanceSummary(
            employeeId,
            Number(month),
            Number(year)
        )

        res.status(200).json({
            success: true,
            summary
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            message: "Failed to fetch attendance summary"
        })
    }
}


// POST /salary/generate  (admin)
const HandleGenerateSalarySlip = async (req, res) => {

    try {

        const {
            employeeId,
            month,
            year,
            hourlyRate,
            bonusPerOvertimeHour,
            deductions
        } = req.body



        if (!employeeId || !month || !year || hourlyRate === undefined) {

            return res.status(400).json({
                success: false,
                message: "employeeId, month, year and hourlyRate are required"
            })
        }

        const employee = await User.findById(employeeId)

        if (!employee) {

            return res.status(404).json({
                success: false,
                message: "Employee not found"
            })
        }

        const existing = await SalarySlip.findOne({
            employee: employeeId,
            month,
            year
        })

        if (existing) {

            return res.status(409).json({
                success: false,
                message: `Salary slip for ${month}/${year} already exists for this employee`
            })
        }

        const { presentDays, overtimeDays, totalWorkingHours, overtimeHours } =
            await computeAttendanceSummary(employeeId, Number(month), Number(year))

        const rate = Number(hourlyRate)
        const bonusRate = Number(bonusPerOvertimeHour) || 0
        const deductionAmount = Number(deductions) || 0

        const regularPay = Math.round(totalWorkingHours * rate * 100) / 100
        const overtimeBonus = Math.round(overtimeHours * bonusRate * 100) / 100

        const grossPay = regularPay + overtimeBonus
        const netPay = grossPay - deductionAmount

        const slip = await SalarySlip.create({
            employee: employeeId,
            month,
            year,
            hourlyRate: rate,
            bonusPerOvertimeHour: bonusRate,
            deductions: deductionAmount,
            presentDays,
            overtimeDays,
            totalWorkingHours,
            overtimeHours,
            regularPay,
            overtimeBonus,
            grossPay,
            netPay,
            generatedBy: req.user.userId
        })

        res.status(201).json({
            success: true,
            message: "Salary slip generated successfully",
            slip
        })

    } catch (err) {

        console.log(err)

        if (err.code === 11000) {

            return res.status(409).json({
                success: false,
                message: "Salary slip already exists for this employee/month/year"
            })
        }

        res.status(500).json({
            success: false,
            message: "Failed to generate salary slip",
            error: err.message
        })
    }
}


const HandleGetAllSalarySlips = async (req, res) => {

    try {

        const { month, year, status, employeeId } = req.query

        const filter = {}

        if (month) filter.month = Number(month)
        if (year) filter.year = Number(year)
        if (status) filter.paymentStatus = status
        if (employeeId) filter.employee = employeeId

        const slips = await SalarySlip.find(filter)
            .populate("employee", "firstName lastName email department")
            .sort({ year: -1, month: -1 })

        res.status(200).json({
            success: true,
            slips
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            message: "Failed to fetch salary slips"
        })
    }
}


const HandleGetMySalarySlips = async (req, res) => {

    try {

        const slips = await SalarySlip.find({ employee: req.user.userId })
            .sort({ year: -1, month: -1 })

        res.status(200).json({
            success: true,
            slips
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            message: "Failed to fetch your salary slips"
        })
    }
}


const HandleGetSalarySlipById = async (req, res) => {

    try {

        const slip = await SalarySlip.findById(req.params.id)
            .populate("employee", "firstName lastName email department")

        if (!slip) {

            return res.status(404).json({
                success: false,
                message: "Salary slip not found"
            })
        }

        const isOwner = slip.employee._id.toString() === req.user.userId
        const isAdminUser = req.user.role === "Admin"

        if (!isOwner && !isAdminUser) {

            return res.status(403).json({
                success: false,
                message: "Not authorized to view this slip"
            })
        }

        res.status(200).json({
            success: true,
            slip
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            message: "Failed to fetch salary slip"
        })
    }
}


const HandleUpdatePaymentStatus = async (req, res) => {

    try {

        const { status } = req.body

        if (!["Pending", "Processing", "Paid"].includes(status)) {

            return res.status(400).json({
                success: false,
                message: "Invalid status value"
            })
        }

        const updateData = { paymentStatus: status }

        if (status === "Paid") {
            updateData.paidOn = new Date()
        }

        const slip = await SalarySlip.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        )

        if (!slip) {

            return res.status(404).json({
                success: false,
                message: "Salary slip not found"
            })
        }

        res.status(200).json({
            success: true,
            message: "Payment status updated",
            slip
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            message: "Failed to update payment status"
        })
    }
}


const HandleDeleteSalarySlip = async (req, res) => {

    try {

        const slip = await SalarySlip.findByIdAndDelete(req.params.id)

        if (!slip) {

            return res.status(404).json({
                success: false,
                message: "Salary slip not found"
            })
        }

        res.status(200).json({
            success: true,
            message: "Salary slip deleted"
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            message: "Failed to delete salary slip"
        })
    }
}


module.exports = {
    HandleGetAttendanceSummary,
    HandleGenerateSalarySlip,
    HandleGetAllSalarySlips,
    HandleGetMySalarySlips,
    HandleGetSalarySlipById,
    HandleUpdatePaymentStatus,
    HandleDeleteSalarySlip
}