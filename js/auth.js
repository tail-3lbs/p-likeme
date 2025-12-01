/**
 * Frontend Authentication
 * Handles login/signup modal and API calls
 */

// API base URL
const API_BASE = '/api/auth';

// DOM Elements
const authModal = document.getElementById('auth-modal');
const modalClose = document.getElementById('modal-close');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const switchToSignup = document.getElementById('switch-to-signup');
const switchToLogin = document.getElementById('switch-to-login');
const navActions = document.getElementById('nav-actions');

// Form elements
const loginFormEl = document.getElementById('login-form-el');
const signupFormEl = document.getElementById('signup-form-el');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');

// Token storage key
const TOKEN_KEY = 'p_likeme_token';
const USER_KEY = 'p_likeme_user';

/**
 * Open modal
 */
function openModal(showLogin = true) {
    authModal.classList.add('active');
    if (showLogin) {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    }
    // Clear errors
    loginError.textContent = '';
    signupError.textContent = '';
}

/**
 * Close modal
 */
function closeModal() {
    authModal.classList.remove('active');
    // Reset forms
    loginFormEl.reset();
    signupFormEl.reset();
    loginError.textContent = '';
    signupError.textContent = '';
}

/**
 * Save auth data to localStorage
 */
function saveAuthData(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get saved token
 */
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get saved user
 */
function getUser() {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
}

/**
 * Clear auth data
 */
function clearAuthData() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return !!getToken();
}

/**
 * Update navigation based on login state
 */
function updateNav() {
    const user = getUser();
    const navLinks = document.querySelector('.nav-links');

    if (user) {
        navActions.innerHTML = `
            <div class="user-menu">
                <span class="user-greeting">你好，<strong>${user.username}</strong></span>
                <a href="#" class="btn btn-outline" id="logout-btn">退出</a>
            </div>
        `;
        // Add logout handler
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });

        // Add "我的分享" link if not already present
        if (navLinks && !document.getElementById('threads-user-link')) {
            const threadsUserLi = document.createElement('li');
            threadsUserLi.id = 'threads-user-link';
            const isActive = (window.location.pathname.includes('threads-user') || window.location.pathname.includes('thread-detail')) ? ' class="active"' : '';
            threadsUserLi.innerHTML = `<a href="threads-user.html"${isActive}>我的分享</a>`;
            navLinks.appendChild(threadsUserLi);
        }
    } else {
        navActions.innerHTML = `
            <a href="#" class="btn btn-outline" id="login-btn">登录</a>
            <a href="#" class="btn btn-primary" id="signup-btn">注册</a>
        `;
        // Re-attach event listeners
        document.getElementById('login-btn').addEventListener('click', (e) => {
            e.preventDefault();
            openModal(true);
        });
        document.getElementById('signup-btn').addEventListener('click', (e) => {
            e.preventDefault();
            openModal(false);
        });

        // Remove "我的分享" link if present
        const threadsUserLink = document.getElementById('threads-user-link');
        if (threadsUserLink) {
            threadsUserLink.remove();
        }
    }
}

/**
 * Logout
 */
function logout() {
    clearAuthData();
    window.location.href = 'index.html';
}

/**
 * Handle login
 */
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            saveAuthData(data.data.token, data.data.user);
            closeModal();
            updateNav();
        } else {
            loginError.textContent = data.error || '登录失败';
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = '网络错误，请稍后再试';
    }
}

/**
 * Handle signup
 */
async function handleSignup(e) {
    e.preventDefault();

    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;

    // Client-side validation
    if (password !== passwordConfirm) {
        signupError.textContent = '两次输入的密码不一致';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            saveAuthData(data.data.token, data.data.user);
            closeModal();
            updateNav();
        } else {
            signupError.textContent = data.error || '注册失败';
        }
    } catch (error) {
        console.error('Signup error:', error);
        signupError.textContent = '网络错误，请稍后再试';
    }
}

// Event Listeners
if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(true);
    });
}

if (signupBtn) {
    signupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(false);
    });
}

if (modalClose) {
    modalClose.addEventListener('click', closeModal);
}

// Close modal on overlay click
if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            closeModal();
        }
    });
}

// Switch between forms
if (switchToSignup) {
    switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        loginError.textContent = '';
    });
}

if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        signupError.textContent = '';
    });
}

// Form submissions
if (loginFormEl) {
    loginFormEl.addEventListener('submit', handleLogin);
}

if (signupFormEl) {
    signupFormEl.addEventListener('submit', handleSignup);
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal.classList.contains('active')) {
        closeModal();
    }
});

// Password visibility toggle
document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const eyeOpen = btn.querySelector('.eye-open');
        const eyeClosed = btn.querySelector('.eye-closed');

        if (input.type === 'password') {
            input.type = 'text';
            btn.classList.add('active');
            eyeOpen.style.display = 'none';
            eyeClosed.style.display = 'block';
        } else {
            input.type = 'password';
            btn.classList.remove('active');
            eyeOpen.style.display = 'block';
            eyeClosed.style.display = 'none';
        }
    });
});

// Initialize: check login state on page load
document.addEventListener('DOMContentLoaded', () => {
    updateNav();
});
