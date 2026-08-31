const User = require("../model/user.js")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

// The cookie has to travel between two different hosts in production.
const isProduction = process.env.NODE_ENV === 'production'
const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
}

const HandleRegistration = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            department,
            password,
            role
        } = req.body

        // Check if email already exists
        const existingUser = await User.findOne({ email })

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            })
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create user
        const user = await User.create({
            firstName,
            lastName,
            email,
            phone,
            department,
            password: hashedPassword,
            role
        })

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                department: user.department,
                role: user.role
            }
        })

    } catch (err) {
        console.log(err)

        res.status(500).json({
            success: false,
            message: "Failed to create account",
            error: err.message
        })
    }
}

const HandleLogin = async (req, res) => {
    try {

        const { email, password } = req.body

        // Check input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            })
        }

        // Find user
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            })
        }

        // Check password
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        )

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            })
        }

        // Create JWT
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        )

        // Store JWT in HTTP-only cookie
        res.cookie("token", token, {
            ...cookieOptions,
            maxAge: 24 * 60 * 60 * 1000
        })

        // Send response
        res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                department: user.department,
                role: user.role
            }
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            message: "Something went wrong"
        })
    }
}

const HandleAuthMe = async (req, res) => {

    try {

        const user = await User.findById(req.user.userId)
            .select("-password")

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                department: user.department,
                role: user.role,
                leaveBalance: user.leaveBalance
            }
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            message: "Something went wrong"
        })

    }
}

const HandleLogout = (req, res) => {

    res.clearCookie("token", cookieOptions)

    res.status(200).json({
        success: true,
        message: "Logout successful"
    })
}

const HandleGetAllEmployees = async (req, res) => {

    try {

        console.log("=== Fetching employees ===")
        console.log("User from token:", req.user)
        
        const employees = await User.find({ role: "Employee" })
            .select("firstName lastName email department")

        res.status(200).json({
            success: true,
            employees
        })

    } catch (err) {

        console.log(err)

        res.status(500).json({
            success: false,
            message: "Failed to fetch employees"
        })
    }
}

module.exports = { HandleRegistration,HandleLogin,HandleAuthMe,HandleLogout,HandleGetAllEmployees }
