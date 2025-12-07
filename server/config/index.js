/**
 * Centralized configuration
 * In production, these should come from environment variables
 */

const crypto = require('crypto');

// Generate a random secret if not provided (unique per server restart)
const defaultSecret = crypto.randomBytes(32).toString('hex');

module.exports = {
    // JWT Configuration
    JWT_SECRET: process.env.JWT_SECRET || defaultSecret,
    JWT_EXPIRES_IN: '7d',

    // Bcrypt configuration
    BCRYPT_SALT_ROUNDS: 10,

    // Password validation rules
    PASSWORD_RULES: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: true
    },

    // Input length limits
    INPUT_LIMITS: {
        // User
        USERNAME_MIN: 2,
        USERNAME_MAX: 20,

        // Thread
        THREAD_TITLE_MIN: 1,
        THREAD_TITLE_MAX: 200,
        THREAD_CONTENT_MIN: 1,
        THREAD_CONTENT_MAX: 10000,

        // Reply
        REPLY_CONTENT_MIN: 1,
        REPLY_CONTENT_MAX: 5000,

        // Profile fields
        PROFILE_FIELD_MAX: 100,      // For short fields like profession, location
        DISEASE_TAG_MAX: 50,
        HOSPITAL_NAME_MAX: 100,
        MAX_DISEASE_TAGS: 20,
        MAX_HOSPITALS: 10,

        // Guru
        GURU_INTRO_MAX: 2000,
        GURU_QUESTION_TITLE_MIN: 1,
        GURU_QUESTION_TITLE_MAX: 200,
        GURU_QUESTION_CONTENT_MIN: 1,
        GURU_QUESTION_CONTENT_MAX: 5000,
        GURU_REPLY_CONTENT_MIN: 1,
        GURU_REPLY_CONTENT_MAX: 5000
    },

    // Server configuration
    PORT: process.env.PORT || 3000,

    // Pagination limits
    // Frontend uses: discover.js LIMIT=20, community-detail.js THREADS_PER_PAGE=10
    // Set MAX_LIMIT higher than frontend needs but low enough to prevent abuse
    PAGINATION: {
        MAX_LIMIT: 100,
        DEFAULT_LIMIT: 20
    }
};
