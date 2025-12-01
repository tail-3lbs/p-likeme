/**
 * Community Detail Page JavaScript
 * Handles displaying community info and threads
 */

(function() {
    const API_BASE = '/api';
    let currentCommunityId = null;
    let currentOffset = 0;
    const THREADS_PER_PAGE = 10;
    let hasMoreThreads = false;
    let isJoined = false;

// Get community ID from URL
function getCommunityIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
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
        return date.toLocaleDateString('zh-CN');
    }
}

// Format member count
function formatMemberCount(count) {
    if (count >= 10000) {
        return (count / 10000).toFixed(1) + '万';
    }
    return count.toString();
}

// Load community details
async function loadCommunity() {
    const communityId = getCommunityIdFromUrl();
    if (!communityId) {
        showError('未指定社区');
        return;
    }

    currentCommunityId = communityId;

    try {
        const response = await fetch(`${API_BASE}/communities/${communityId}`);
        const result = await response.json();

        if (!result.success) {
            showError(result.error || '社区不存在');
            return;
        }

        renderCommunity(result.data);
        await checkJoinStatus();
        await loadThreads();

    } catch (error) {
        console.error('Error loading community:', error);
        showError('加载社区失败');
    }
}

// Check if current user has joined this community
async function checkJoinStatus() {
    const token = localStorage.getItem('p_likeme_token');
    if (!token) {
        isJoined = false;
        updateJoinButton();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/user/communities`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();

        if (result.success) {
            isJoined = result.data.includes(parseInt(currentCommunityId));
            updateJoinButton();
        }
    } catch (error) {
        console.error('Error checking join status:', error);
    }
}

// Update join button state
function updateJoinButton() {
    const joinBtn = document.getElementById('join-btn');
    if (isJoined) {
        joinBtn.textContent = '已加入';
        joinBtn.classList.remove('btn-primary');
        joinBtn.classList.add('btn-outline');
    } else {
        joinBtn.textContent = '加入社区';
        joinBtn.classList.remove('btn-outline');
        joinBtn.classList.add('btn-primary');
    }
}

// Render community info
function renderCommunity(community) {
    document.getElementById('community-name').textContent = community.name;
    document.getElementById('community-description').textContent = community.description;
    document.getElementById('community-members').textContent = formatMemberCount(community.member_count) + ' 成员';

    // Render keywords
    const keywordsContainer = document.getElementById('community-keywords');
    const keywords = community.keywords.split(' ').filter(k => k.trim());
    keywordsContainer.innerHTML = keywords.map(keyword =>
        `<span class="keyword-tag">${keyword}</span>`
    ).join('');

    // Update page title
    document.title = `${community.name} - 像我一样`;

    // Show content, hide loading
    document.getElementById('community-loading').style.display = 'none';
    document.getElementById('community-content').style.display = 'block';
}

// Load threads for this community
async function loadThreads(append = false) {
    if (!append) {
        currentOffset = 0;
    }

    try {
        const response = await fetch(
            `${API_BASE}/communities/${currentCommunityId}/threads?limit=${THREADS_PER_PAGE}&offset=${currentOffset}`
        );
        const result = await response.json();

        if (!result.success) {
            console.error('Error loading threads:', result.error);
            return;
        }

        renderThreads(result.data, append);
        hasMoreThreads = result.hasMore;
        updateLoadMoreButton();

    } catch (error) {
        console.error('Error loading threads:', error);
    }
}

// Render threads list
function renderThreads(threads, append = false) {
    const container = document.getElementById('threads-list');
    const noThreads = document.getElementById('no-threads');

    if (!append) {
        container.innerHTML = '';
    }

    if (threads.length === 0 && !append) {
        noThreads.style.display = 'block';
        return;
    }

    noThreads.style.display = 'none';

    threads.forEach(thread => {
        const threadCard = createThreadCard(thread);
        container.appendChild(threadCard);
    });
}

// Create thread card element
function createThreadCard(thread) {
    const div = document.createElement('div');
    div.className = 'thread-card thread-card-clickable';
    div.dataset.href = `thread-detail.html?id=${thread.id}`;
    div.innerHTML = `
        <div class="thread-card-header">
            <h3 class="thread-title">${escapeHtml(thread.title)}</h3>
            <span class="thread-date">${formatDate(thread.created_at)}</span>
        </div>
        <div class="thread-card-body">
            <p>${escapeHtml(thread.content.substring(0, 150))}${thread.content.length > 150 ? '...' : ''}</p>
        </div>
        <div class="thread-card-footer">
            <span class="thread-author">作者：${escapeHtml(thread.author)}</span>
            <div class="thread-communities">
                ${thread.communities.map(c =>
                    `<span class="community-tag" data-community-id="${c.id}">${escapeHtml(c.name)}</span>`
                ).join('')}
            </div>
        </div>
    `;
    return div;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update load more button visibility
function updateLoadMoreButton() {
    const container = document.getElementById('load-more-container');
    container.style.display = hasMoreThreads ? 'block' : 'none';
}

// Handle load more click
function handleLoadMore() {
    currentOffset += THREADS_PER_PAGE;
    loadThreads(true);
}

// Handle join/leave click
async function handleJoinClick() {
    const token = localStorage.getItem('p_likeme_token');
    if (!token) {
        // Show login modal
        document.getElementById('auth-modal').classList.add('active');
        return;
    }

    const joinBtn = document.getElementById('join-btn');
    joinBtn.disabled = true;

    try {
        const endpoint = isJoined
            ? `${API_BASE}/communities/${currentCommunityId}/leave`
            : `${API_BASE}/communities/${currentCommunityId}/join`;
        const method = isJoined ? 'DELETE' : 'POST';

        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();

        if (result.success) {
            isJoined = !isJoined;
            updateJoinButton();
            // Update member count display
            const memberCountEl = document.getElementById('community-members');
            const currentText = memberCountEl.textContent;
            const match = currentText.match(/[\d.]+/);
            if (match) {
                // Reload community to get accurate count
                const resp = await fetch(`${API_BASE}/communities/${currentCommunityId}`);
                const data = await resp.json();
                if (data.success) {
                    memberCountEl.textContent = formatMemberCount(data.data.member_count) + ' 成员';
                }
            }
        }
    } catch (error) {
        console.error('Error joining/leaving community:', error);
    } finally {
        joinBtn.disabled = false;
    }
}

// Show error state
function showError(message) {
    document.getElementById('community-loading').style.display = 'none';
    document.getElementById('community-content').style.display = 'none';
    document.getElementById('community-error').style.display = 'block';
    document.getElementById('error-message').textContent = message;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCommunity();

    // Load more button
    document.getElementById('load-more-btn').addEventListener('click', handleLoadMore);

    // Join button
    document.getElementById('join-btn').addEventListener('click', handleJoinClick);

    // Thread card clicks
    document.getElementById('threads-list').addEventListener('click', (e) => {
        // Handle community tag click
        const tag = e.target.closest('.community-tag[data-community-id]');
        if (tag) {
            window.location.href = `community-detail.html?id=${tag.dataset.communityId}`;
            return;
        }

        // Handle card click (navigate to thread page)
        const card = e.target.closest('.thread-card-clickable');
        if (card && card.dataset.href) {
            window.location.href = card.dataset.href;
        }
    });
});

})();
