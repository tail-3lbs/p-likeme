/**
 * My Shares Page JavaScript
 * Handles thread CRUD operations
 */

// DOM Elements
const loginRequired = document.getElementById('login-required');
const sharesContent = document.getElementById('shares-content');
const threadsList = document.getElementById('threads-list');
const noThreads = document.getElementById('no-threads');
const newShareBtn = document.getElementById('new-share-btn');
const promptLoginBtn = document.getElementById('prompt-login-btn');

// Thread Modal Elements
const threadModal = document.getElementById('thread-modal');
const threadModalClose = document.getElementById('thread-modal-close');
const threadForm = document.getElementById('thread-form');
const threadError = document.getElementById('thread-error');
const communityCheckboxes = document.getElementById('community-checkboxes');

// API Base
const THREADS_API = '/api/threads';
const COMMUNITIES_API = '/api/communities';

/**
 * Check if user is logged in and update UI
 */
function checkLoginState() {
    const token = localStorage.getItem('p_likeme_token');

    if (token) {
        loginRequired.style.display = 'none';
        sharesContent.style.display = 'block';
        loadThreads();
        loadCommunities();
    } else {
        loginRequired.style.display = 'block';
        sharesContent.style.display = 'none';
    }
}

/**
 * Get auth headers
 */
function getAuthHeaders() {
    const token = localStorage.getItem('p_likeme_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Load user's threads
 */
async function loadThreads() {
    try {
        threadsList.innerHTML = '<div class="loading">加载中...</div>';

        const response = await fetch(THREADS_API, {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.success) {
            renderThreads(data.data);
        } else {
            threadsList.innerHTML = '<div class="error-message">加载失败</div>';
        }
    } catch (error) {
        console.error('Error loading threads:', error);
        threadsList.innerHTML = '<div class="error-message">加载失败</div>';
    }
}

/**
 * Render threads list
 */
function renderThreads(threads) {
    if (threads.length === 0) {
        threadsList.innerHTML = '';
        noThreads.style.display = 'block';
        return;
    }

    noThreads.style.display = 'none';

    threadsList.innerHTML = threads.map(thread => `
        <div class="thread-card" data-id="${thread.id}">
            <div class="thread-card-header">
                <h3>${escapeHtml(thread.title)}</h3>
                <span class="thread-card-date">${formatDate(thread.created_at)}</span>
            </div>
            <p>${escapeHtml(thread.content)}</p>
            <div class="thread-card-footer">
                <div class="thread-communities">
                    ${thread.communities.map(c => `<span class="community-tag">${escapeHtml(c.name)}</span>`).join('')}
                </div>
                <div class="thread-actions">
                    <button class="btn-delete" onclick="deleteThread(${thread.id})">删除</button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Load user's joined communities for the form
 */
async function loadCommunities() {
    try {
        const response = await fetch('/api/user/communities?details=true', {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            communityCheckboxes.innerHTML = data.data.map(c => `
                <div class="community-checkbox">
                    <input type="checkbox" id="community-${c.id}" name="communities" value="${c.id}">
                    <label for="community-${c.id}">${escapeHtml(c.name)}</label>
                </div>
            `).join('');
        } else {
            communityCheckboxes.innerHTML = `
                <p class="no-communities-hint">您还没有加入任何社区。请先到<a href="community.html">社区页面</a>加入感兴趣的社区。</p>
            `;
        }
    } catch (error) {
        console.error('Error loading communities:', error);
    }
}

/**
 * Open thread modal
 */
function openThreadModal() {
    threadModal.classList.add('active');
    threadForm.reset();
    threadError.textContent = '';
}

/**
 * Close thread modal
 */
function closeThreadModal() {
    threadModal.classList.remove('active');
}

/**
 * Create a new thread
 */
async function createThread(e) {
    e.preventDefault();

    const title = document.getElementById('thread-title').value;
    const content = document.getElementById('thread-content').value;

    // Get selected communities
    const selectedCommunities = Array.from(
        document.querySelectorAll('input[name="communities"]:checked')
    ).map(cb => parseInt(cb.value));

    try {
        const response = await fetch(THREADS_API, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                title,
                content,
                community_ids: selectedCommunities
            })
        });

        const data = await response.json();

        if (data.success) {
            closeThreadModal();
            loadThreads();
        } else {
            threadError.textContent = data.error || '创建失败';
        }
    } catch (error) {
        console.error('Error creating thread:', error);
        threadError.textContent = '网络错误，请稍后再试';
    }
}

/**
 * Delete a thread
 */
async function deleteThread(id) {
    if (!confirm('确定要删除这条分享吗？')) {
        return;
    }

    try {
        const response = await fetch(`${THREADS_API}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.success) {
            loadThreads();
        } else {
            alert(data.error || '删除失败');
        }
    } catch (error) {
        console.error('Error deleting thread:', error);
        alert('网络错误，请稍后再试');
    }
}

/**
 * Format date string
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Listeners
if (newShareBtn) {
    newShareBtn.addEventListener('click', openThreadModal);
}

if (threadModalClose) {
    threadModalClose.addEventListener('click', closeThreadModal);
}

if (threadModal) {
    threadModal.addEventListener('click', (e) => {
        if (e.target === threadModal) {
            closeThreadModal();
        }
    });
}

if (threadForm) {
    threadForm.addEventListener('submit', createThread);
}

if (promptLoginBtn) {
    promptLoginBtn.addEventListener('click', () => {
        // Trigger login modal from auth.js
        document.getElementById('login-btn')?.click();
    });
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && threadModal.classList.contains('active')) {
        closeThreadModal();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkLoginState();
});

// Re-check login state when localStorage changes (for login/logout)
window.addEventListener('storage', (e) => {
    if (e.key === 'p_likeme_token') {
        checkLoginState();
    }
});
