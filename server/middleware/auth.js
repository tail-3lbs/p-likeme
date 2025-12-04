/**
 * Authentication Middleware
 * JWT token verification for protected routes
 *
 * Security: Reads JWT from HttpOnly cookie (not accessible via JavaScript)
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

/**
 * Middleware: Verify JWT token (required)
 * Returns 401 if token is missing or invalid
 */
function authMiddleware(req, res, next) {
    // Read token from HttpOnly cookie
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ success: false, error: '未登录' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
    }
}

/**
 * Middleware: Optional JWT verification
 * Doesn't fail if no token, just sets req.user if valid
 */
function optionalAuthMiddleware(req, res, next) {
    // Read token from HttpOnly cookie
    const token = req.cookies?.token;

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (error) {
            // Invalid token, but we continue without user
        }
    }
    next();
}

module.exports = {
    authMiddleware,
    optionalAuthMiddleware
};
