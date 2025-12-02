/**
 * Discover Page JavaScript
 * Handles user search with filters
 */

// State
let communities = [];
let selectedCommunityIds = [];
let currentOffset = 0;
let currentTotal = 0;
const LIMIT = 20;

// DOM Elements
const searchForm = document.getElementById('search-form');
const communityTrigger = document.getElementById('community-trigger');
const communityDropdown = document.getElementById('community-dropdown');
const selectedCommunitiesEl = document.getElementById('selected-communities');
const resultsTitle = document.getElementById('results-title');
const searchHint = document.getElementById('search-hint');
const resultsLoading = document.getElementById('results-loading');
const noResults = document.getElementById('no-results');
const userCards = document.getElementById('user-cards');
const resultsPagination = document.getElementById('results-pagination');
const loadMoreBtn = document.getElementById('load-more-btn');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

/**
 * Initialize page
 */
async function initDiscover() {
    await loadCommunities();
    setupEventListeners();
}

/**
 * Load all communities for the filter
 */
async function loadCommunities() {
    try {
        const response = await fetch('/api/communities');
        const data = await response.json();

        if (data.success) {
            communities = data.data;
            renderCommunityDropdown();
        }
    } catch (error) {
        console.error('Error loading communities:', error);
    }
}

/**
 * Render community dropdown options
 */
function renderCommunityDropdown() {
    communityDropdown.innerHTML = communities.map(c => `
        <label class="dropdown-item">
            <input type="checkbox" value="${c.id}" data-name="${c.name}">
            <span>${c.name}</span>
        </label>
    `).join('');

    // Add change listeners
    communityDropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleCommunityChange);
    });
}

/**
 * Handle community checkbox change
 */
function handleCommunityChange(e) {
    const id = parseInt(e.target.value);
    const name = e.target.dataset.name;

    if (e.target.checked) {
        if (!selectedCommunityIds.includes(id)) {
            selectedCommunityIds.push(id);
        }
    } else {
        selectedCommunityIds = selectedCommunityIds.filter(cid => cid !== id);
    }

    renderSelectedCommunities();
    updateTriggerText();
}

/**
 * Render selected community tags
 */
function renderSelectedCommunities() {
    if (selectedCommunityIds.length === 0) {
        selectedCommunitiesEl.innerHTML = '';
        return;
    }

    selectedCommunitiesEl.innerHTML = selectedCommunityIds.map(id => {
        const community = communities.find(c => c.id === id);
        return `
            <span class="selected-tag">
                ${community ? community.name : id}
                <button type="button" class="tag-remove-btn" data-id="${id}">&times;</button>
            </span>
        `;
    }).join('');

    // Add remove listeners
    selectedCommunitiesEl.querySelectorAll('.tag-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            selectedCommunityIds = selectedCommunityIds.filter(cid => cid !== id);

            // Uncheck in dropdown
            const checkbox = communityDropdown.querySelector(`input[value="${id}"]`);
            if (checkbox) checkbox.checked = false;

            renderSelectedCommunities();
            updateTriggerText();
        });
    });
}

/**
 * Update trigger text
 */
function updateTriggerText() {
    const span = communityTrigger.querySelector('span');
    if (selectedCommunityIds.length === 0) {
        span.textContent = '选择社区...';
    } else {
        span.textContent = `已选择 ${selectedCommunityIds.length} 个社区`;
    }
}

/**
 * Toggle dropdown
 */
function toggleDropdown() {
    communityDropdown.classList.toggle('active');
}

/**
 * Close dropdown when clicking outside
 */
function handleClickOutside(e) {
    if (!communityTrigger.contains(e.target) && !communityDropdown.contains(e.target)) {
        communityDropdown.classList.remove('active');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Community dropdown toggle
    communityTrigger.addEventListener('click', toggleDropdown);
    document.addEventListener('click', handleClickOutside);

    // Search form submit
    searchForm.addEventListener('submit', handleSearch);

    // Clear filters
    clearFiltersBtn.addEventListener('click', clearFilters);

    // Load more
    loadMoreBtn.addEventListener('click', loadMore);
}

/**
 * Handle search form submit
 */
async function handleSearch(e) {
    e.preventDefault();
    currentOffset = 0;
    await performSearch();
}

/**
 * Perform search with current filters
 */
async function performSearch(append = false) {
    // Get filter values
    const diseaseTag = document.getElementById('filter-disease').value.trim();
    const gender = document.getElementById('filter-gender').value;
    const ageMin = document.getElementById('filter-age-min').value;
    const ageMax = document.getElementById('filter-age-max').value;
    const location = document.getElementById('filter-location').value.trim();
    const hospital = document.getElementById('filter-hospital').value.trim();

    // Check if any filter is set
    if (selectedCommunityIds.length === 0 && !diseaseTag && !gender && !ageMin && !ageMax && !location && !hospital) {
        showSearchHint();
        resultsTitle.textContent = '请选择筛选条件开始搜索';
        return;
    }

    // Show loading
    if (!append) {
        showLoading();
    }

    // Build query params
    const params = new URLSearchParams();
    if (selectedCommunityIds.length > 0) {
        params.set('communities', selectedCommunityIds.join(','));
    }
    if (diseaseTag) params.set('disease_tag', diseaseTag);
    if (gender) params.set('gender', gender);
    if (ageMin) params.set('age_min', ageMin);
    if (ageMax) params.set('age_max', ageMax);
    if (location) params.set('location', location);
    if (hospital) params.set('hospital', hospital);
    params.set('limit', LIMIT);
    params.set('offset', currentOffset);

    try {
        const response = await fetch(`/api/auth/users/search?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            currentTotal = data.data.total;

            if (append) {
                appendResults(data.data.users);
            } else {
                renderResults(data.data.users, data.data.total);
            }
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('Search error:', error);
        showNoResults();
    }
}

/**
 * Show search hint
 */
function showSearchHint() {
    searchHint.style.display = 'flex';
    resultsLoading.style.display = 'none';
    noResults.style.display = 'none';
    userCards.innerHTML = '';
    resultsPagination.style.display = 'none';
}

/**
 * Show loading state
 */
function showLoading() {
    searchHint.style.display = 'none';
    resultsLoading.style.display = 'block';
    noResults.style.display = 'none';
    userCards.innerHTML = '';
    resultsPagination.style.display = 'none';
}

/**
 * Show no results
 */
function showNoResults() {
    searchHint.style.display = 'none';
    resultsLoading.style.display = 'none';
    noResults.style.display = 'block';
    userCards.innerHTML = '';
    resultsPagination.style.display = 'none';
    resultsTitle.textContent = '搜索结果';
}

/**
 * Render search results
 */
function renderResults(users, total) {
    searchHint.style.display = 'none';
    resultsLoading.style.display = 'none';
    noResults.style.display = 'none';

    resultsTitle.textContent = `找到 ${total} 位病友`;

    if (users.length === 0) {
        showNoResults();
        return;
    }

    userCards.innerHTML = users.map(user => createUserCard(user)).join('');

    // Show/hide load more
    if (currentOffset + users.length < total) {
        resultsPagination.style.display = 'block';
    } else {
        resultsPagination.style.display = 'none';
    }
}

/**
 * Append more results
 */
function appendResults(users) {
    userCards.innerHTML += users.map(user => createUserCard(user)).join('');

    // Show/hide load more
    if (currentOffset + users.length < currentTotal) {
        resultsPagination.style.display = 'block';
    } else {
        resultsPagination.style.display = 'none';
    }
}

/**
 * Create user card HTML
 */
function createUserCard(user) {
    const letter = user.username.charAt(0).toUpperCase();

    // Format info items
    const infoItems = [];
    if (user.gender) infoItems.push(user.gender);
    if (user.age) infoItems.push(`${user.age}岁`);
    if (user.location_living) infoItems.push(`现居: ${user.location_living}`);
    else if (user.location_from) infoItems.push(`来自: ${user.location_from}`);

    // Communities
    const communitiesHtml = user.communities && user.communities.length > 0
        ? user.communities.map(c => `<span class="user-card-tag community-tag">${c.name}</span>`).join('')
        : '';

    // Disease tags
    const diseaseTagsHtml = user.disease_tags && user.disease_tags.length > 0
        ? user.disease_tags.slice(0, 3).map(t => `<span class="user-card-tag disease-tag">${t}</span>`).join('')
        : '';

    // Hospitals
    const hospitalsHtml = user.hospitals && user.hospitals.length > 0
        ? user.hospitals.slice(0, 2).map(h => `<span class="user-card-tag hospital-tag">${h}</span>`).join('')
        : '';

    return `
        <a href="profile.html?user=${encodeURIComponent(user.username)}" class="user-card">
            <div class="user-card-avatar">
                <span>${letter}</span>
            </div>
            <div class="user-card-content">
                <div class="user-card-header">
                    <h4>${user.username}</h4>
                    ${infoItems.length > 0 ? `<span class="user-card-info">${infoItems.join(' | ')}</span>` : ''}
                </div>
                <div class="user-card-tags">
                    ${communitiesHtml}
                    ${diseaseTagsHtml}
                    ${hospitalsHtml}
                </div>
            </div>
            <div class="user-card-arrow">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </div>
        </a>
    `;
}

/**
 * Load more results
 */
async function loadMore() {
    currentOffset += LIMIT;
    await performSearch(true);
}

/**
 * Clear all filters
 */
function clearFilters() {
    // Clear community selection
    selectedCommunityIds = [];
    communityDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    renderSelectedCommunities();
    updateTriggerText();

    // Clear other inputs
    document.getElementById('filter-disease').value = '';
    document.getElementById('filter-gender').value = '';
    document.getElementById('filter-age-min').value = '';
    document.getElementById('filter-age-max').value = '';
    document.getElementById('filter-location').value = '';
    document.getElementById('filter-hospital').value = '';

    // Reset results
    currentOffset = 0;
    showSearchHint();
    resultsTitle.textContent = '请选择筛选条件开始搜索';
}

// Initialize
document.addEventListener('DOMContentLoaded', initDiscover);
