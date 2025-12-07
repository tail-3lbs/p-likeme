/**
 * Authentication Routes
 * Signup, Login, Logout, Get current user
 *
 * Security: Uses HttpOnly cookies for JWT storage (not accessible via JavaScript)
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, findUserByUsername, findUserById, usernameExists, getUserProfile, updateUserProfile, findUserByUsernamePublic, searchUsers } = require('../database');
const { JWT_SECRET, JWT_EXPIRES_IN, PASSWORD_RULES, INPUT_LIMITS, PAGINATION, BCRYPT_SALT_ROUNDS } = require('../config');
const { authMiddleware } = require('../middleware/auth');
const { sanitizeInput, sanitizeArray, sanitizeObject } = require('../utils/sanitize');

const router = express.Router();

// Cookie configuration
const COOKIE_OPTIONS = {
    httpOnly: true, // Not accessible via JavaScript (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/'
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
        if (username.length < INPUT_LIMITS.USERNAME_MIN || username.length > INPUT_LIMITS.USERNAME_MAX) {
            return res.status(400).json({
                success: false,
                error: `用户名需要 ${INPUT_LIMITS.USERNAME_MIN}-${INPUT_LIMITS.USERNAME_MAX} 个字符`
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
        const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        // Create user
        const userId = createUser({ username, password_hash });
        const user = findUserById(userId);

        // Generate token and set as HttpOnly cookie
        const token = generateToken(user);
        res.cookie('token', token, COOKIE_OPTIONS);

        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    created_at: user.created_at
                }
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

        // Generate token and set as HttpOnly cookie
        const token = generateToken(user);
        res.cookie('token', token, COOKIE_OPTIONS);

        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    created_at: user.created_at
                }
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
 * POST /api/auth/logout
 * Clear the authentication cookie
 */
router.post('/logout', (req, res) => {
    res.clearCookie('token', { path: '/' });
    res.json({
        success: true,
        message: '已退出登录'
    });
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
            gender, age, profession, marriage_status, fertility_status,
            location_from, location_living, location_living_district, location_living_street,
            hukou, education, family_size,
            income_individual, income_family, consumption_level, housing_status, economic_dependency,
            disease_history, hospitals
        } = req.body;

        // Validate age if provided
        if (age !== undefined && age !== null && age !== '') {
            const ageNum = parseInt(age, 10);
            if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
                return res.status(400).json({
                    success: false,
                    error: '请输入有效的年龄'
                });
            }
        }

        // Validate string field lengths
        const fieldValidations = [
            { value: profession, name: '职业', max: INPUT_LIMITS.PROFILE_FIELD_MAX },
            { value: location_from, name: '籍贯', max: INPUT_LIMITS.PROFILE_FIELD_MAX },
            { value: location_living, name: '现居城市', max: INPUT_LIMITS.PROFILE_FIELD_MAX },
            { value: location_living_district, name: '区县', max: INPUT_LIMITS.PROFILE_FIELD_MAX },
            { value: location_living_street, name: '街道', max: INPUT_LIMITS.PROFILE_FIELD_MAX }
        ];

        for (const field of fieldValidations) {
            if (field.value && field.value.length > field.max) {
                return res.status(400).json({
                    success: false,
                    error: `${field.name}不能超过${field.max}个字符`
                });
            }
        }

        // Validate disease_history
        if (disease_history) {
            if (!Array.isArray(disease_history)) {
                return res.status(400).json({
                    success: false,
                    error: '患病经历格式错误'
                });
            }
            if (disease_history.length > INPUT_LIMITS.MAX_DISEASE_TAGS) {
                return res.status(400).json({
                    success: false,
                    error: `患病经历最多${INPUT_LIMITS.MAX_DISEASE_TAGS}个`
                });
            }
            for (const item of disease_history) {
                if (!item.disease || item.disease.length > INPUT_LIMITS.DISEASE_TAG_MAX) {
                    return res.status(400).json({
                        success: false,
                        error: `疾病名称不能超过${INPUT_LIMITS.DISEASE_TAG_MAX}个字符`
                    });
                }
            }
        }

        // Validate hospitals
        if (hospitals) {
            if (!Array.isArray(hospitals)) {
                return res.status(400).json({
                    success: false,
                    error: '医院格式错误'
                });
            }
            if (hospitals.length > INPUT_LIMITS.MAX_HOSPITALS) {
                return res.status(400).json({
                    success: false,
                    error: `医院最多${INPUT_LIMITS.MAX_HOSPITALS}个`
                });
            }
            for (const hospital of hospitals) {
                if (hospital.length > INPUT_LIMITS.HOSPITAL_NAME_MAX) {
                    return res.status(400).json({
                        success: false,
                        error: `医院名称不能超过${INPUT_LIMITS.HOSPITAL_NAME_MAX}个字符`
                    });
                }
            }
        }

        // Update profile (sanitize all string inputs)
        const updatedProfile = updateUserProfile(req.user.id, {
            gender: sanitizeInput(gender),
            age: age ? parseInt(age, 10) : null,
            profession: sanitizeInput(profession),
            marriage_status: sanitizeInput(marriage_status),
            fertility_status: sanitizeInput(fertility_status),
            location_from: sanitizeInput(location_from),
            location_living: sanitizeInput(location_living),
            location_living_district: sanitizeInput(location_living_district),
            location_living_street: sanitizeInput(location_living_street),
            hukou: sanitizeInput(hukou),
            education: sanitizeInput(education),
            family_size: family_size ? parseInt(family_size, 10) : null,
            income_individual: sanitizeInput(income_individual),
            income_family: sanitizeInput(income_family),
            consumption_level: sanitizeInput(consumption_level),
            housing_status: sanitizeInput(housing_status),
            economic_dependency: sanitizeInput(economic_dependency),
            disease_history: sanitizeArray(disease_history),
            hospitals: sanitizeArray(hospitals)
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
 *
 * Response: { success, data: [...users], total }
 */
router.get('/users/search', (req, res) => {
    try {
        const {
            username,  // username search (partial match)
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
            profession,
            marriage_status,
            fertility_status,
            location_from,
            hukou,
            education,
            family_size,
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
                .map(id => parseInt(id.trim(), 10))
                .filter(id => !isNaN(id))
                .map(id => ({ id, stage: '', type: '' }));
        }

        const result = searchUsers({
            username,
            community_filters: parsedCommunityFilters,
            disease_tag,
            gender,
            age_min,
            age_max,
            location,
            location_district,
            location_street,
            hospital,
            profession,
            marriage_status,
            fertility_status,
            location_from,
            hukou,
            education,
            family_size,
            income_individual,
            income_family,
            consumption_level,
            housing_status,
            economic_dependency,
            exclude_user,
            limit: Math.min(parseInt(limit, 10) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT),
            offset: parseInt(offset, 10) || 0
        });

        res.json({
            success: true,
            data: result.users,
            total: result.total
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
// Re-export middleware for backward compatibility
module.exports.authMiddleware = authMiddleware;
