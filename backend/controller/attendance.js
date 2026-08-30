const Attendance = require("../model/attendance")
const User = require("../model/user")


const OFFICE_LATITUDE = Number(process.env.OFFICE_LATITUDE)
const OFFICE_LONGITUDE = Number(process.env.OFFICE_LONGITUDE)

const ATTENDANCE_RADIUS = Number(
    process.env.ATTENDANCE_RADIUS || 50
)


// Bangladesh date
const getTodayDate = () => {

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Dhaka"
    }).format(new Date())

}


// Calculate distance between two coordinates
const calculateDistance = (latitude1,longitude1,latitude2,longitude2) => {

    const earthRadius = 6371000

    const lat1 = latitude1 * Math.PI / 180
    const lat2 = latitude2 * Math.PI / 180

    const differenceLatitude =
        (latitude2 - latitude1) * Math.PI / 180

    const differenceLongitude =
        (longitude2 - longitude1) * Math.PI / 180


    const a =
        Math.sin(differenceLatitude / 2) *
        Math.sin(differenceLatitude / 2) +

        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(differenceLongitude / 2) *
        Math.sin(differenceLongitude / 2)


    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        )


    return earthRadius * c
}


// Get today's attendance
const HandleGetTodayAttendance = async (req, res) => {

    try {

        const userId = req.user.userId

        const today = getTodayDate()


        const attendance = await Attendance.findOne({
            user: userId,
            date: today
        })


        res.status(200).json({
            success: true,
            attendance
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            message: "Failed to get attendance"
        })
    }
}


// Check in
const HandleCheckIn = async (req, res) => {

    try {

        const userId = req.user.userId

        const {latitude,longitude, accuracy} = req.body


        // Validate coordinates
        if (
            typeof latitude !== "number" ||
            typeof longitude !== "number"
        ) {

            return res.status(400).json({
                success: false,
                message: "Valid location is required"
            })
        }


        const today = getTodayDate()


        // Check if already checked in
        let attendance = await Attendance.findOne({
            user: userId,
            date: today
        })


        if (attendance?.checkIn?.time) {

            return res.status(400).json({
                success: false,
                message: "You have already checked in today",
                attendance
            })
        }


        // Calculate distance
        const distance = calculateDistance(
            latitude,
            longitude,
            OFFICE_LATITUDE,
            OFFICE_LONGITUDE
        )


        // Outside office radius
        if (distance > ATTENDANCE_RADIUS) {

            return res.status(403).json({
                success: false,
                message: "You are outside the office premises",
                distance: Math.round(distance),
                allowedRadius: ATTENDANCE_RADIUS
            })
        }


        // Create attendance if doesn't exist
        if (!attendance) {

            attendance = new Attendance({
                user: userId,
                date: today
            })
        }


        attendance.checkIn = {
            time: new Date(),
            latitude,
            longitude,
            accuracy: accuracy || null
        }


        await attendance.save()


        res.status(200).json({
            success: true,
            message: "Check-in successful",
            distance: Math.round(distance),
            attendance
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            message: "Failed to check in",
            error: err.message
        })
    }
}


// Check out
const HandleCheckOut = async (req, res) => {

    try {

        const userId = req.user.userId

        const {
            latitude,
            longitude,
            accuracy
        } = req.body


        if (
            typeof latitude !== "number" ||
            typeof longitude !== "number"
        ) {

            return res.status(400).json({
                success: false,
                message: "Valid location is required"
            })
        }


        const today = getTodayDate()


        const attendance = await Attendance.findOne({
            user: userId,
            date: today
        })


        if (!attendance || !attendance.checkIn?.time) {

            return res.status(400).json({
                success: false,
                message: "You have not checked in today"
            })
        }


        if (attendance.checkOut?.time) {

            return res.status(400).json({
                success: false,
                message: "You have already checked out today"
            })
        }


        // Check current location
        const distance = calculateDistance(
            latitude,
            longitude,
            OFFICE_LATITUDE,
            OFFICE_LONGITUDE
        )


        if (distance > ATTENDANCE_RADIUS) {

            return res.status(403).json({
                success: false,
                message: "You are outside the office premises",
                distance: Math.round(distance),
                allowedRadius: ATTENDANCE_RADIUS
            })
        }


        const checkInTime =
            new Date(attendance.checkIn.time)

        const checkOutTime =
            new Date()


        const workingMilliseconds =
            checkOutTime - checkInTime


        const workingMinutes =
            Math.floor(
                workingMilliseconds / (1000 * 60)
            )


        attendance.checkOut = {
            time: checkOutTime,
            latitude,
            longitude,
            accuracy: accuracy || null
        }


        attendance.totalWorkingMinutes =
            workingMinutes


        await attendance.save()


        res.status(200).json({
            success: true,
            message: "Check-out successful",
            distance: Math.round(distance),
            attendance
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            message: "Failed to check out",
            error: err.message
        })
    }
}


module.exports = {HandleGetTodayAttendance,HandleCheckIn, HandleCheckOut}