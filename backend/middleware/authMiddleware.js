const jwt = require("jsonwebtoken")


const authMiddleware = (req, res, next) => {

    try {

        // Get JWT from cookie
        const token = req.cookies.token

        // No token
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated"
            })
        }


        // Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        )


        // Store decoded information in req.user
        req.user = decoded


        // Continue to the next function
        next()

    } catch (err) {

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        })

    }
}


module.exports = authMiddleware