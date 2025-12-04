/**
 * P-LikeMe Learning Project
 * Main JavaScript file
 */

// Log that JS is loaded (for learning/debugging)
console.log('P-LikeMe learning project loaded');

// ============ Shared Constants ============

const USER_KEY = 'p_likeme_user';

// ============ Shared Utilities ============

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - HTML-escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Parse a CST date string (from database) correctly
 * Database stores dates in 'YYYY-MM-DD HH:MM:SS' format in China Standard Time
 * @param {string} dateString - Date string from database
 * @returns {Date} - Date object representing the CST time
 */
function parseCSTDate(dateString) {
    // If already contains timezone info or is ISO format, parse directly
    if (dateString.includes('T') || dateString.includes('Z')) {
        return new Date(dateString);
    }
    // Parse as CST (UTC+8) by appending timezone offset
    // The date string is in format 'YYYY-MM-DD HH:MM:SS' and represents CST time
    return new Date(dateString.replace(' ', 'T') + '+08:00');
}

/**
 * Get current time in CST for comparison
 * @returns {Date} - Current time adjusted to CST
 */
function getCSTNow() {
    const now = new Date();
    // Get UTC time, then add 8 hours for CST
    const cstOffset = 8 * 60 * 60 * 1000;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    return new Date(utcTime + cstOffset);
}

/**
 * Format a CST date string for display (relative time)
 * @param {string} dateString - Date string from database
 * @returns {string} - Formatted date string
 */
function formatCSTDateRelative(dateString) {
    const date = parseCSTDate(dateString);
    const now = getCSTNow();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return minutes <= 1 ? '刚刚' : `${minutes}分钟前`;
        }
        return `${hours}小时前`;
    } else if (days === 1) {
        return '昨天';
    } else if (days < 7) {
        return `${days}天前`;
    } else {
        // Format as date only
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}/${month}/${day}`;
    }
}

/**
 * Format a CST date string for display (absolute, simple date)
 * @param {string} dateString - Date string from database
 * @returns {string} - Formatted date string (YYYY/M/D)
 */
function formatCSTDateSimple(dateString) {
    const date = parseCSTDate(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}/${month}/${day}`;
}

/**
 * Format a CST date string for display (with time)
 * @param {string} dateString - Date string from database
 * @returns {string} - Formatted date string (YYYY年M月D日 HH:MM)
 */
function formatCSTDateFull(dateString) {
    const date = parseCSTDate(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

/**
 * Get current user from localStorage
 * Note: Token is stored in HttpOnly cookie (not accessible via JS)
 * @returns {object|null}
 */
function getUser() {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
}

/**
 * Save user data to localStorage
 * Note: Token is set as HttpOnly cookie by server
 * @param {object} user
 */
function saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clear user data from localStorage
 * Note: Cookie is cleared by server on logout
 */
function clearUser() {
    localStorage.removeItem(USER_KEY);
}

/**
 * Dispatch auth state changed event
 * Call this after login/logout to notify other components
 */
function dispatchAuthChange() {
    window.dispatchEvent(new CustomEvent('authStateChanged'));
}

/**
 * Check if user is logged in by calling /api/auth/me
 * Returns user data if logged in, null otherwise
 * @returns {Promise<object|null>}
 */
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                saveUser(data.data);
                return data.data;
            }
        }
        // Not logged in or token expired
        clearUser();
        return null;
    } catch (error) {
        console.error('Auth check failed:', error);
        clearUser();
        return null;
    }
}

/**
 * Hero Carousel
 * Auto-switches images every 3 seconds
 */
(function() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');

    // Only run carousel code if slides exist (homepage only)
    if (slides.length === 0) return;

    let currentIndex = 0;
    const intervalTime = 3000; // 3 seconds

    // Function to show a specific slide
    function showSlide(index) {
        // Remove active class from all slides and dots
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        // Add active class to current slide and dot
        slides[index].classList.add('active');
        dots[index].classList.add('active');
    }

    // Function to go to next slide
    function nextSlide() {
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
    }

    // Auto-advance slides every 3 seconds
    let autoSlide = setInterval(nextSlide, intervalTime);

    // Click on dots to navigate
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentIndex = index;
            showSlide(currentIndex);

            // Reset the auto-slide timer when user clicks
            clearInterval(autoSlide);
            autoSlide = setInterval(nextSlide, intervalTime);
        });
    });

    // Pause on hover (optional, better UX)
    const carousel = document.querySelector('.hero-carousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', () => {
            clearInterval(autoSlide);
        });

        carousel.addEventListener('mouseleave', () => {
            autoSlide = setInterval(nextSlide, intervalTime);
        });
    }
})();
