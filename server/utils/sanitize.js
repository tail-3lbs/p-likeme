/**
 * Input sanitization utilities
 * Defense in depth - sanitize on server even though frontend also escapes
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return str;
    if (typeof str !== 'string') return str;

    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Sanitize user input - trim and escape HTML
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized and trimmed string
 */
function sanitizeInput(str) {
    if (str === null || str === undefined) return str;
    if (typeof str !== 'string') return str;

    return escapeHtml(str.trim());
}

/**
 * Sanitize an array of strings
 * @param {string[]} arr - Array of strings to sanitize
 * @returns {string[]} - Array of sanitized strings
 */
function sanitizeArray(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map(item => {
        if (typeof item === 'string') {
            return sanitizeInput(item);
        }
        if (typeof item === 'object' && item !== null) {
            return sanitizeObject(item);
        }
        return item;
    });
}

/**
 * Sanitize all string properties in an object
 * @param {object} obj - Object with string properties to sanitize
 * @returns {object} - Object with sanitized string properties
 */
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeInput(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = sanitizeArray(value);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

module.exports = {
    escapeHtml,
    sanitizeInput,
    sanitizeArray,
    sanitizeObject
};
