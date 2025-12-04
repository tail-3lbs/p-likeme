/**
 * Guru Question Detail Page JavaScript
 * Handles loading and displaying a single question with replies
 */

(function() {

// API Base
const API_BASE = '/api/gurus';

// Current data
let currentQuestion = null;
let guruUsername = null;

// DOM Elements (initialized after DOMContentLoaded)
let questionLoading, questionContent, questionError, questionActionsBar;
let replyFormContainer, replyLoginHint, replyForm, replyContentInput;
let replyErrorEl, repliesList, repliesCount, noReplies;
let parentReplyIdInput, replyingToHint, replyingToUsername, cancelReplyBtn;

/**
 * Get question ID from URL
 */
function getQuestionIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

/**
 * Load question data
 */
async function loadQuestion() {
    const questionId = getQuestionIdFromUrl();

    if (!questionId) {
        showError('无效的问题链接');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/questions/${questionId}`);
        const data = await response.json();

        if (data.success) {
            currentQuestion = data.data;
            guruUsername = data.data.guru_username;
            renderQuestion(data.data);
        } else {
            showError(data.error || '问题不存在');
        }
    } catch (error) {
        console.error('Error loading question:', error);
        showError('加载失败，请稍后再试');
    }
}

/**
 * Render question content
 */
function renderQuestion(question) {
    // Update page title
    document.title = `${question.title} - 问答 - 像我一样`;

    // Back link
    document.getElementById('back-to-guru').href = `guru-detail.html?user=${encodeURIComponent(question.guru_username)}`;

    // Populate content
    document.getElementById('question-title').textContent = question.title;

    const askerEl = document.getElementById('question-asker');
    askerEl.textContent = question.asker_username;
    askerEl.href = `profile.html?user=${encodeURIComponent(question.asker_username)}`;

    const guruEl = document.getElementById('question-guru');
    guruEl.textContent = question.guru_username;
    guruEl.href = `guru-detail.html?user=${encodeURIComponent(question.guru_username)}`;

    document.getElementById('question-date').textContent = formatDate(question.created_at);

    // Render body with line breaks
    const bodyEl = document.getElementById('question-body');
    bodyEl.innerHTML = question.content.split('\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');

    // Show delete button if user is asker or guru
    const currentUser = getUser();
    if (currentUser && (currentUser.id === question.asker_user_id || currentUser.username === question.guru_username)) {
        questionActionsBar.style.display = 'flex';
    }

    // Show content, hide loading
    questionLoading.style.display = 'none';
    questionContent.style.display = 'block';

    // Render replies
    renderReplies(question.replies || []);
}

/**
 * Show error message
 */
function showError(message) {
    document.getElementById('error-message').textContent = message;
    questionLoading.style.display = 'none';
    questionError.style.display = 'block';
}

/**
 * Format date string - uses shared CST formatting from main.js
 */
function formatDate(dateStr) {
    return formatCSTDateFull(dateStr);
}

/**
 * Initialize reply section based on login status
 */
function initReplySection() {
    const currentUser = getUser();
    if (currentUser) {
        replyFormContainer.style.display = 'block';
        replyLoginHint.style.display = 'none';
    } else {
        replyFormContainer.style.display = 'none';
        replyLoginHint.style.display = 'block';
    }
}

/**
 * Render replies list - grouped into cards
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
 * Render a single reply item
 */
function renderSingleReply(reply, parentReplyId, replyMap) {
    const currentUser = getUser();
    const isOwner = currentUser && reply.user_id === currentUser.id;
    const isGuru = reply.username === guruUsername;

    // Get @mention if this is a reply to another reply
    let mentionHtml = '';
    if (parentReplyId && replyMap[parentReplyId]) {
        const parentAuthor = replyMap[parentReplyId].username;
        mentionHtml = `<span class="reply-mention">回复 <a href="profile.html?user=${encodeURIComponent(parentAuthor)}" class="username-link">@${escapeHtml(parentAuthor)}</a>:</span> `;
    }

    return `
        <div class="reply-item ${parentReplyId ? 'reply-stacked' : ''}" data-reply-id="${reply.id}">
            <div class="reply-header">
                <span class="reply-author ${isGuru ? 'is-thread-author' : ''}">
                    <a href="profile.html?user=${encodeURIComponent(reply.username)}" class="username-link">${escapeHtml(reply.username)}</a>
                    ${isGuru ? '<span class="author-badge">版主</span>' : ''}
                </span>
                <span class="reply-date">${formatDate(reply.created_at)}</span>
            </div>
            <div class="reply-body">
                <p>${mentionHtml}${escapeHtml(reply.content)}</p>
            </div>
            <div class="reply-actions">
                ${currentUser ? `<button class="reply-action-btn reply-to-btn" data-reply-id="${reply.id}" data-author="${escapeHtml(reply.username)}">回复</button>` : ''}
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

    const content = replyContentInput.value.trim();
    if (!content) {
        replyErrorEl.textContent = '回复内容不能为空';
        return;
    }

    try {
        const body = { content };
        const parentId = parentReplyIdInput.value;
        if (parentId) {
            body.parent_reply_id = parseInt(parentId, 10);
        }

        const response = await fetch(`${API_BASE}/questions/${currentQuestion.id}/replies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            replyContentInput.value = '';
            replyErrorEl.textContent = '';
            cancelReplyTo();
            // Reload question to get updated replies
            loadQuestion();
        } else {
            replyErrorEl.textContent = data.error || '回复失败';
        }
    } catch (error) {
        console.error('Error submitting reply:', error);
        replyErrorEl.textContent = '网络错误，请稍后再试';
    }
}

/**
 * Set which reply we're responding to
 */
function setReplyTo(replyId, author) {
    parentReplyIdInput.value = replyId;
    replyingToUsername.textContent = `@${author}`;
    replyingToHint.style.display = 'flex';
    replyContentInput.placeholder = `回复 @${author}...`;
    replyContentInput.focus();
}

/**
 * Cancel replying to a specific reply
 */
function cancelReplyTo() {
    parentReplyIdInput.value = '';
    replyingToHint.style.display = 'none';
    replyContentInput.placeholder = '写下你的回复...';
}

/**
 * Delete a reply
 */
async function deleteReplyItem(replyId) {
    if (!confirm('确定要删除这条回复吗？')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/questions/replies/${replyId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            loadQuestion();
        } else {
            alert(data.error || '删除失败');
        }
    } catch (error) {
        console.error('Error deleting reply:', error);
        alert('网络错误，请稍后再试');
    }
}

/**
 * Delete the question
 */
async function deleteQuestion() {
    if (!confirm('确定要删除这个问题吗？所有回复也将被删除。')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/questions/${currentQuestion.id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            // Redirect to guru's page
            window.location.href = `guru-detail.html?user=${encodeURIComponent(guruUsername)}`;
        } else {
            alert(data.error || '删除失败');
        }
    } catch (error) {
        console.error('Error deleting question:', error);
        alert('网络错误，请稍后再试');
    }
}

/**
 * Set up event listeners (called after DOM is ready)
 */
function setupEventListeners() {
    // Delete question button
    document.getElementById('delete-question-btn')?.addEventListener('click', deleteQuestion);

    // Reply form submit
    if (replyForm) {
        replyForm.addEventListener('submit', submitReply);
    }

    // Cancel reply to
    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', cancelReplyTo);
    }

    // Reply login link
    document.getElementById('reply-login-link')?.addEventListener('click', (e) => {
        e.preventDefault();
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
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    questionLoading = document.getElementById('question-loading');
    questionContent = document.getElementById('question-content');
    questionError = document.getElementById('question-error');
    questionActionsBar = document.getElementById('question-actions-bar');
    replyFormContainer = document.getElementById('reply-form-container');
    replyLoginHint = document.getElementById('reply-login-hint');
    replyForm = document.getElementById('reply-form');
    replyContentInput = document.getElementById('reply-content');
    replyErrorEl = document.getElementById('reply-error');
    repliesList = document.getElementById('replies-list');
    repliesCount = document.getElementById('replies-count');
    noReplies = document.getElementById('no-replies');
    parentReplyIdInput = document.getElementById('parent-reply-id');
    replyingToHint = document.getElementById('replying-to-hint');
    replyingToUsername = document.getElementById('replying-to-username');
    cancelReplyBtn = document.getElementById('cancel-reply-btn');

    // Set up event listeners
    setupEventListeners();

    // Load question data
    loadQuestion();
    initReplySection();
});

})();
