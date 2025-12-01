/**
 * Thread Detail Page JavaScript
 * Handles loading and displaying a single thread
 */

// DOM Elements
const threadLoading = document.getElementById('thread-loading');
const threadContent = document.getElementById('thread-content');
const threadError = document.getElementById('thread-error');
const threadActionsBar = document.getElementById('thread-actions-bar');

// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const editModalClose = document.getElementById('edit-modal-close');
const editForm = document.getElementById('edit-form');
const editError = document.getElementById('edit-error');
const editCommunityCheckboxes = document.getElementById('edit-community-checkboxes');

// API Base
const THREADS_API = '/api/threads';

// Current thread data
let currentThread = null;
let userCommunities = [];

/**
 * Get thread ID from URL
 */
function getThreadIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

/**
 * Get auth headers
 */
function getAuthHeaders() {
    const token = localStorage.getItem('p_likeme_token');
    if (!token) return { 'Content-Type': 'application/json' };
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Get current user
 */
function getCurrentUser() {
    const userData = localStorage.getItem('p_likeme_user');
    return userData ? JSON.parse(userData) : null;
}

/**
 * Load thread data
 */
async function loadThread() {
    const threadId = getThreadIdFromUrl();

    if (!threadId) {
        showError('无效的分享链接');
        return;
    }

    try {
        const response = await fetch(`${THREADS_API}/${threadId}/public`);
        const data = await response.json();

        if (data.success) {
            currentThread = data.data;
            renderThread(data.data);
        } else {
            showError(data.error || '分享不存在');
        }
    } catch (error) {
        console.error('Error loading thread:', error);
        showError('加载失败，请稍后再试');
    }
}

/**
 * Render thread content
 */
function renderThread(thread) {
    // Update page title
    document.title = `${thread.title} - 像我一样`;

    // Populate content
    document.getElementById('thread-title').textContent = thread.title;
    document.getElementById('thread-author').textContent = thread.author || '匿名用户';
    document.getElementById('thread-date').textContent = formatDate(thread.created_at);
    document.getElementById('thread-body').textContent = thread.content;

    // Render communities
    const communitiesEl = document.getElementById('thread-communities');
    if (thread.communities && thread.communities.length > 0) {
        communitiesEl.innerHTML = thread.communities.map(c =>
            `<span class="community-tag">${escapeHtml(c.name)}</span>`
        ).join('');
    } else {
        communitiesEl.innerHTML = '';
    }

    // Show edit/delete buttons if user is the author
    const currentUser = getCurrentUser();
    if (currentUser && thread.user_id === currentUser.id) {
        threadActionsBar.style.display = 'flex';
        loadUserCommunities();
    }

    // Show content, hide loading
    threadLoading.style.display = 'none';
    threadContent.style.display = 'block';
}

/**
 * Show error message
 */
function showError(message) {
    document.getElementById('error-message').textContent = message;
    threadLoading.style.display = 'none';
    threadError.style.display = 'block';
}

/**
 * Format date string
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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

/**
 * Load user's joined communities for edit form
 */
async function loadUserCommunities() {
    try {
        const response = await fetch('/api/user/communities?details=true', {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            userCommunities = data.data;
        }
    } catch (error) {
        console.error('Error loading communities:', error);
    }
}

/**
 * Open edit modal
 */
function openEditModal() {
    if (!currentThread) return;

    // Populate form fields
    document.getElementById('edit-thread-id').value = currentThread.id;
    document.getElementById('edit-title').value = currentThread.title;
    document.getElementById('edit-content').value = currentThread.content;

    // Render community checkboxes
    if (userCommunities.length > 0) {
        const linkedIds = currentThread.communities.map(c => c.id);
        editCommunityCheckboxes.innerHTML = userCommunities.map(c => `
            <div class="community-checkbox">
                <input type="checkbox" id="edit-community-${c.id}" name="edit-communities" value="${c.id}" ${linkedIds.includes(c.id) ? 'checked' : ''}>
                <label for="edit-community-${c.id}">${escapeHtml(c.name)}</label>
            </div>
        `).join('');
    } else {
        editCommunityCheckboxes.innerHTML = `
            <p class="no-communities-hint">您还没有加入任何社区。请先到<a href="community.html">社区页面</a>加入感兴趣的社区。</p>
        `;
    }

    editError.textContent = '';
    editModal.classList.add('active');
}

/**
 * Close edit modal
 */
function closeEditModal() {
    editModal.classList.remove('active');
}

/**
 * Update thread
 */
async function updateThread(e) {
    e.preventDefault();

    const threadId = document.getElementById('edit-thread-id').value;
    const title = document.getElementById('edit-title').value;
    const content = document.getElementById('edit-content').value;

    // Get selected communities
    const selectedCommunities = Array.from(
        document.querySelectorAll('input[name="edit-communities"]:checked')
    ).map(cb => parseInt(cb.value));

    try {
        const response = await fetch(`${THREADS_API}/${threadId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                title,
                content,
                community_ids: selectedCommunities
            })
        });

        const data = await response.json();

        if (data.success) {
            closeEditModal();
            // Reload the thread to show updated content
            loadThread();
        } else {
            editError.textContent = data.error || '更新失败';
        }
    } catch (error) {
        console.error('Error updating thread:', error);
        editError.textContent = '网络错误，请稍后再试';
    }
}

/**
 * Delete thread
 */
async function deleteThread() {
    if (!currentThread) return;

    if (!confirm('确定要删除这条分享吗？删除后无法恢复。')) {
        return;
    }

    try {
        const response = await fetch(`${THREADS_API}/${currentThread.id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.success) {
            // Redirect to my shares page
            window.location.href = 'my-shares.html';
        } else {
            alert(data.error || '删除失败');
        }
    } catch (error) {
        console.error('Error deleting thread:', error);
        alert('网络错误，请稍后再试');
    }
}

// Event Listeners
document.getElementById('edit-thread-btn')?.addEventListener('click', openEditModal);
document.getElementById('delete-thread-btn')?.addEventListener('click', deleteThread);

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
    if (e.key === 'Escape' && editModal.classList.contains('active')) {
        closeEditModal();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadThread();
});
