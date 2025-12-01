/**
 * Community Page - API Integration with Pagination
 * Fetches communities from backend API with "load more" support
 */

(function() {
    const API_BASE = '/api';
    const PAGE_SIZE = 6;
    const TOKEN_KEY = 'p_likeme_token';

    const searchInput = document.getElementById('community-search');
    const communitiesContainer = document.getElementById('communities');
    const noResults = document.getElementById('no-results');
    const loading = document.getElementById('loading');
    const loadMoreWrapper = document.getElementById('load-more-wrapper');
    const loadMoreBtn = document.getElementById('load-more-btn');

    let currentOffset = 0;
    let isSearching = false;
    let joinedCommunityIds = new Set();

    // Get auth token
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    // Check if logged in
    function isLoggedIn() {
        return !!getToken();
    }

    // Fetch user's joined communities
    async function fetchJoinedCommunities() {
        if (!isLoggedIn()) {
            joinedCommunityIds = new Set();
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/user/communities`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            const result = await response.json();
            if (result.success) {
                joinedCommunityIds = new Set(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch joined communities:', error);
        }
    }

    // Handle join/leave community
    async function handleJoinClick(communityId, button) {
        console.log('Join button clicked for community:', communityId);

        if (!isLoggedIn()) {
            console.log('User not logged in, opening login modal');
            // Open login modal
            if (typeof openModal === 'function') {
                openModal(true);
            } else {
                console.error('openModal function not available');
            }
            return;
        }

        const isJoined = joinedCommunityIds.has(communityId);
        const url = `${API_BASE}/communities/${communityId}/${isJoined ? 'leave' : 'join'}`;
        const method = isJoined ? 'DELETE' : 'POST';

        button.disabled = true;

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            const result = await response.json();

            if (result.success) {
                if (isJoined) {
                    joinedCommunityIds.delete(communityId);
                    button.textContent = '加入';
                    button.classList.remove('btn-joined');
                    button.classList.add('btn-primary');
                } else {
                    joinedCommunityIds.add(communityId);
                    button.textContent = '已加入';
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-joined');
                }
                // Update member count display
                updateMemberCount(communityId, isJoined ? -1 : 1);
            }
        } catch (error) {
            console.error('Failed to join/leave community:', error);
        } finally {
            button.disabled = false;
        }
    }

    // Update member count in the UI
    function updateMemberCount(communityId, delta) {
        const card = communitiesContainer.querySelector(`.community-card[data-id="${communityId}"]`);
        if (card) {
            const memberCountEl = card.querySelector('.member-count');
            if (memberCountEl) {
                const currentText = memberCountEl.textContent;
                const currentCount = parseInt(currentText.replace(/,/g, ''));
                const newCount = currentCount + delta;
                memberCountEl.textContent = `${formatNumber(newCount)} 位成员`;
            }
        }
    }

    // Debounce function for search
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Format member count with commas
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // Render a single community card
    function renderCommunityCard(community) {
        const isJoined = joinedCommunityIds.has(community.id);
        const buttonClass = isJoined ? 'btn btn-joined' : 'btn btn-primary';
        const buttonText = isJoined ? '已加入' : '加入';

        return `
            <div class="community-card" data-id="${community.id}">
                <div class="community-info">
                    <h3>${community.name}</h3>
                    <p>${community.description}</p>
                    <span class="member-count">${formatNumber(community.member_count)} 位成员</span>
                </div>
                <button class="${buttonClass}" data-community-id="${community.id}">${buttonText}</button>
            </div>
        `;
    }

    // Render communities (replace or append)
    function renderCommunities(communities, append = false) {
        if (loading) loading.style.display = 'none';

        if (communities.length === 0 && !append) {
            communitiesContainer.innerHTML = '';
            noResults.style.display = 'block';
            loadMoreWrapper.style.display = 'none';
        } else {
            noResults.style.display = 'none';
            const html = communities.map(renderCommunityCard).join('');

            if (append) {
                communitiesContainer.insertAdjacentHTML('beforeend', html);
            } else {
                communitiesContainer.innerHTML = html;
            }
        }
    }

    // Update load more button visibility
    function updateLoadMoreButton(hasMore) {
        if (loadMoreWrapper) {
            loadMoreWrapper.style.display = hasMore && !isSearching ? 'block' : 'none';
        }
    }

    // Fetch communities from API
    async function fetchCommunities(query = '', append = false) {
        try {
            if (!append) {
                if (loading) loading.style.display = 'block';
                currentOffset = 0;
            }
            noResults.style.display = 'none';

            let url;
            if (query) {
                // Search mode - no pagination
                url = `${API_BASE}/communities?q=${encodeURIComponent(query)}`;
                isSearching = true;
            } else {
                // Pagination mode
                url = `${API_BASE}/communities?limit=${PAGE_SIZE}&offset=${currentOffset}`;
                isSearching = false;
            }

            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                renderCommunities(result.data, append);
                updateLoadMoreButton(result.hasMore);

                // Update offset for next load
                currentOffset += result.data.length;
            } else {
                console.error('API error:', result.error);
                renderCommunities([], append);
            }
        } catch (error) {
            console.error('Failed to fetch communities:', error);
            if (loading) loading.style.display = 'none';
            if (!append) {
                communitiesContainer.innerHTML = `
                    <div class="error-message">
                        <p>加载失败，请确保服务器正在运行。</p>
                        <p style="font-size: 0.9rem; color: #999;">运行命令: cd server && npm start</p>
                    </div>
                `;
            }
        }
    }

    // Load more handler
    function loadMore() {
        fetchCommunities('', true);
    }

    // Search handler with debounce
    const handleSearch = debounce((query) => {
        fetchCommunities(query, false);
    }, 300);

    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            handleSearch(query);
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMore);
    }

    // Event delegation for join buttons
    if (communitiesContainer) {
        communitiesContainer.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-community-id]');
            if (button) {
                const communityId = parseInt(button.dataset.communityId);
                handleJoinClick(communityId, button);
            }
        });
    }

    // Initial load - first fetch joined communities, then fetch all communities
    async function init() {
        await fetchJoinedCommunities();
        fetchCommunities();
    }

    init();
})();
