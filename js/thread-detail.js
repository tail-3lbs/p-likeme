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

// Reply Elements
const replyFormContainer = document.getElementById('reply-form-container');
const replyLoginHint = document.getElementById('reply-login-hint');
const replyForm = document.getElementById('reply-form');
const replyContent = document.getElementById('reply-content');
const replyError = document.getElementById('reply-error');
const repliesList = document.getElementById('replies-list');
const repliesCount = document.getElementById('replies-count');
const noReplies = document.getElementById('no-replies');

// API Base
const THREADS_API = '/api/threads';

// Current thread data
let currentThread = null;
let currentReplies = [];
let userCommunities = [];
let replyingTo = null; // Track which reply we're responding to

/**
 * Get thread ID from URL
 */
function getThreadIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

/**
 * Get current user (uses global getUser from main.js)
 */
function getCurrentUser() {
    return getUser();
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
    const authorEl = document.getElementById('thread-author');
    const authorName = thread.author || '匿名用户';
    authorEl.innerHTML = `<a href="profile.html?user=${encodeURIComponent(authorName)}" class="username-link">${escapeHtml(authorName)}</a>`;
    document.getElementById('thread-date').textContent = formatDate(thread.created_at);
    document.getElementById('thread-body').textContent = thread.content;

    // Render communities with full path (including stage/type)
    const communitiesEl = document.getElementById('thread-communities');
    if (thread.communities && thread.communities.length > 0) {
        communitiesEl.innerHTML = thread.communities.map(c => {
            // Build URL with stage/type parameters
            let href = `community-detail.html?id=${c.id}`;
            if (c.stage) href += `&stage=${encodeURIComponent(c.stage)}`;
            if (c.type) href += `&type=${encodeURIComponent(c.type)}`;

            return `<span class="community-tag" data-community-id="${c.id}" data-stage="${c.stage || ''}" data-type="${c.type || ''}" data-href="${href}">${escapeHtml(c.displayPath)}</span>`;
        }).join('');
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

    // Load replies after thread is rendered
    loadReplies();
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

// escapeHtml is defined in main.js

/**
 * Load user's joined communities for edit form
 */
async function loadUserCommunities() {
    try {
        const response = await fetch('/api/user/communities?details=true', {
            credentials: 'include'
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
    ).map(cb => parseInt(cb.value, 10));

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
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            // Redirect to user's threads page
            window.location.href = 'threads-user.html';
        } else {
            alert(data.error || '删除失败');
        }
    } catch (error) {
        console.error('Error deleting thread:', error);
        alert('网络错误，请稍后再试');
    }
}

// ============ Reply Functions ============

/**
 * Initialize reply section based on login status
 */
function initReplySection() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        replyFormContainer.style.display = 'block';
        replyLoginHint.style.display = 'none';
    } else {
        replyFormContainer.style.display = 'none';
        replyLoginHint.style.display = 'block';
    }
}

/**
 * Load replies for current thread
 */
async function loadReplies() {
    if (!currentThread) return;

    try {
        const response = await fetch(`${THREADS_API}/${currentThread.id}/replies`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
            currentReplies = data.data;
            renderReplies(data.data);
        }
    } catch (error) {
        console.error('Error loading replies:', error);
    }
}

/**
 * Render replies list - grouped into cards
 * Top-level replies (parent_reply_id = null) start new cards
 * Child replies are stacked within the same card
 */
function renderReplies(replies) {
    repliesCount.textContent = replies.length;

    if (replies.length === 0) {
        repliesList.innerHTML = '';
        noReplies.style.display = 'block';
        return;
    }

    noReplies.style.display = 'none';

    // Build reply map for quick lookups
    const replyMap = {};
    replies.forEach(r => { replyMap[r.id] = r; });

    // Find root for each reply (follow parent chain)
    function findRoot(reply) {
        if (!reply.parent_reply_id) return reply.id;
        const parent = replyMap[reply.parent_reply_id];
        return parent ? findRoot(parent) : reply.id;
    }

    // Group replies by their root
    const topLevelReplies = replies.filter(r => !r.parent_reply_id);
    const childrenByRoot = {};

    replies.forEach(reply => {
        if (reply.parent_reply_id) {
            const rootId = findRoot(reply);
            if (!childrenByRoot[rootId]) {
                childrenByRoot[rootId] = [];
            }
            childrenByRoot[rootId].push(reply);
        }
    });

    // Render grouped cards
    repliesList.innerHTML = topLevelReplies.map(topReply => {
        const children = childrenByRoot[topReply.id] || [];
        return renderReplyCard(topReply, children, replyMap);
    }).join('');
}

/**
 * Render a reply card (top-level reply + stacked child replies)
 */
function renderReplyCard(topReply, children, replyMap) {
    // Render top-level reply
    const topReplyHtml = renderSingleReply(topReply, null, replyMap);

    // Render stacked child replies (sorted by date)
    children.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const childrenHtml = children.map(child => renderSingleReply(child, child.parent_reply_id, replyMap)).join('');

    return `
        <div class="reply-card" data-card-id="${topReply.id}">
            ${topReplyHtml}
            ${childrenHtml}
        </div>
    `;
}

/**
 * Render a single reply item (used for both top-level and stacked replies)
 */
function renderSingleReply(reply, parentReplyId, replyMap) {
    const currentUser = getCurrentUser();
    const isOwner = currentUser && reply.user_id === currentUser.id;
    const isThreadAuthor = currentThread && reply.user_id === currentThread.user_id;

    // Get @mention if this is a reply to another reply
    let mentionHtml = '';
    if (parentReplyId && replyMap[parentReplyId]) {
        const parentAuthor = replyMap[parentReplyId].author;
        mentionHtml = `<span class="reply-mention">回复 <a href="profile.html?user=${encodeURIComponent(parentAuthor)}" class="username-link">@${escapeHtml(parentAuthor)}</a>:</span> `;
    }

    return `
        <div class="reply-item ${parentReplyId ? 'reply-stacked' : ''}" data-reply-id="${reply.id}">
            <div class="reply-header">
                <span class="reply-author ${isThreadAuthor ? 'is-thread-author' : ''}">
                    <a href="profile.html?user=${encodeURIComponent(reply.author)}" class="username-link">${escapeHtml(reply.author)}</a>
                    ${isThreadAuthor ? '<span class="author-badge">作者</span>' : ''}
                </span>
                <span class="reply-date">${formatDate(reply.created_at)}</span>
            </div>
            <div class="reply-body">
                <p>${mentionHtml}${escapeHtml(reply.content)}</p>
            </div>
            <div class="reply-actions">
                ${currentUser ? `<button class="reply-action-btn reply-to-btn" data-reply-id="${reply.id}" data-author="${escapeHtml(reply.author)}">回复</button>` : ''}
                ${isOwner ? `<button class="reply-action-btn delete-reply-btn" data-reply-id="${reply.id}">删除</button>` : ''}
            </div>
        </div>
    `;
}

/**
 * Submit a new reply
 */
async function submitReply(e) {
    e.preventDefault();

    const content = replyContent.value.trim();
    if (!content) {
        replyError.textContent = '回复内容不能为空';
        return;
    }

    try {
        const body = { content };
        if (replyingTo) {
            body.parent_reply_id = replyingTo.id;
        }

        const response = await fetch(`${THREADS_API}/${currentThread.id}/replies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            replyContent.value = '';
            replyError.textContent = '';
            cancelReplyTo();
            loadReplies();
        } else {
            replyError.textContent = data.error || '回复失败';
        }
    } catch (error) {
        console.error('Error submitting reply:', error);
        replyError.textContent = '网络错误，请稍后再试';
    }
}

/**
 * Set which reply we're responding to
 */
function setReplyTo(replyId, author) {
    replyingTo = { id: replyId, author };
    replyContent.placeholder = `回复 @${author}...`;
    replyContent.focus();

    // Show cancel hint
    const existingHint = document.getElementById('replying-to-hint');
    if (existingHint) existingHint.remove();

    const hint = document.createElement('div');
    hint.id = 'replying-to-hint';
    hint.className = 'replying-to-hint';
    hint.innerHTML = `正在回复 <strong>@${escapeHtml(author)}</strong> <button type="button" class="cancel-reply-btn">取消</button>`;
    replyForm.insertBefore(hint, replyForm.firstChild);

    hint.querySelector('.cancel-reply-btn').addEventListener('click', cancelReplyTo);
}

/**
 * Cancel replying to a specific reply
 */
function cancelReplyTo() {
    replyingTo = null;
    replyContent.placeholder = '写下你的回复...';

    const hint = document.getElementById('replying-to-hint');
    if (hint) hint.remove();
}

/**
 * Delete a reply
 */
async function deleteReplyItem(replyId) {
    if (!confirm('确定要删除这条回复吗？')) {
        return;
    }

    try {
        const response = await fetch(`${THREADS_API}/${currentThread.id}/replies/${replyId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            loadReplies();
        } else {
            alert(data.error || '删除失败');
        }
    } catch (error) {
        console.error('Error deleting reply:', error);
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

// Reply form submit
if (replyForm) {
    replyForm.addEventListener('submit', submitReply);
}

// Reply login link
document.getElementById('reply-login-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    // Trigger the login modal from auth.js
    document.getElementById('login-btn')?.click();
});

// Replies list event delegation for reply and delete buttons
if (repliesList) {
    repliesList.addEventListener('click', (e) => {
        // Handle reply button
        const replyBtn = e.target.closest('.reply-to-btn');
        if (replyBtn) {
            const replyId = parseInt(replyBtn.dataset.replyId, 10);
            const author = replyBtn.dataset.author;
            setReplyTo(replyId, author);
            return;
        }

        // Handle delete button
        const deleteBtn = e.target.closest('.delete-reply-btn');
        if (deleteBtn) {
            const replyId = parseInt(deleteBtn.dataset.replyId, 10);
            deleteReplyItem(replyId);
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadThread();
    initReplySection();

    // Community tag clicks - redirect to community detail page (with stage/type if present)
    document.getElementById('thread-communities')?.addEventListener('click', (e) => {
        const tag = e.target.closest('.community-tag[data-href]');
        if (tag) {
            window.location.href = tag.dataset.href;
        }
    });
});
