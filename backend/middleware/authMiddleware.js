const jwt = require("jsonwebtoken")

const authMiddleware = (req, res, next) => {
    try {
        const token = req.cookies.token

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.user = decoded

        next()
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        })
    }
}

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Insufficient permissions"
            })
        }
        next()
    }
}

module.exports = { authMiddleware, requireRole }
