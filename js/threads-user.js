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
const communityCheckboxes = document.getElementById('community-checkboxes');

// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const editModalClose = document.getElementById('edit-modal-close');
const editForm = document.getElementById('edit-form');
const editError = document.getElementById('edit-error');
const editCommunityCheckboxes = document.getElementById('edit-community-checkboxes');

// Store user communities for edit modal
let userCommunities = [];

// API Base
const THREADS_API = '/api/threads';
const COMMUNITIES_API = '/api/communities';

/**
 * Check if user is logged in and update UI
 */
function checkLoginState() {
    const token = localStorage.getItem('p_likeme_token');
    const currentUser = JSON.parse(localStorage.getItem('p_likeme_user') || 'null');

    if (!token) {
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
        pageTitle.textContent = `${viewingUser} 的分享`;
        document.title = `${viewingUser} 的分享 - 像我一样`;
    }

    // Show/hide new share button based on ownership
    if (newShareBtn) {
        newShareBtn.style.display = isOwnPage ? 'block' : 'none';
    }

    loginRequired.style.display = 'none';
    sharesContent.style.display = 'block';
    loadThreads();

    // Only load communities for own page (for create/edit forms)
    if (isOwnPage) {
        loadCommunities();
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
            headers: getAuthHeaders()
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

    threadsList.innerHTML = threads.map(thread => `
        <div class="thread-card" data-id="${thread.id}">
            <a href="thread-detail.html?id=${thread.id}" class="thread-card-clickable">
                <div class="thread-card-header">
                    <h3>${escapeHtml(thread.title)}</h3>
                    <span class="thread-card-date">${formatDate(thread.created_at)}</span>
                </div>
                <p>${escapeHtml(thread.content)}</p>
            </a>
            <div class="thread-communities">
                ${thread.communities.map(c => `<span class="community-tag" data-community-id="${c.id}">${escapeHtml(c.name)}</span>`).join('')}
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
            userCommunities = data.data;
            renderCommunityCheckboxes(communityCheckboxes, data.data, 'communities');
        } else {
            userCommunities = [];
            communityCheckboxes.innerHTML = `
                <p class="no-communities-hint">您还没有加入任何社区。请先到<a href="community.html">社区页面</a>加入感兴趣的社区。</p>
            `;
        }
    } catch (error) {
        console.error('Error loading communities:', error);
    }
}

/**
 * Render community checkboxes with dimension options
 */
function renderCommunityCheckboxes(container, communities, prefix, selectedLinks = []) {
    // Build a map of selected links for easy lookup
    const selectedMap = {};
    selectedLinks.forEach(link => {
        const key = `${link.id}-${link.stage || ''}-${link.type || ''}`;
        selectedMap[key] = true;
    });

    container.innerHTML = communities.map(c => {
        const dimensions = c.dimensions ? JSON.parse(c.dimensions) : null;
        const hasDimensions = dimensions && (dimensions.stage || dimensions.type);
        const isChecked = selectedLinks.some(link => link.id === c.id);

        let html = `
            <div class="community-checkbox-group" data-community-id="${c.id}">
                <div class="community-checkbox">
                    <input type="checkbox" id="${prefix}-${c.id}" name="${prefix}" value="${c.id}" ${isChecked ? 'checked' : ''}>
                    <label for="${prefix}-${c.id}">${escapeHtml(c.name)}</label>
                </div>
        `;

        // Add dimension options if available
        if (hasDimensions) {
            html += `<div class="dimension-options" id="${prefix}-dimensions-${c.id}" style="display: ${isChecked ? 'block' : 'none'};">`;

            // Stage options
            if (dimensions.stage) {
                html += `
                    <div class="dimension-group">
                        <label class="dimension-label">${escapeHtml(dimensions.stage.label)}（可选）</label>
                        <select id="${prefix}-stage-${c.id}" class="dimension-select" data-community-id="${c.id}" data-dimension="stage">
                            <option value="">不限</option>
                            ${dimensions.stage.values.map(v => {
                                const isSelected = selectedLinks.some(link => link.id === c.id && link.stage === v);
                                return `<option value="${escapeHtml(v)}" ${isSelected ? 'selected' : ''}>${escapeHtml(v)}</option>`;
                            }).join('')}
                        </select>
                    </div>
                `;
            }

            // Type options
            if (dimensions.type) {
                html += `
                    <div class="dimension-group">
                        <label class="dimension-label">${escapeHtml(dimensions.type.label)}（可选）</label>
                        <select id="${prefix}-type-${c.id}" class="dimension-select" data-community-id="${c.id}" data-dimension="type">
                            <option value="">不限</option>
                            ${dimensions.type.values.map(v => {
                                const isSelected = selectedLinks.some(link => link.id === c.id && link.type === v);
                                return `<option value="${escapeHtml(v)}" ${isSelected ? 'selected' : ''}>${escapeHtml(v)}</option>`;
                            }).join('')}
                        </select>
                    </div>
                `;
            }

            html += '</div>';
        }

        html += '</div>';
        return html;
    }).join('');

    // Add event listeners for checkbox changes
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const communityId = e.target.value;
            const dimensionsEl = document.getElementById(`${prefix}-dimensions-${communityId}`);
            if (dimensionsEl) {
                dimensionsEl.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    });
}

/**
 * Get selected community links from a checkbox container
 */
function getSelectedCommunityLinks(container, prefix) {
    const links = [];
    const checkedBoxes = container.querySelectorAll(`input[name="${prefix}"]:checked`);

    checkedBoxes.forEach(checkbox => {
        const communityId = parseInt(checkbox.value);
        const stageSelect = document.getElementById(`${prefix}-stage-${communityId}`);
        const typeSelect = document.getElementById(`${prefix}-type-${communityId}`);

        links.push({
            id: communityId,
            stage: stageSelect ? stageSelect.value : '',
            type: typeSelect ? typeSelect.value : ''
        });
    });

    return links;
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

    // Get selected communities with dimension info
    const communityLinks = getSelectedCommunityLinks(communityCheckboxes, 'communities');

    try {
        const response = await fetch(THREADS_API, {
            method: 'POST',
            headers: getAuthHeaders(),
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
 * Open edit modal and load thread data
 */
async function openEditModal(threadId) {
    try {
        // Fetch thread data (use public endpoint to get full community details)
        const response = await fetch(`${THREADS_API}/${threadId}/public`, {
            headers: getAuthHeaders()
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

        // Render community checkboxes with dimension options
        if (userCommunities.length > 0) {
            // Convert thread communities to links format
            const selectedLinks = thread.communities.map(c => ({
                id: c.id,
                stage: c.stage || '',
                type: c.type || ''
            }));
            renderCommunityCheckboxes(editCommunityCheckboxes, userCommunities, 'edit-communities', selectedLinks);
        } else {
            editCommunityCheckboxes.innerHTML = `
                <p class="no-communities-hint">您还没有加入任何社区。请先到<a href="community.html">社区页面</a>加入感兴趣的社区。</p>
            `;
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
    const communityLinks = getSelectedCommunityLinks(editCommunityCheckboxes, 'edit-communities');

    try {
        const response = await fetch(`${THREADS_API}/${threadId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
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

// Re-check login state when localStorage changes (for login/logout)
window.addEventListener('storage', (e) => {
    if (e.key === 'p_likeme_token') {
        checkLoginState();
    }
});
