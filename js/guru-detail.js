/**
 * Guru Detail Page JavaScript
 * Handles guru profile, threads, and Q&A functionality
 */

(function() {
    const API_BASE = '/api';

    // Get username from URL
    const urlParams = new URLSearchParams(window.location.search);
    const guruUsername = urlParams.get('user');

    // State
    let guruData = null;
    let isOwnGuruPage = false;
    let currentQuestionId = null;

    // DOM Elements
    const guruLoading = document.getElementById('guru-loading');
    const guruNotFound = document.getElementById('guru-not-found');
    const guruContent = document.getElementById('guru-content');

    /**
     * Initialize page
     */
    async function init() {
        if (!guruUsername) {
            showNotFound();
            return;
        }

        // Check if viewing own guru page
        const currentUser = getUser();
        isOwnGuruPage = currentUser && currentUser.username === guruUsername;

        await loadGuru();
    }

    /**
     * Load guru data from API
     */
    async function loadGuru() {
        try {
            const response = await fetch(`${API_BASE}/gurus/${encodeURIComponent(guruUsername)}`);
            const result = await response.json();

            if (!result.success) {
                showNotFound();
                return;
            }

            guruData = result.data;
            renderGuruPage();
            showContent();

            // Load questions
            await loadQuestions();

        } catch (error) {
            console.error('Error loading guru:', error);
            showNotFound();
        }
    }

    /**
     * Show loading state
     */
    function showLoading() {
        guruLoading.style.display = 'block';
        guruNotFound.style.display = 'none';
        guruContent.style.display = 'none';
    }

    /**
     * Show not found state
     */
    function showNotFound() {
        guruLoading.style.display = 'none';
        guruNotFound.style.display = 'block';
        guruContent.style.display = 'none';
    }

    /**
     * Show content
     */
    function showContent() {
        guruLoading.style.display = 'none';
        guruNotFound.style.display = 'none';
        guruContent.style.display = 'block';
    }

    /**
     * Render guru page
     */
    function renderGuruPage() {
        if (!guruData) return;

        // Update page title
        document.title = `${guruData.username} - 明星 - 像我一样`;

        // Avatar
        document.getElementById('guru-avatar').textContent = guruData.username.charAt(0).toUpperCase();

        // Username
        document.getElementById('guru-username').textContent = guruData.username;

        // Join date
        const joinDate = new Date(guruData.created_at);
        document.getElementById('guru-join-date').textContent = `加入于 ${joinDate.toLocaleDateString('zh-CN')}`;

        // Communities
        renderCommunities();

        // View profile link
        document.getElementById('view-profile-btn').href = `profile.html?user=${encodeURIComponent(guruData.username)}`;

        // Show edit button if own page
        if (isOwnGuruPage) {
            document.getElementById('edit-intro-btn').style.display = 'inline-block';
        }

        // Intro
        renderIntro();

        // Threads
        renderThreads();
    }

    /**
     * Render intro section
     */
    function renderIntro() {
        const introEl = document.getElementById('guru-intro');
        if (guruData.guru_intro) {
            // Convert newlines to paragraphs
            const paragraphs = guruData.guru_intro.split('\n\n').filter(p => p.trim());
            introEl.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
        } else {
            introEl.innerHTML = '<p class="empty-hint">暂无简介</p>';
        }
    }

    /**
     * Render communities section
     */
    function renderCommunities() {
        const communitiesEl = document.getElementById('guru-communities');
        const communities = guruData.communities || [];

        if (communities.length === 0) {
            communitiesEl.innerHTML = '';
            return;
        }

        communitiesEl.innerHTML = communities.map(c => {
            // Build URL with stage/type parameters
            let href = `community-detail.html?id=${c.id}`;
            if (c.stage) href += `&stage=${encodeURIComponent(c.stage)}`;
            if (c.type) href += `&type=${encodeURIComponent(c.type)}`;

            // Use displayPath if available, otherwise just the name
            const displayText = c.displayPath || c.name;
            return `<a href="${href}" class="community-tag-link">${escapeHtml(displayText)}</a>`;
        }).join('');
    }

    /**
     * Render threads section
     */
    function renderThreads() {
        const threadsEl = document.getElementById('guru-threads');
        const threads = guruData.threads || [];

        if (threads.length === 0) {
            threadsEl.innerHTML = '<p class="empty-hint">暂无分享</p>';
            return;
        }

        threadsEl.innerHTML = threads.map(thread => `
            <div class="thread-card">
                <a href="thread-detail.html?id=${thread.id}" class="thread-link">
                    <h3 class="thread-title">${escapeHtml(thread.title)}</h3>
                    <p class="thread-preview">${escapeHtml(truncateText(thread.content, 150))}</p>
                    <div class="thread-meta">
                        <span>${formatDate(thread.created_at)}</span>
                        <span>${thread.reply_count || 0} 回复</span>
                    </div>
                </a>
            </div>
        `).join('');
    }

    /**
     * Load questions from API
     */
    async function loadQuestions() {
        try {
            const response = await fetch(`${API_BASE}/gurus/${encodeURIComponent(guruUsername)}/questions`);
            const result = await response.json();

            if (result.success) {
                renderQuestions(result.data);
            }
        } catch (error) {
            console.error('Error loading questions:', error);
        }
    }

    /**
     * Render questions list
     */
    function renderQuestions(questions) {
        const questionsEl = document.getElementById('questions-list');

        if (!questions || questions.length === 0) {
            questionsEl.innerHTML = '<p class="empty-hint">暂无问题，来提第一个问题吧！</p>';
            return;
        }

        questionsEl.innerHTML = questions.map(q => `
            <a href="guru-question.html?id=${q.id}" class="question-card-link">
                <div class="question-card">
                    <h3 class="question-title">${escapeHtml(q.title)}</h3>
                    <p class="question-preview">${escapeHtml(truncateText(q.content, 100))}</p>
                    <div class="question-meta">
                        <span class="question-asker"><a href="profile.html?user=${encodeURIComponent(q.asker_username)}" class="asker-link">${escapeHtml(q.asker_username)}</a> 提问</span>
                        <span>${formatDate(q.created_at)}</span>
                        <span>${q.reply_count || 0} 回复</span>
                    </div>
                </div>
            </a>
        `).join('');
    }

    /**
     * Open question detail modal
     */
    async function openQuestionModal(questionId) {
        currentQuestionId = questionId;

        try {
            const response = await fetch(`${API_BASE}/gurus/questions/${questionId}`);
            const result = await response.json();

            if (!result.success) {
                alert('加载问题失败');
                return;
            }

            const question = result.data;
            renderQuestionModal(question);
            document.getElementById('question-modal').style.display = 'flex';

        } catch (error) {
            console.error('Error loading question:', error);
            alert('加载问题失败');
        }
    }

    /**
     * Render question modal content
     */
    function renderQuestionModal(question) {
        const currentUser = getUser();
        const canDelete = currentUser && (currentUser.id === question.asker_user_id || currentUser.username === guruUsername);
        const canReply = !!currentUser;

        const detailEl = document.getElementById('question-detail');
        detailEl.innerHTML = `
            <div class="question-full">
                <div class="question-header">
                    <h2>${escapeHtml(question.title)}</h2>
                    ${canDelete ? `<button class="btn btn-danger btn-small" id="delete-question-btn">删除问题</button>` : ''}
                </div>
                <div class="question-author">
                    <a href="profile.html?user=${encodeURIComponent(question.asker_username)}">${escapeHtml(question.asker_username)}</a>
                    <span>提问于 ${formatDate(question.created_at)}</span>
                </div>
                <div class="question-content">
                    ${question.content.split('\n').map(p => `<p>${escapeHtml(p)}</p>`).join('')}
                </div>
            </div>

            <div class="replies-section">
                <h3>回复 (${question.replies ? question.replies.length : 0})</h3>

                ${canReply ? `
                <div class="reply-form">
                    <textarea id="reply-content" placeholder="写下你的回复..." rows="3"></textarea>
                    <input type="hidden" id="reply-parent-id" value="">
                    <div class="reply-to-hint" id="reply-to-hint" style="display: none;">
                        回复 <span id="reply-to-username"></span>
                        <button type="button" class="cancel-reply-to" id="cancel-reply-to">&times;</button>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-primary" id="submit-reply-btn">发表回复</button>
                    </div>
                    <div class="form-error" id="reply-error"></div>
                </div>
                ` : '<p class="login-hint">登录后可以回复</p>'}

                <div class="replies-list" id="replies-list">
                    ${renderReplies(question.replies || [], currentUser)}
                </div>
            </div>
        `;

        // Bind event handlers
        if (canDelete) {
            document.getElementById('delete-question-btn').addEventListener('click', () => deleteQuestion(question.id));
        }

        if (canReply) {
            document.getElementById('submit-reply-btn').addEventListener('click', submitReply);
            document.getElementById('cancel-reply-to').addEventListener('click', cancelReplyTo);
        }

        // Bind reply-to handlers
        document.querySelectorAll('.reply-to-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const replyId = e.target.dataset.replyId;
                const username = e.target.dataset.username;
                setReplyTo(replyId, username);
            });
        });

        // Bind delete reply handlers
        document.querySelectorAll('.delete-reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const replyId = e.target.dataset.replyId;
                deleteReply(replyId);
            });
        });
    }

    /**
     * Render replies with nesting
     */
    function renderReplies(replies, currentUser) {
        if (!replies || replies.length === 0) {
            return '<p class="empty-hint">暂无回复</p>';
        }

        // Build reply tree
        const topLevel = [];
        const childMap = {};

        replies.forEach(reply => {
            if (!reply.parent_reply_id) {
                topLevel.push(reply);
            } else {
                if (!childMap[reply.parent_reply_id]) {
                    childMap[reply.parent_reply_id] = [];
                }
                childMap[reply.parent_reply_id].push(reply);
            }
        });

        function renderReplyItem(reply, depth = 0) {
            const isOwn = currentUser && currentUser.id === reply.user_id;
            const children = childMap[reply.id] || [];
            const isGuru = reply.username === guruUsername;

            return `
                <div class="reply-item ${depth > 0 ? 'reply-nested' : ''}" style="margin-left: ${depth * 20}px;">
                    <div class="reply-header">
                        <a href="profile.html?user=${encodeURIComponent(reply.username)}" class="reply-author ${isGuru ? 'is-guru' : ''}">
                            ${escapeHtml(reply.username)}${isGuru ? ' <span class="guru-badge">明星</span>' : ''}
                        </a>
                        <span class="reply-date">${formatDate(reply.created_at)}</span>
                    </div>
                    <div class="reply-content">
                        ${reply.content.split('\n').map(p => `<p>${escapeHtml(p)}</p>`).join('')}
                    </div>
                    <div class="reply-actions">
                        ${currentUser ? `<button class="reply-to-btn" data-reply-id="${reply.id}" data-username="${escapeHtml(reply.username)}">回复</button>` : ''}
                        ${isOwn ? `<button class="delete-reply-btn" data-reply-id="${reply.id}">删除</button>` : ''}
                    </div>
                    ${children.map(child => renderReplyItem(child, depth + 1)).join('')}
                </div>
            `;
        }

        return topLevel.map(reply => renderReplyItem(reply)).join('');
    }

    /**
     * Set reply-to
     */
    function setReplyTo(replyId, username) {
        document.getElementById('reply-parent-id').value = replyId;
        document.getElementById('reply-to-username').textContent = username;
        document.getElementById('reply-to-hint').style.display = 'block';
        document.getElementById('reply-content').focus();
    }

    /**
     * Cancel reply-to
     */
    function cancelReplyTo() {
        document.getElementById('reply-parent-id').value = '';
        document.getElementById('reply-to-hint').style.display = 'none';
    }

    /**
     * Submit reply
     */
    async function submitReply() {
        const content = document.getElementById('reply-content').value.trim();
        const parentId = document.getElementById('reply-parent-id').value;
        const errorEl = document.getElementById('reply-error');

        if (!content) {
            errorEl.textContent = '请输入回复内容';
            return;
        }

        try {
            const body = { content };
            if (parentId) {
                body.parent_reply_id = parseInt(parentId, 10);
            }

            const response = await fetch(`${API_BASE}/gurus/questions/${currentQuestionId}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.success) {
                // Reload question modal
                openQuestionModal(currentQuestionId);
                // Also reload questions list to update reply count
                loadQuestions();
            } else {
                errorEl.textContent = result.error || '发表回复失败';
            }
        } catch (error) {
            console.error('Error submitting reply:', error);
            errorEl.textContent = '网络错误，请稍后再试';
        }
    }

    /**
     * Delete question
     */
    async function deleteQuestion(questionId) {
        if (!confirm('确定要删除这个问题吗？所有回复也将被删除。')) return;

        try {
            const response = await fetch(`${API_BASE}/gurus/questions/${questionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                closeQuestionModal();
                loadQuestions();
            } else {
                alert(result.error || '删除失败');
            }
        } catch (error) {
            console.error('Error deleting question:', error);
            alert('网络错误，请稍后再试');
        }
    }

    /**
     * Delete reply
     */
    async function deleteReply(replyId) {
        if (!confirm('确定要删除这条回复吗？')) return;

        try {
            const response = await fetch(`${API_BASE}/gurus/questions/replies/${replyId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                openQuestionModal(currentQuestionId);
                loadQuestions();
            } else {
                alert(result.error || '删除失败');
            }
        } catch (error) {
            console.error('Error deleting reply:', error);
            alert('网络错误，请稍后再试');
        }
    }

    /**
     * Close question modal
     */
    function closeQuestionModal() {
        document.getElementById('question-modal').style.display = 'none';
        currentQuestionId = null;
    }

    /**
     * Truncate text
     */
    function truncateText(text, maxLength) {
        if (!text) return '';
        const singleLine = text.replace(/\n+/g, ' ');
        if (singleLine.length <= maxLength) return singleLine;
        return singleLine.substring(0, maxLength) + '...';
    }

    /**
     * Format date
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
    }

    // Event Listeners
    document.addEventListener('DOMContentLoaded', () => {
        init();
    });

    // Question modal close
    document.getElementById('question-modal-close')?.addEventListener('click', closeQuestionModal);
    document.getElementById('question-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'question-modal') {
            closeQuestionModal();
        }
    });

    // Edit intro button
    const editIntroBtn = document.getElementById('edit-intro-btn');
    if (editIntroBtn) {
        editIntroBtn.addEventListener('click', () => {
            document.getElementById('intro-textarea').value = guruData.guru_intro || '';
            document.getElementById('guru-intro').style.display = 'none';
            document.getElementById('edit-intro-form').style.display = 'block';
            editIntroBtn.style.display = 'none';
        });
    }

    // Cancel edit intro
    const cancelEditIntro = document.getElementById('cancel-edit-intro');
    if (cancelEditIntro) {
        cancelEditIntro.addEventListener('click', () => {
            document.getElementById('edit-intro-form').style.display = 'none';
            document.getElementById('guru-intro').style.display = 'block';
            document.getElementById('edit-intro-btn').style.display = 'inline-block';
            document.getElementById('intro-error').textContent = '';
        });
    }

    // Save intro
    const saveIntroBtn = document.getElementById('save-intro');
    if (saveIntroBtn) {
        saveIntroBtn.addEventListener('click', async () => {
            const intro = document.getElementById('intro-textarea').value;
            const errorEl = document.getElementById('intro-error');

            try {
                const response = await fetch(`${API_BASE}/gurus/intro`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ intro })
                });

                const result = await response.json();

                if (result.success) {
                    guruData.guru_intro = intro;
                    renderIntro();
                    document.getElementById('edit-intro-form').style.display = 'none';
                    document.getElementById('guru-intro').style.display = 'block';
                    document.getElementById('edit-intro-btn').style.display = 'inline-block';
                } else {
                    errorEl.textContent = result.error || '保存失败';
                }
            } catch (error) {
                console.error('Error saving intro:', error);
                errorEl.textContent = '网络错误，请稍后再试';
            }
        });
    }

    // Ask question button
    const askQuestionBtn = document.getElementById('ask-question-btn');
    if (askQuestionBtn) {
        askQuestionBtn.addEventListener('click', () => {
            const currentUser = getUser();
            if (!currentUser) {
                if (typeof openModal === 'function') {
                    openModal(true);
                }
                return;
            }

            document.getElementById('ask-form').style.display = 'block';
            askQuestionBtn.style.display = 'none';
        });
    }

    // Cancel ask
    const cancelAskBtn = document.getElementById('cancel-ask');
    if (cancelAskBtn) {
        cancelAskBtn.addEventListener('click', () => {
            document.getElementById('ask-form').style.display = 'none';
            document.getElementById('ask-question-btn').style.display = 'inline-block';
            document.getElementById('question-title').value = '';
            document.getElementById('question-content').value = '';
            document.getElementById('ask-error').textContent = '';
        });
    }

    // Submit question
    const submitQuestionBtn = document.getElementById('submit-question');
    if (submitQuestionBtn) {
        submitQuestionBtn.addEventListener('click', async () => {
            const title = document.getElementById('question-title').value.trim();
            const content = document.getElementById('question-content').value.trim();
            const errorEl = document.getElementById('ask-error');

            if (!title) {
                errorEl.textContent = '请输入问题标题';
                return;
            }

            if (!content) {
                errorEl.textContent = '请输入问题内容';
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/gurus/${encodeURIComponent(guruUsername)}/questions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ title, content })
                });

                const result = await response.json();

                if (result.success) {
                    document.getElementById('ask-form').style.display = 'none';
                    document.getElementById('ask-question-btn').style.display = 'inline-block';
                    document.getElementById('question-title').value = '';
                    document.getElementById('question-content').value = '';
                    errorEl.textContent = '';
                    loadQuestions();
                } else {
                    errorEl.textContent = result.error || '提交问题失败';
                }
            } catch (error) {
                console.error('Error submitting question:', error);
                errorEl.textContent = '网络错误，请稍后再试';
            }
        });
    }
})();
