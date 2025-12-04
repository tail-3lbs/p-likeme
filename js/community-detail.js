/**
 * Community Detail Page JavaScript
 * Handles displaying community info, sub-communities (matrix/list), and threads
 * Supports hierarchical communities: Level I (parent), Level II (stage or type), Level III (both)
 */

(function() {
    const API_BASE = '/api';
    let currentCommunityId = null;
    let currentStage = null;
    let currentType = null;
    let currentOffset = 0;
    const THREADS_PER_PAGE = 10;
    let hasMoreThreads = false;
    let isJoined = false;
    let communityData = null;
    let userSubCommunities = [];

// Get parameters from URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        id: params.get('id'),
        stage: params.get('stage'),
        type: params.get('type')
    };
}

// Determine current level
function getCurrentLevel() {
    if (currentStage && currentType) return 3;
    if (currentStage || currentType) return 2;
    return 1;
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

// Build URL for navigation
function buildCommunityUrl(id, stage = null, type = null) {
    let url = `community-detail.html?id=${id}`;
    if (stage) url += `&stage=${encodeURIComponent(stage)}`;
    if (type) url += `&type=${encodeURIComponent(type)}`;
    return url;
}

// Load community details
async function loadCommunity() {
    const params = getUrlParams();
    if (!params.id) {
        showError('未指定社区');
        return;
    }

    currentCommunityId = params.id;
    currentStage = params.stage;
    currentType = params.type;

    try {
        const response = await fetch(`${API_BASE}/communities/${currentCommunityId}?stage=${currentStage || ''}&type=${currentType || ''}`);
        const result = await response.json();

        if (!result.success) {
            showError(result.error || '社区不存在');
            return;
        }

        communityData = result.data;
        renderCommunity(communityData);
        await checkJoinStatus();
        await loadThreads();

    } catch (error) {
        console.error('Error loading community:', error);
        showError('加载社区失败');
    }
}

// Check if current user has joined this community/sub-community
async function checkJoinStatus() {
    if (!getUser()) {
        isJoined = false;
        userSubCommunities = [];
        updateJoinButton();
        return;
    }

    try {
        // Get user's memberships for this community
        const response = await fetch(`${API_BASE}/user/communities?community_id=${currentCommunityId}`, {
            credentials: 'include'
        });
        const result = await response.json();

        if (result.success) {
            const data = result.data;
            userSubCommunities = data.subCommunities || [];

            // Check if user is joined to current level
            const level = getCurrentLevel();
            if (level === 1) {
                isJoined = data.isLevelIMember;
            } else {
                // Check if user has this specific stage/type combination
                isJoined = userSubCommunities.some(sub => {
                    if (level === 3) {
                        return sub.stage === currentStage && sub.type === currentType;
                    } else if (currentStage) {
                        return sub.stage === currentStage && !sub.type;
                    } else {
                        return !sub.stage && sub.type === currentType;
                    }
                });
            }
            updateJoinButton();

            // Update matrix/list if visible
            if (communityData && communityData.dimensions && getCurrentLevel() === 1) {
                renderSubCommunities(communityData);
            }
        }
    } catch (error) {
        console.error('Error checking join status:', error);
    }
}

// Update join button state
function updateJoinButton() {
    const joinBtn = document.getElementById('join-btn');
    const level = getCurrentLevel();
    const levelText = level === 1 ? '社区' : '细分社区';

    if (isJoined) {
        joinBtn.textContent = '已加入';
        joinBtn.classList.remove('btn-primary');
        joinBtn.classList.add('btn-outline');
    } else {
        joinBtn.textContent = `加入${levelText}`;
        joinBtn.classList.remove('btn-outline');
        joinBtn.classList.add('btn-primary');
    }
}

// Render community info
function renderCommunity(community) {
    const level = getCurrentLevel();

    // Update level badge
    const levelBadge = document.getElementById('level-badge');
    levelBadge.className = `level-badge level-${level}`;
    levelBadge.textContent = level === 1 ? '一级社区' : (level === 2 ? '二级社区' : '三级社区');

    // Build title based on level
    let title = community.name;
    if (level === 2) {
        title = currentStage || currentType;
    } else if (level === 3) {
        title = `${currentStage} · ${currentType}`;
    }

    // Render breadcrumb for Level II/III
    const breadcrumb = document.getElementById('community-breadcrumb');
    if (level > 1) {
        let breadcrumbHtml = `<a href="${buildCommunityUrl(currentCommunityId)}">${community.name}</a>`;
        breadcrumbHtml += '<span class="separator">></span>';

        if (level === 3) {
            // Show both stage and type in breadcrumb
            breadcrumbHtml += `<span class="current">${currentStage} · ${currentType}</span>`;
        } else {
            breadcrumbHtml += `<span class="current">${currentStage || currentType}</span>`;
        }

        breadcrumb.innerHTML = breadcrumbHtml;
        breadcrumb.style.display = 'flex';
    } else {
        breadcrumb.style.display = 'none';
    }

    document.getElementById('community-name').textContent = title;
    document.getElementById('community-description').textContent = community.description;

    // Calculate member count based on level
    let memberCount = community.member_count;
    if (level > 1 && community.subCommunityMembers) {
        // Find the specific sub-community count
        const subCount = community.subCommunityMembers.find(sub => {
            if (level === 3) {
                return sub.stage === currentStage && sub.type === currentType;
            } else if (currentStage) {
                return sub.stage === currentStage && !sub.type;
            } else {
                return !sub.stage && sub.type === currentType;
            }
        });
        if (subCount) {
            memberCount = subCount.member_count;
        } else {
            memberCount = 0;
        }
    }
    document.getElementById('community-members').textContent = formatMemberCount(memberCount) + ' 成员';

    // Render keywords
    const keywordsContainer = document.getElementById('community-keywords');
    const keywords = community.keywords.split(' ').filter(k => k.trim());
    keywordsContainer.innerHTML = keywords.map(keyword =>
        `<span class="keyword-tag">${keyword}</span>`
    ).join('');

    // Update page title
    let pageTitle = community.name;
    if (level === 2) pageTitle += ` - ${currentStage || currentType}`;
    if (level === 3) pageTitle += ` - ${currentStage} · ${currentType}`;
    document.title = `${pageTitle} - 像我一样`;

    // Render sub-communities section (only for Level I with dimensions)
    if (level === 1 && community.dimensions) {
        renderSubCommunities(community);
    } else {
        document.getElementById('sub-communities-section').style.display = 'none';
    }

    // Show content, hide loading
    document.getElementById('community-loading').style.display = 'none';
    document.getElementById('community-content').style.display = 'block';
}

// Render sub-communities (matrix or list)
function renderSubCommunities(community) {
    const dims = community.dimensions;
    const subMembers = community.subCommunityMembers || [];
    const container = document.getElementById('sub-communities-container');
    const section = document.getElementById('sub-communities-section');

    if (!dims) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    const hasStage = dims.stage && dims.stage.values && dims.stage.values.length > 0;
    const hasType = dims.type && dims.type.values && dims.type.values.length > 0;

    if (hasStage && hasType) {
        // 2D Matrix
        renderMatrix(container, dims, subMembers);
    } else if (hasStage || hasType) {
        // 1D List
        const dimension = hasStage ? dims.stage : dims.type;
        const dimensionKey = hasStage ? 'stage' : 'type';
        renderList(container, dimension, dimensionKey, subMembers);
    }
}

// Render 2D matrix
function renderMatrix(container, dims, subMembers) {
    const stages = dims.stage.values;
    const types = dims.type.values;

    // Build member count lookup
    const countMap = {};
    subMembers.forEach(sub => {
        const key = `${sub.stage || ''}_${sub.type || ''}`;
        countMap[key] = sub.member_count;
    });

    // Check user's joined sub-communities
    const joinedSet = new Set();
    userSubCommunities.forEach(sub => {
        joinedSet.add(`${sub.stage || ''}_${sub.type || ''}`);
    });

    let html = '<div class="sub-community-matrix"><table>';

    // Header row
    html += '<tr>';
    html += `<th class="corner"><span class="dimension-label">${dims.stage.label} \\ ${dims.type.label}</span></th>`;
    types.forEach(type => {
        html += `<th class="header-cell" data-type="${escapeHtml(type)}">${escapeHtml(type)}</th>`;
    });
    html += '</tr>';

    // Data rows
    stages.forEach(stage => {
        html += '<tr>';
        html += `<th class="row-header header-cell" data-stage="${escapeHtml(stage)}">${escapeHtml(stage)}</th>`;
        types.forEach(type => {
            const key = `${stage}_${type}`;
            const count = countMap[key] || 0;
            const isEmpty = count === 0;
            const isJoinedCell = joinedSet.has(key);
            const cellClass = isEmpty ? 'matrix-cell empty' : (isJoinedCell ? 'matrix-cell joined' : 'matrix-cell');
            html += `<td class="${cellClass}" data-stage="${escapeHtml(stage)}" data-type="${escapeHtml(type)}">`;
            html += `<span class="count">${count}人</span>`;
            html += '</td>';
        });
        html += '</tr>';
    });

    html += '</table></div>';
    container.innerHTML = html;
}

// Render 1D list
function renderList(container, dimension, dimensionKey, subMembers) {
    // Build member count lookup
    const countMap = {};
    subMembers.forEach(sub => {
        const value = dimensionKey === 'stage' ? sub.stage : sub.type;
        if (value && !sub.stage !== !sub.type) { // Only count single-dimension entries
            countMap[value] = sub.member_count;
        }
    });

    // Check user's joined sub-communities
    const joinedSet = new Set();
    userSubCommunities.forEach(sub => {
        const value = dimensionKey === 'stage' ? sub.stage : sub.type;
        if (value) joinedSet.add(value);
    });

    let html = `<span class="dimension-label">${dimension.label}</span>`;
    html += '<div class="sub-community-list">';

    dimension.values.forEach(value => {
        const count = countMap[value] || 0;
        const isJoinedItem = joinedSet.has(value);
        const itemClass = isJoinedItem ? 'sub-community-item joined' : 'sub-community-item';
        html += `<div class="${itemClass}" data-${dimensionKey}="${escapeHtml(value)}">`;
        html += `<span class="name">${escapeHtml(value)}</span>`;
        html += `<span class="count">${count}人</span>`;
        html += '</div>';
    });

    html += '</div>';
    container.innerHTML = html;
}

// Load threads for this community
async function loadThreads(append = false) {
    if (!append) {
        currentOffset = 0;
    }

    try {
        let url = `${API_BASE}/communities/${currentCommunityId}/threads?limit=${THREADS_PER_PAGE}&offset=${currentOffset}`;
        if (currentStage) url += `&stage=${encodeURIComponent(currentStage)}`;
        if (currentType) url += `&type=${encodeURIComponent(currentType)}`;

        const response = await fetch(url);
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

    // Build community tags with sub-community info
    let communityTags = '';
    if (thread.communityDetails && thread.communityDetails.length > 0) {
        thread.communityDetails.forEach(detail => {
            const community = thread.communities.find(c => c.id === detail.community_id);
            const name = community ? community.name : '未知社区';
            let label = name;
            if (detail.stage || detail.type) {
                const subLabel = [detail.stage, detail.type].filter(Boolean).join(' · ');
                label += ` > ${subLabel}`;
            }
            const url = buildCommunityUrl(detail.community_id, detail.stage, detail.type);
            communityTags += `<span class="community-tag" data-href="${url}">${escapeHtml(label)}</span>`;
        });
    } else {
        thread.communities.forEach(c => {
            communityTags += `<span class="community-tag" data-community-id="${c.id}">${escapeHtml(c.name)}</span>`;
        });
    }

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
            <span class="thread-reply-count">${thread.reply_count || 0} 回复</span>
            <div class="thread-communities">
                ${communityTags}
            </div>
        </div>
    `;
    return div;
}

// escapeHtml is defined in main.js (available globally)

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
    if (!getUser()) {
        // Show login modal
        document.getElementById('auth-modal').classList.add('active');
        return;
    }

    const joinBtn = document.getElementById('join-btn');
    joinBtn.disabled = true;

    try {
        const level = getCurrentLevel();
        let endpoint, method, body;

        if (isJoined) {
            // Leave
            let leaveUrl = `${API_BASE}/communities/${currentCommunityId}/leave`;
            if (level > 1) {
                const params = new URLSearchParams();
                if (currentStage) params.append('stage', currentStage);
                if (currentType) params.append('type', currentType);
                leaveUrl += `?${params.toString()}`;
            }
            const response = await fetch(leaveUrl, {
                method: 'DELETE',
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                isJoined = false;
            }
        } else {
            // Join
            const bodyData = {};
            if (level > 1) {
                if (currentStage) bodyData.stage = currentStage;
                if (currentType) bodyData.type = currentType;
            }
            const response = await fetch(`${API_BASE}/communities/${currentCommunityId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(bodyData)
            });
            const result = await response.json();
            if (result.success) {
                isJoined = true;
            }
        }

        updateJoinButton();

        // Reload community to get updated member count
        const resp = await fetch(`${API_BASE}/communities/${currentCommunityId}?stage=${currentStage || ''}&type=${currentType || ''}`);
        const data = await resp.json();
        if (data.success) {
            communityData = data.data;
            // Update member count display
            let memberCount = communityData.member_count;
            if (level > 1 && communityData.subCommunityMembers) {
                const subCount = communityData.subCommunityMembers.find(sub => {
                    if (level === 3) {
                        return sub.stage === currentStage && sub.type === currentType;
                    } else if (currentStage) {
                        return sub.stage === currentStage && !sub.type;
                    } else {
                        return !sub.stage && sub.type === currentType;
                    }
                });
                if (subCount) memberCount = subCount.member_count;
            }
            document.getElementById('community-members').textContent = formatMemberCount(memberCount) + ' 成员';

            // Refresh sub-communities display if on Level I
            if (level === 1) {
                await checkJoinStatus();
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

    // Thread card and community tag clicks
    document.getElementById('threads-list').addEventListener('click', (e) => {
        // Handle community tag click (with custom URL)
        const tagWithHref = e.target.closest('.community-tag[data-href]');
        if (tagWithHref) {
            window.location.href = tagWithHref.dataset.href;
            return;
        }

        // Handle community tag click (legacy)
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

    // Sub-communities section clicks (matrix cells, headers, list items)
    document.getElementById('sub-communities-container').addEventListener('click', (e) => {
        // Matrix cell click (Level III) - all cells are clickable including empty ones
        const cell = e.target.closest('.matrix-cell');
        if (cell) {
            const stage = cell.dataset.stage;
            const type = cell.dataset.type;
            window.location.href = buildCommunityUrl(currentCommunityId, stage, type);
            return;
        }

        // Matrix header click (Level II)
        const header = e.target.closest('.header-cell');
        if (header) {
            const stage = header.dataset.stage || null;
            const type = header.dataset.type || null;
            window.location.href = buildCommunityUrl(currentCommunityId, stage, type);
            return;
        }

        // List item click (Level II)
        const listItem = e.target.closest('.sub-community-item');
        if (listItem) {
            const stage = listItem.dataset.stage || null;
            const type = listItem.dataset.type || null;
            window.location.href = buildCommunityUrl(currentCommunityId, stage, type);
            return;
        }
    });
});

})();
