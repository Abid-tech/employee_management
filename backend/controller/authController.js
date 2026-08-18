const User = require('../model/User')
const Employee = require('../model/Employee')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const handleRegister = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, department, password, role = 'Employee' } = req.body

        if (!firstName || !lastName || !email || !phone || !department || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' })
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() })
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email is already registered' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await User.create({
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            department,
            password: hashedPassword,
            role,
        })

        // Also create/link an Employee record so dashboard widgets immediately function
        let emp = await Employee.findOne({ email: user.email })
        if (emp) {
            emp.userId = user._id
            emp.name = `${firstName} ${lastName}`
            emp.department = department
            await emp.save()
        } else {
            await Employee.create({
                name: `${firstName} ${lastName}`,
                email: user.email,
                department,
                jobTitle: role === 'Admin' ? 'Administrator' : 'Team Member',
                userId: user._id,
            })
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your_jwt_secret_here',
            { expiresIn: '1d' }
        )

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        })

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                department: user.department,
                role: user.role,
            },
        })
    } catch (err) {
        console.error('[register]', err)
        res.status(500).json({ success: false, message: err.message || 'Registration failed' })
    }
}

const handleLogin = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' })
        }

        const user = await User.findOne({ email: email.toLowerCase() })
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' })
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!isPasswordCorrect) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' })
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your_jwt_secret_here',
            { expiresIn: '1d' }
        )

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        })

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                department: user.department,
                role: user.role,
            },
        })
    } catch (err) {
        console.error('[login]', err)
        res.status(500).json({ success: false, message: 'Something went wrong' })
    }
}

const handleAuthMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password')
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })

        res.json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                department: user.department,
                role: user.role,
            },
        })
    } catch (err) {
        res.status(500).json({ success: false, message: 'Something went wrong' })
    }
}

const handleLogout = (req, res) => {
    res.cookie('token', '', { httpOnly: true, expires: new Date(0) })
    res.json({ success: true, message: 'Logged out' })
}

module.exports = { handleRegister, handleLogin, handleAuthMe, handleLogout }
