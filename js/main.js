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
