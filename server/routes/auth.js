/**
 * Authentication Routes
 * Signup, Login, Get current user
 *
 * TODO: Consider switching from JWT to cookie-based sessions for better security
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, findUserByUsername, findUserById, usernameExists, getUserProfile, updateUserProfile, findUserByUsernamePublic, searchUsers } = require('../database');

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

/**
 * GET /api/auth/profile/:username
 * Get user profile by username (public view)
 */
router.get('/profile/:username', (req, res) => {
    try {
        const { username } = req.params;

        // Find user by username
        const user = findUserByUsernamePublic(username);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }

        // Get full profile
        const profile = getUserProfile(user.id);

        res.json({
            success: true,
            data: profile
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: '获取用户资料失败'
        });
    }
});

/**
 * PUT /api/auth/profile
 * Update own profile (requires authentication)
 */
router.put('/profile', authMiddleware, (req, res) => {
    try {
        const {
            gender, age, profession, marriage_status,
            location_from, location_living, location_living_district, location_living_street,
            hukou, education, family_size,
            income_individual, income_family, consumption_level, housing_status, economic_dependency,
            disease_tags, hospitals
        } = req.body;

        // Validate age if provided
        if (age !== undefined && age !== null && age !== '') {
            const ageNum = parseInt(age);
            if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
                return res.status(400).json({
                    success: false,
                    error: '请输入有效的年龄'
                });
            }
        }

        // Update profile
        const updatedProfile = updateUserProfile(req.user.id, {
            gender,
            age: age ? parseInt(age) : null,
            profession,
            marriage_status,
            location_from,
            location_living,
            location_living_district,
            location_living_street,
            hukou,
            education,
            family_size: family_size ? parseInt(family_size) : null,
            income_individual,
            income_family,
            consumption_level,
            housing_status,
            economic_dependency,
            disease_tags,
            hospitals
        });

        res.json({
            success: true,
            message: '资料更新成功',
            data: updatedProfile
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: '更新资料失败'
        });
    }
});

/**
 * GET /api/auth/users/search
 * Search users with filters (public, no auth required)
 * Query params:
 *   - communities: comma-separated community IDs (legacy)
 *   - community_filters: JSON array [{id, stage, type}] for sub-community filtering
 */
router.get('/users/search', (req, res) => {
    try {
        const {
            communities,  // comma-separated community IDs (legacy)
            community_filters,  // JSON array [{id, stage, type}]
            disease_tag,
            gender,
            age_min,
            age_max,
            location,
            location_district,
            location_street,
            hospital,
            hukou,
            education,
            income_individual,
            income_family,
            consumption_level,
            housing_status,
            economic_dependency,
            exclude_user,  // username to exclude (for auto-find)
            limit = 50,
            offset = 0
        } = req.query;

        // Parse community filters (new format with stage/type support)
        let parsedCommunityFilters = [];
        if (community_filters) {
            try {
                parsedCommunityFilters = JSON.parse(community_filters);
            } catch (e) {
                console.error('Failed to parse community_filters:', e);
            }
        } else if (communities) {
            // Legacy format: comma-separated IDs
            parsedCommunityFilters = communities.split(',')
                .map(id => parseInt(id.trim()))
                .filter(id => !isNaN(id))
                .map(id => ({ id, stage: '', type: '' }));
        }

        const result = searchUsers({
            community_filters: parsedCommunityFilters,
            disease_tag,
            gender,
            age_min,
            age_max,
            location,
            location_district,
            location_street,
            hospital,
            hukou,
            education,
            income_individual,
            income_family,
            consumption_level,
            housing_status,
            economic_dependency,
            exclude_user,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        console.log('[DEBUG] searchUsers result:', { total: result.total, usersCount: result.users?.length });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            error: '搜索失败'
        });
    }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
