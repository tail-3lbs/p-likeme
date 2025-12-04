/**
 * Authentication Middleware
 * JWT token verification for protected routes
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

/**
 * Middleware: Verify JWT token (required)
 * Returns 401 if token is missing or invalid
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: '未登录' });
    }

    const token = authHeader.substring(7);

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
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
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
