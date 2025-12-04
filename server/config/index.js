/**
 * Centralized configuration
 * In production, these should come from environment variables
 */

module.exports = {
    // JWT Configuration
    JWT_SECRET: process.env.JWT_SECRET || 'p-likeme-secret-key-change-in-production',
    JWT_EXPIRES_IN: '7d',

    // Password validation rules
    PASSWORD_RULES: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: true
    },

    // Server configuration
    PORT: process.env.PORT || 3000
};
