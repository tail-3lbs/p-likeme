/**
 * Authentication Routes
 * Signup, Login, Get current user
 *
 * TODO: Consider switching from JWT to cookie-based sessions for better security
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, findUserByUsername, findUserById, usernameExists } = require('./database');

const router = express.Router();

// JWT Secret (in production, use environment variable)
const JWT_SECRET = 'p-likeme-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Password validation rules
const PASSWORD_RULES = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true
};

/**
 * Validate password strength
 */
function validatePassword(password) {
    const errors = [];

    if (password.length < PASSWORD_RULES.minLength) {
        errors.push(`密码至少需要 ${PASSWORD_RULES.minLength} 个字符`);
    }
    if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('密码需要包含至少一个大写字母');
    }
    if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('密码需要包含至少一个小写字母');
    }
    if (PASSWORD_RULES.requireNumber && !/[0-9]/.test(password)) {
        errors.push('密码需要包含至少一个数字');
    }
    if (PASSWORD_RULES.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('密码需要包含至少一个特殊字符 (!@#$%^&*等)');
    }

    return errors;
}

/**
 * Generate JWT token
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Middleware: Verify JWT token
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
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: '用户名和密码不能为空'
            });
        }

        // Validate username
        if (username.length < 2 || username.length > 20) {
            return res.status(400).json({
                success: false,
                error: '用户名需要 2-20 个字符'
            });
        }

        // Check if username exists
        if (usernameExists(username)) {
            return res.status(400).json({
                success: false,
                error: '用户名已被使用'
            });
        }

        // Validate password
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: passwordErrors[0],
                errors: passwordErrors
            });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create user
        const userId = createUser({ username, password_hash });
        const user = findUserById(userId);

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    created_at: user.created_at
                },
                token
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            error: '注册失败，请稍后再试'
        });
    }
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: '用户名和密码不能为空'
            });
        }

        // Find user
        const user = findUserByUsername(username);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: '用户名或密码错误'
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                error: '用户名或密码错误'
            });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    created_at: user.created_at
                },
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: '登录失败，请稍后再试'
        });
    }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', authMiddleware, (req, res) => {
    try {
        const user = findUserById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: '获取用户信息失败'
        });
    }
});

module.exports = router;
