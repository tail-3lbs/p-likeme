/**
 * Discover Page JavaScript
 * Handles user search with filters
 */

// State
let communities = [];
// Selected communities with optional stage/type: [{id, stage, type, name, dimensions}]
let selectedCommunities = [];
let currentOffset = 0;
let currentTotal = 0;
const LIMIT = 20;

// DOM Elements
const searchForm = document.getElementById('search-form');
const communityTrigger = document.getElementById('community-trigger');
const communityDropdown = document.getElementById('community-dropdown');
const selectedCommunitiesWrapper = document.getElementById('selected-communities-wrapper');
const resultsTitle = document.getElementById('results-title');
const searchHint = document.getElementById('search-hint');
const resultsLoading = document.getElementById('results-loading');
const noResults = document.getElementById('no-results');
const userCards = document.getElementById('user-cards');
const resultsPagination = document.getElementById('results-pagination');
const loadMoreBtn = document.getElementById('load-more-btn');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const autoFindBtn = document.getElementById('auto-find-btn');
const autoFindLoginHint = document.getElementById('auto-find-login-hint');
const autoFindLoginLink = document.getElementById('auto-find-login-link');

/**
 * Get current user from localStorage
 */
function getCurrentUser() {
    const userData = localStorage.getItem('p_likeme_user');
    return userData ? JSON.parse(userData) : null;
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
 * Initialize page
 */
async function initDiscover() {
    await loadCommunities();
    setupEventListeners();
    updateAutoFindState();
}

/**
 * Update auto-find button state based on login status
 */
function updateAutoFindState() {
    const user = getCurrentUser();
    if (user) {
        autoFindBtn.disabled = false;
        autoFindLoginHint.classList.add('hidden');
    } else {
        autoFindBtn.disabled = true;
        autoFindLoginHint.classList.remove('hidden');
    }
}

/**
 * Load all communities for the filter
 */
async function loadCommunities() {
    try {
        console.log('[DEBUG] Loading communities...');
        const response = await fetch('/api/communities');
        const data = await response.json();
        console.log('[DEBUG] Communities API response:', data);

        if (data.success) {
            communities = data.data;
            console.log('[DEBUG] Communities loaded:', communities.length, 'communities');
            console.log('[DEBUG] Communities list:', communities.map(c => `${c.id}: ${c.name}`));
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
    console.log('[DEBUG] renderCommunityDropdown called with', communities.length, 'communities');
    const html = communities.map(c => `
        <label class="dropdown-item">
            <input type="checkbox" value="${c.id}" data-name="${c.name}">
            <span>${c.name}</span>
        </label>
    `).join('');

    console.log('[DEBUG] Dropdown HTML length:', html.length);
    communityDropdown.innerHTML = html;
    console.log('[DEBUG] Dropdown children count:', communityDropdown.children.length);
    console.log('[DEBUG] Dropdown element:', communityDropdown);
    console.log('[DEBUG] Dropdown scrollHeight:', communityDropdown.scrollHeight);
    console.log('[DEBUG] Dropdown clientHeight:', communityDropdown.clientHeight);

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
        // Find the full community object to get dimensions
        const community = communities.find(c => parseInt(c.id) === id);
        if (community && !selectedCommunities.find(sc => sc.id === id)) {
            selectedCommunities.push({
                id,
                name: community.name,
                stage: '',
                type: '',
                dimensions: community.dimensions ? JSON.parse(community.dimensions) : null
            });
        }
    } else {
        selectedCommunities = selectedCommunities.filter(sc => sc.id !== id);
    }

    renderSelectedCommunities();
    updateTriggerText();
}

/**
 * Render selected community tags with optional dimension filters
 */
function renderSelectedCommunities() {
    if (selectedCommunities.length === 0) {
        selectedCommunitiesWrapper.innerHTML = '';
        return;
    }

    selectedCommunitiesWrapper.innerHTML = selectedCommunities.map(sc => {
        const hasDimensions = sc.dimensions && (sc.dimensions.stage || sc.dimensions.type);

        let dimensionFiltersHtml = '';
        if (hasDimensions) {
            dimensionFiltersHtml = '<div class="community-dimension-filters">';

            if (sc.dimensions.stage) {
                dimensionFiltersHtml += `
                    <div class="community-dimension-filter">
                        <label>${escapeHtml(sc.dimensions.stage.label)}:</label>
                        <select data-community-id="${sc.id}" data-dimension="stage">
                            <option value="">不限</option>
                            ${sc.dimensions.stage.values.map(v =>
                                `<option value="${escapeHtml(v)}" ${sc.stage === v ? 'selected' : ''}>${escapeHtml(v)}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
            }

            if (sc.dimensions.type) {
                dimensionFiltersHtml += `
                    <div class="community-dimension-filter">
                        <label>${escapeHtml(sc.dimensions.type.label)}:</label>
                        <select data-community-id="${sc.id}" data-dimension="type">
                            <option value="">不限</option>
                            ${sc.dimensions.type.values.map(v =>
                                `<option value="${escapeHtml(v)}" ${sc.type === v ? 'selected' : ''}>${escapeHtml(v)}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
            }

            dimensionFiltersHtml += '</div>';
        }

        return `
            <div class="selected-community-item" data-community-id="${sc.id}">
                <div class="selected-community-header">
                    <span class="selected-community-name">${escapeHtml(sc.name)}</span>
                    <button type="button" class="tag-remove-btn" data-id="${sc.id}">&times;</button>
                </div>
                ${dimensionFiltersHtml}
            </div>
        `;
    }).join('');

    // Add remove listeners
    selectedCommunitiesWrapper.querySelectorAll('.tag-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            selectedCommunities = selectedCommunities.filter(sc => sc.id !== id);

            // Uncheck in dropdown
            const checkbox = communityDropdown.querySelector(`input[value="${id}"]`);
            if (checkbox) checkbox.checked = false;

            renderSelectedCommunities();
            updateTriggerText();
        });
    });

    // Add dimension select listeners
    selectedCommunitiesWrapper.querySelectorAll('.community-dimension-filter select').forEach(select => {
        select.addEventListener('change', (e) => {
            const communityId = parseInt(e.target.dataset.communityId);
            const dimension = e.target.dataset.dimension;
            const value = e.target.value;

            const sc = selectedCommunities.find(c => c.id === communityId);
            if (sc) {
                sc[dimension] = value;
            }
        });
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
 * Update trigger text
 */
function updateTriggerText() {
    const span = communityTrigger.querySelector('span');
    if (selectedCommunities.length === 0) {
        span.textContent = '选择社区...';
    } else {
        span.textContent = `已选择 ${selectedCommunities.length} 个社区`;
    }
}

/**
 * Toggle dropdown
 */
function toggleDropdown() {
    communityDropdown.classList.toggle('active');
    if (communityDropdown.classList.contains('active')) {
        console.log('[DEBUG] Dropdown opened');
        console.log('[DEBUG] Dropdown scrollHeight:', communityDropdown.scrollHeight);
        console.log('[DEBUG] Dropdown clientHeight:', communityDropdown.clientHeight);
        console.log('[DEBUG] Dropdown offsetHeight:', communityDropdown.offsetHeight);
        const styles = window.getComputedStyle(communityDropdown);
        console.log('[DEBUG] Dropdown computed maxHeight:', styles.maxHeight);
        console.log('[DEBUG] Dropdown computed overflow:', styles.overflow, styles.overflowY);
        console.log('[DEBUG] Dropdown children count:', communityDropdown.children.length);
    }
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

    // Auto-find button
    autoFindBtn.addEventListener('click', handleAutoFind);

    // Auto-find login link
    autoFindLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-btn')?.click();
    });

    // Listen for login state changes
    window.addEventListener('storage', (e) => {
        if (e.key === 'p_likeme_user' || e.key === 'p_likeme_token') {
            updateAutoFindState();
        }
    });

    // Also check login state periodically (for same-tab login)
    setInterval(updateAutoFindState, 1000);
}

/**
 * Handle auto-find button click
 */
async function handleAutoFind() {
    const user = getCurrentUser();
    if (!user) return;

    // Show loading
    showLoading();
    resultsTitle.textContent = '正在匹配...';

    try {
        // Fetch user's profile
        const response = await fetch(`/api/auth/profile/${encodeURIComponent(user.username)}`);
        const data = await response.json();

        if (!data.success) {
            showNoResults();
            resultsTitle.textContent = '无法获取个人资料';
            return;
        }

        const profile = data.data;

        // Check if profile has searchable data
        const hasCommunities = profile.communities && profile.communities.length > 0;
        const hasDiseaseTags = profile.disease_tags && profile.disease_tags.length > 0;
        const hasLocation = profile.location_living || profile.location_from ||
            profile.location_living_district || profile.location_living_street;
        const hasHospitals = profile.hospitals && profile.hospitals.length > 0;
        const hasBasicInfo = profile.gender || profile.age || profile.hukou || profile.education;
        const hasEconomicInfo = profile.income_individual || profile.income_family ||
            profile.consumption_level || profile.housing_status || profile.economic_dependency;

        if (!hasCommunities && !hasDiseaseTags && !hasLocation && !hasHospitals && !hasBasicInfo && !hasEconomicInfo) {
            showNoResults();
            resultsTitle.textContent = '请先完善个人资料';
            noResults.innerHTML = `
                <p>你的个人资料尚未填写</p>
                <p>请先<a href="profile.html?user=${encodeURIComponent(user.username)}" style="color: #2AB3B1;">完善资料</a>后再使用一键寻找</p>
            `;
            noResults.style.display = 'block';
            return;
        }

        // Build search params from profile
        const params = new URLSearchParams();

        if (hasCommunities) {
            // Send community filters with stage/type if available
            const communityFilters = profile.communities.map(c => ({
                id: c.id,
                stage: c.stage || '',
                type: c.type || ''
            }));
            params.set('community_filters', JSON.stringify(communityFilters));
        }
        if (hasDiseaseTags) {
            // Use first disease tag for search
            params.set('disease_tag', profile.disease_tags[0]);
        }
        if (profile.gender) {
            params.set('gender', profile.gender);
        }
        if (profile.age) {
            // Search for users within ±10 years
            params.set('age_min', Math.max(0, profile.age - 10));
            params.set('age_max', profile.age + 10);
        }
        if (profile.location_living) {
            params.set('location', profile.location_living);
        } else if (profile.location_from) {
            params.set('location', profile.location_from);
        }
        if (profile.location_living_district) {
            params.set('location_district', profile.location_living_district);
        }
        if (profile.location_living_street) {
            params.set('location_street', profile.location_living_street);
        }
        if (hasHospitals) {
            params.set('hospital', profile.hospitals[0]);
        }
        // New profile fields for auto-find
        if (profile.hukou) {
            params.set('hukou', profile.hukou);
        }
        if (profile.education) {
            params.set('education', profile.education);
        }
        if (profile.income_individual) {
            params.set('income_individual', profile.income_individual);
        }
        if (profile.income_family) {
            params.set('income_family', profile.income_family);
        }
        if (profile.consumption_level) {
            params.set('consumption_level', profile.consumption_level);
        }
        if (profile.housing_status) {
            params.set('housing_status', profile.housing_status);
        }
        if (profile.economic_dependency) {
            params.set('economic_dependency', profile.economic_dependency);
        }

        // Exclude self
        params.set('exclude_user', user.username);
        params.set('limit', LIMIT);
        params.set('offset', 0);

        // Perform search
        const searchResponse = await fetch(`/api/auth/users/search?${params.toString()}`);
        const searchData = await searchResponse.json();
        console.log('[DEBUG] Auto-find API response:', searchData);

        if (searchData.success) {
            currentOffset = 0;
            currentTotal = searchData.data.total;
            console.log('[DEBUG] Auto-find Total:', searchData.data.total, 'Users:', searchData.data.users?.length);

            // Update filters UI to show what was searched
            updateFiltersFromProfile(profile);

            renderResults(searchData.data.users, searchData.data.total);
            resultsTitle.textContent = `找到 ${searchData.data.total} 位相似的病友`;
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('Auto-find error:', error);
        showNoResults();
        resultsTitle.textContent = '搜索失败，请稍后再试';
    }
}

/**
 * Update filter UI to reflect profile-based search
 */
function updateFiltersFromProfile(profile) {
    // Update community selection
    if (profile.communities && profile.communities.length > 0) {
        // For auto-find, deduplicate by community ID and use Level I only
        // This avoids showing multiple panels for the same community when user has joined multiple sub-communities
        const uniqueCommunityIds = [...new Set(profile.communities.map(c => parseInt(c.id)))];

        selectedCommunities = uniqueCommunityIds.map(id => {
            const fullCommunity = communities.find(fc => parseInt(fc.id) === id);
            const profileCommunity = profile.communities.find(c => parseInt(c.id) === id);
            return {
                id,
                name: profileCommunity?.name || (fullCommunity ? fullCommunity.name : ''),
                stage: '',  // Use Level I for auto-find
                type: '',   // Use Level I for auto-find
                dimensions: fullCommunity && fullCommunity.dimensions ? JSON.parse(fullCommunity.dimensions) : null
            };
        });

        // Check the checkboxes
        communityDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = selectedCommunities.some(sc => sc.id === parseInt(cb.value));
        });

        renderSelectedCommunities();
        updateTriggerText();
    }

    // Update other filters
    if (profile.disease_tags && profile.disease_tags.length > 0) {
        document.getElementById('filter-disease').value = profile.disease_tags[0];
    }
    if (profile.gender) {
        document.getElementById('filter-gender').value = profile.gender;
    }
    if (profile.age) {
        document.getElementById('filter-age-min').value = Math.max(0, profile.age - 10);
        document.getElementById('filter-age-max').value = profile.age + 10;
    }
    if (profile.location_living) {
        document.getElementById('filter-location').value = profile.location_living;
    } else if (profile.location_from) {
        document.getElementById('filter-location').value = profile.location_from;
    }
    if (profile.location_living_district) {
        document.getElementById('filter-district').value = profile.location_living_district;
    }
    if (profile.location_living_street) {
        document.getElementById('filter-street').value = profile.location_living_street;
    }
    if (profile.hospitals && profile.hospitals.length > 0) {
        document.getElementById('filter-hospital').value = profile.hospitals[0];
    }
    // Update new filter fields
    if (profile.hukou) {
        document.getElementById('filter-hukou').value = profile.hukou;
    }
    if (profile.education) {
        document.getElementById('filter-education').value = profile.education;
    }
    if (profile.income_individual) {
        document.getElementById('filter-income-individual').value = profile.income_individual;
    }
    if (profile.income_family) {
        document.getElementById('filter-income-family').value = profile.income_family;
    }
    if (profile.consumption_level) {
        document.getElementById('filter-consumption-level').value = profile.consumption_level;
    }
    if (profile.housing_status) {
        document.getElementById('filter-housing-status').value = profile.housing_status;
    }
    if (profile.economic_dependency) {
        document.getElementById('filter-economic-dependency').value = profile.economic_dependency;
    }
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
    const locationDistrict = document.getElementById('filter-district').value.trim();
    const locationStreet = document.getElementById('filter-street').value.trim();
    const hospital = document.getElementById('filter-hospital').value.trim();
    const hukou = document.getElementById('filter-hukou').value;
    const education = document.getElementById('filter-education').value;
    const incomeIndividual = document.getElementById('filter-income-individual').value;
    const incomeFamily = document.getElementById('filter-income-family').value;
    const consumptionLevel = document.getElementById('filter-consumption-level').value;
    const housingStatus = document.getElementById('filter-housing-status').value;
    const economicDependency = document.getElementById('filter-economic-dependency').value;

    // Check if any filter is set
    const hasAnyFilter = selectedCommunities.length > 0 || diseaseTag || gender || ageMin || ageMax ||
        location || locationDistrict || locationStreet || hospital || hukou || education || incomeIndividual || incomeFamily ||
        consumptionLevel || housingStatus || economicDependency;

    if (!hasAnyFilter) {
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
    if (selectedCommunities.length > 0) {
        // Send community filters as JSON array with id, stage, type
        const communityFilters = selectedCommunities.map(sc => ({
            id: sc.id,
            stage: sc.stage || '',
            type: sc.type || ''
        }));
        params.set('community_filters', JSON.stringify(communityFilters));
    }
    if (diseaseTag) params.set('disease_tag', diseaseTag);
    if (gender) params.set('gender', gender);
    if (ageMin) params.set('age_min', ageMin);
    if (ageMax) params.set('age_max', ageMax);
    if (location) params.set('location', location);
    if (locationDistrict) params.set('location_district', locationDistrict);
    if (locationStreet) params.set('location_street', locationStreet);
    if (hospital) params.set('hospital', hospital);
    if (hukou) params.set('hukou', hukou);
    if (education) params.set('education', education);
    if (incomeIndividual) params.set('income_individual', incomeIndividual);
    if (incomeFamily) params.set('income_family', incomeFamily);
    if (consumptionLevel) params.set('consumption_level', consumptionLevel);
    if (housingStatus) params.set('housing_status', housingStatus);
    if (economicDependency) params.set('economic_dependency', economicDependency);

    // Exclude current user from results
    const currentUser = getCurrentUser();
    if (currentUser) {
        params.set('exclude_user', currentUser.username);
    }

    params.set('limit', LIMIT);
    params.set('offset', currentOffset);

    try {
        const response = await fetch(`/api/auth/users/search?${params.toString()}`);
        const data = await response.json();
        console.log('[DEBUG] Search API response:', data);

        if (data.success) {
            currentTotal = data.data.total;
            console.log('[DEBUG] Total:', data.data.total, 'Users:', data.data.users?.length);

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
    selectedCommunities = [];
    communityDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    renderSelectedCommunities();
    updateTriggerText();

    // Clear other inputs
    document.getElementById('filter-disease').value = '';
    document.getElementById('filter-gender').value = '';
    document.getElementById('filter-age-min').value = '';
    document.getElementById('filter-age-max').value = '';
    document.getElementById('filter-location').value = '';
    document.getElementById('filter-district').value = '';
    document.getElementById('filter-street').value = '';
    document.getElementById('filter-hospital').value = '';
    document.getElementById('filter-hukou').value = '';
    document.getElementById('filter-education').value = '';
    document.getElementById('filter-income-individual').value = '';
    document.getElementById('filter-income-family').value = '';
    document.getElementById('filter-consumption-level').value = '';
    document.getElementById('filter-housing-status').value = '';
    document.getElementById('filter-economic-dependency').value = '';

    // Reset results
    currentOffset = 0;
    showSearchHint();
    resultsTitle.textContent = '请选择筛选条件开始搜索';
}

// Initialize
document.addEventListener('DOMContentLoaded', initDiscover);
