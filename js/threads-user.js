/**
 * Shares Page JavaScript
 * Handles viewing and managing threads/shares
 * Supports viewing own threads or other users' threads (read-only)
 */

// Get username from URL (if viewing other user's threads)
const urlParams = new URLSearchParams(window.location.search);
const viewUsername = urlParams.get('user');

// State
let isOwnPage = false;
let viewingUser = null;
let allCommunities = []; // All available communities for selectors

// Community selectors (using shared module)
let threadCommunitySelector = null;
let editCommunitySelector = null;

// DOM Elements
const loginRequired = document.getElementById('login-required');
const sharesContent = document.getElementById('shares-content');
const threadsList = document.getElementById('threads-list');
const noThreads = document.getElementById('no-threads');
const newShareBtn = document.getElementById('new-share-btn');
const promptLoginBtn = document.getElementById('prompt-login-btn');
const pageTitle = document.getElementById('page-title');

// Thread Modal Elements
const threadModal = document.getElementById('thread-modal');
const threadModalClose = document.getElementById('thread-modal-close');
const threadForm = document.getElementById('thread-form');
const threadError = document.getElementById('thread-error');

// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const editModalClose = document.getElementById('edit-modal-close');
const editForm = document.getElementById('edit-form');
const editError = document.getElementById('edit-error');

// API Base
const THREADS_API = '/api/threads';
const COMMUNITIES_API = '/api/communities';

/**
 * Check if user is logged in and update UI
 */
function checkLoginState() {
    const currentUser = getUser();

    if (!currentUser) {
        // Not logged in - show login prompt
        loginRequired.style.display = 'block';
        sharesContent.style.display = 'none';
        return;
    }

    // Determine if viewing own page or another user's page
    if (viewUsername) {
        // Viewing a specific user's threads
        isOwnPage = currentUser && currentUser.username === viewUsername;
        viewingUser = viewUsername;
    } else {
        // No user specified - show current user's threads
        isOwnPage = true;
        viewingUser = currentUser ? currentUser.username : null;
    }

    // Update page title
    if (isOwnPage) {
        pageTitle.textContent = '我的分享';
        document.title = '我的分享 - 像我一样';
    } else {
        pageTitle.innerHTML = `<a href="profile.html?user=${encodeURIComponent(viewingUser)}" class="username-link">${escapeHtml(viewingUser)}</a> 的分享`;
        document.title = `${viewingUser} 的分享 - 像我一样`;
    }

    // Show/hide new share button based on ownership
    if (newShareBtn) {
        newShareBtn.style.display = isOwnPage ? 'block' : 'none';
    }

    loginRequired.style.display = 'none';
    sharesContent.style.display = 'block';
    loadThreads();

    // Only load user data for own page (for create/edit forms)
    if (isOwnPage) {
        loadUserData();
    }
}

/**
 * Load all communities for the selectors (threads are independent from user profile)
 */
async function loadUserData() {
    try {
        // Load ALL communities (not just user's joined ones)
        const response = await fetch('/api/communities', { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            allCommunities = data.data;
        }

        // Initialize the community selectors using shared module
        threadCommunitySelector = new CommunitySelector('thread', allCommunities);
        threadCommunitySelector.init();

        editCommunitySelector = new CommunitySelector('edit', allCommunities);
        editCommunitySelector.init();
    } catch (error) {
        console.error('Error loading communities:', error);
    }
}

/**
 * Load threads (own or another user's)
 */
async function loadThreads() {
    try {
        threadsList.innerHTML = '<div class="loading">加载中...</div>';

        // Use different API endpoint based on whether viewing own or other's threads
        let apiUrl;
        if (isOwnPage) {
            apiUrl = THREADS_API;
        } else {
            apiUrl = `${THREADS_API}/user/${encodeURIComponent(viewingUser)}`;
        }

        const response = await fetch(apiUrl, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            renderThreads(data.data);
        } else {
            threadsList.innerHTML = `<div class="error-message">${data.error || '加载失败'}</div>`;
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
        // Update no-threads message based on ownership
        if (isOwnPage) {
            noThreads.innerHTML = `
                <p>你还没有发布任何分享</p>
                <p>点击上方"新建分享"按钮开始记录吧</p>
            `;
        } else {
            noThreads.innerHTML = `
                <p>${escapeHtml(viewingUser)} 还没有发布任何分享</p>
            `;
        }
        return;
    }

    noThreads.style.display = 'none';

    threadsList.innerHTML = threads.map(thread => {
        // Build community tags with full displayPath
        const communityTags = thread.communities.map(c => {
            // Build URL with stage/type parameters
            let href = `community-detail.html?id=${c.id}`;
            if (c.stage) href += `&stage=${encodeURIComponent(c.stage)}`;
            if (c.type) href += `&type=${encodeURIComponent(c.type)}`;
            const displayText = c.displayPath || c.name;
            return `<a href="${href}" class="community-tag">${escapeHtml(displayText)}</a>`;
        }).join('');

        return `
            <div class="thread-card" data-id="${thread.id}">
                <a href="thread-detail.html?id=${thread.id}" class="thread-card-clickable">
                    <div class="thread-card-header">
                        <h3>${escapeHtml(thread.title)}</h3>
                        <span class="thread-card-date">${formatDate(thread.created_at)}</span>
                    </div>
                    <p>${escapeHtml(thread.content)}</p>
                </a>
                <div class="thread-card-info">
                    <span class="thread-reply-count">${thread.reply_count || 0} 回复</span>
                    <div class="thread-communities">
                        ${communityTags}
                    </div>
                </div>
                ${isOwnPage ? `
                <div class="thread-card-footer">
                    <div class="thread-actions">
                        <button class="btn-edit" onclick="openEditModal(${thread.id})">编辑</button>
                        <button class="btn-delete" onclick="deleteThread(${thread.id})">删除</button>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Open thread modal
 */
function openThreadModal() {
    threadModal.classList.add('active');
    threadForm.reset();
    threadError.textContent = '';
    // Clear selected communities
    if (threadCommunitySelector) {
        threadCommunitySelector.clear();
    }
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

    // Get selected communities with dimension info
    const communityLinks = threadCommunitySelector ? threadCommunitySelector.getSelected() : [];

    try {
        const response = await fetch(THREADS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                title,
                content,
                community_links: communityLinks
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
            credentials: 'include'
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
 * Open edit modal and load thread data
 */
async function openEditModal(threadId) {
    try {
        // Fetch thread data (use private endpoint to get thread's own diseases and communities)
        const response = await fetch(`${THREADS_API}/${threadId}`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (!data.success) {
            alert(data.error || '加载分享数据失败');
            return;
        }

        const thread = data.data;

        // Populate form fields
        document.getElementById('edit-thread-id').value = thread.id;
        document.getElementById('edit-title').value = thread.title;
        document.getElementById('edit-content').value = thread.content;

        // Load communities using shared selector
        if (editCommunitySelector) {
            editCommunitySelector.setSelected(thread.communities || []);
        }

        editError.textContent = '';
        editModal.classList.add('active');
    } catch (error) {
        console.error('Error loading thread:', error);
        alert('网络错误，请稍后再试');
    }
}

/**
 * Close edit modal
 */
function closeEditModal() {
    editModal.classList.remove('active');
}

/**
 * Update a thread
 */
async function updateThread(e) {
    e.preventDefault();

    const threadId = document.getElementById('edit-thread-id').value;
    const title = document.getElementById('edit-title').value;
    const content = document.getElementById('edit-content').value;

    // Get selected communities with dimension info
    const communityLinks = editCommunitySelector ? editCommunitySelector.getSelected() : [];

    try {
        const response = await fetch(`${THREADS_API}/${threadId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                title,
                content,
                community_links: communityLinks
            })
        });

        const data = await response.json();

        if (data.success) {
            closeEditModal();
            loadThreads();
        } else {
            editError.textContent = data.error || '更新失败';
        }
    } catch (error) {
        console.error('Error updating thread:', error);
        editError.textContent = '网络错误，请稍后再试';
    }
}

/**
 * Format date string - uses shared CST formatting from main.js
 */
function formatDate(dateStr) {
    return formatCSTDateFull(dateStr);
}

// escapeHtml is defined in main.js
// handleClickOutside is defined in community-selector.js

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

// Edit modal event listeners
if (editModalClose) {
    editModalClose.addEventListener('click', closeEditModal);
}

if (editModal) {
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    });
}

if (editForm) {
    editForm.addEventListener('submit', updateThread);
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (threadModal.classList.contains('active')) {
            closeThreadModal();
        }
        if (editModal.classList.contains('active')) {
            closeEditModal();
        }
    }
});

// Note: handleClickOutside for dropdowns is handled in community-selector.js

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkLoginState();

    // Community tag clicks - redirect to community detail page
    threadsList.addEventListener('click', (e) => {
        const tag = e.target.closest('.community-tag[data-community-id]');
        if (tag) {
            e.preventDefault();
            window.location.href = `community-detail.html?id=${tag.dataset.communityId}`;
        }
    });
});

// Re-check login state when localStorage changes (cross-tab)
window.addEventListener('storage', (e) => {
    if (e.key === USER_KEY) {
        checkLoginState();
    }
});

// Re-check login state on same-tab auth changes
window.addEventListener('authStateChanged', checkLoginState);
