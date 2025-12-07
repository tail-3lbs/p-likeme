/**
 * Discover Page JavaScript
 * Handles user search with filters
 */

// ============ DiscoverFilterSelector Class ============
/**
 * Reusable filter selector for discover page
 * Handles accordion-style community/disease selection with dimensions
 */
class DiscoverFilterSelector {
    /**
     * @param {Object} config
     * @param {string} config.idPrefix - Prefix for checkbox IDs (e.g., 'community', 'disease')
     * @param {string} config.dataAttr - Data attribute name for display text (e.g., 'name', 'disease')
     * @param {string} config.idField - Field name for ID in selected items (e.g., 'id', 'community_id')
     * @param {string} config.displayField - Field name for display text in selected items (e.g., 'name', 'disease')
     * @param {string} config.emptyText - Text when nothing selected (e.g., '选择社区...', '选择疾病...')
     * @param {string} config.tagClass - CSS class for selected tags (e.g., 'community-filter-tag', 'disease-filter-tag')
     * @param {string} config.contentClass - CSS class for accordion content (e.g., 'community-filter-item-content', 'disease-filter-community-content')
     * @param {string} config.itemClass - CSS class for filter items (e.g., 'community-filter-item', 'disease-filter-community')
     * @param {string} config.headerClass - CSS class for item headers (e.g., 'community-filter-item-header', 'disease-filter-community-header')
     * @param {string} config.nameClass - CSS class for item names (e.g., 'community-filter-item-name', 'disease-filter-community-name')
     * @param {HTMLElement} config.listEl - Container element for the list
     * @param {HTMLElement} config.selectedEl - Container element for selected tags
     * @param {HTMLElement} config.triggerEl - Trigger button element
     * @param {Function} config.buildSelectedItem - Function to build selected item object from checkbox data
     */
    constructor(config) {
        this.config = config;
        this.communities = [];
        this.selectedItems = [];
    }

    setCommunities(communities) {
        this.communities = communities;
    }

    getSelected() {
        return this.selectedItems;
    }

    setSelected(items) {
        this.selectedItems = items || [];
        this.render();
        this.renderSelectedTags();
        this.updateTriggerText();
    }

    clear() {
        this.selectedItems = [];
        if (this.config.listEl) {
            this.config.listEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
        }
        this.renderSelectedTags();
        this.updateTriggerText();
    }

    generateCheckboxId(communityId, stage, type) {
        return `${this.config.idPrefix}-cb-${communityId}-${stage || 'none'}-${type || 'none'}`;
    }

    isSelected(communityId, stage, type) {
        const idField = this.config.idField;
        return this.selectedItems.some(item =>
            item[idField] === communityId &&
            (item.stage || '') === (stage || '') &&
            (item.type || '') === (type || '')
        );
    }

    render() {
        const { listEl, contentClass, itemClass, headerClass, nameClass, dataAttr } = this.config;
        if (!listEl) return;

        listEl.innerHTML = this.communities.map(c => {
            const dimensions = c.dimensions ? JSON.parse(c.dimensions) : null;
            const hasDimensions = dimensions && (dimensions.stage || dimensions.type);

            if (hasDimensions) {
                return this.renderCommunityWithDimensions(c, dimensions);
            } else {
                return this.renderSimpleCommunity(c);
            }
        }).join('');

        // Add accordion toggle listeners for community headers
        listEl.querySelectorAll(`.${headerClass}`).forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('expanded');
            });
        });

        // Add accordion toggle listeners for dimension headers
        listEl.querySelectorAll('.filter-dimension-header').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('expanded');
            });
        });

        // Add change listeners for checkboxes
        listEl.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleCheckboxChange(e));
        });
    }

    renderSimpleCommunity(community) {
        const { itemClass, dataAttr } = this.config;
        const checkboxId = this.generateCheckboxId(community.id, '', '');
        const isChecked = this.isSelected(community.id, '', '');

        return `
            <div class="${itemClass}" data-community-id="${community.id}">
                <div class="filter-checkbox-row">
                    <input type="checkbox" id="${checkboxId}"
                           data-community-id="${community.id}"
                           data-stage="" data-type=""
                           data-${dataAttr}="${escapeHtml(community.name)}"
                           ${isChecked ? 'checked' : ''}>
                    <label for="${checkboxId}">${escapeHtml(community.name)}</label>
                </div>
            </div>
        `;
    }

    renderCommunityWithDimensions(community, dimensions) {
        const { contentClass, itemClass, headerClass, nameClass, dataAttr } = this.config;
        let contentHtml = `<div class="${contentClass}">`;

        // Add Level I option (base community)
        const levelIId = this.generateCheckboxId(community.id, '', '');
        const levelIChecked = this.isSelected(community.id, '', '');
        contentHtml += `
            <div class="filter-checkbox-row">
                <input type="checkbox" id="${levelIId}"
                       data-community-id="${community.id}"
                       data-stage="" data-type=""
                       data-${dataAttr}="${escapeHtml(community.name)}"
                       ${levelIChecked ? 'checked' : ''}>
                <label for="${levelIId}">${escapeHtml(community.name)} (仅大类)</label>
            </div>
        `;

        const stages = dimensions.stage?.values || [];
        const types = dimensions.type?.values || [];

        // Stage dimension section
        if (stages.length > 0) {
            contentHtml += this.renderDimensionSection(community, dimensions.stage.label,
                stages.map(stage => ({ stage, type: '' })),
                (stage) => `${community.name} - ${stage}`
            );
        }

        // Type dimension section
        if (types.length > 0) {
            contentHtml += this.renderDimensionSection(community, dimensions.type.label,
                types.map(type => ({ stage: '', type })),
                (_, type) => `${community.name} - ${type}`
            );
        }

        // Combined section
        if (stages.length > 0 && types.length > 0) {
            const combos = [];
            for (const stage of stages) {
                for (const type of types) {
                    combos.push({ stage, type });
                }
            }
            contentHtml += this.renderDimensionSection(community, '组合选择', combos,
                (stage, type) => `${community.name} - ${stage} · ${type}`,
                (stage, type) => `${stage} · ${type}`
            );
        }

        contentHtml += '</div>';

        return `
            <div class="${itemClass}" data-community-id="${community.id}">
                <div class="${headerClass}">
                    <span class="filter-expand-icon">▶</span>
                    <span class="${nameClass}">${escapeHtml(community.name)}</span>
                </div>
                ${contentHtml}
            </div>
        `;
    }

    renderDimensionSection(community, label, items, getDataName, getLabel = null) {
        const { dataAttr } = this.config;
        let html = `
            <div class="filter-dimension-group">
                <div class="filter-dimension-header">
                    <span class="filter-expand-icon">▶</span>
                    <span class="filter-dimension-label">${escapeHtml(label)}</span>
                </div>
                <div class="filter-dimension-content">
        `;

        for (const item of items) {
            const checkboxId = this.generateCheckboxId(community.id, item.stage, item.type);
            const isChecked = this.isSelected(community.id, item.stage, item.type);
            const dataName = getDataName(item.stage, item.type);
            const labelText = getLabel ? getLabel(item.stage, item.type) : (item.stage || item.type);

            html += `
                <div class="filter-checkbox-row">
                    <input type="checkbox" id="${checkboxId}"
                           data-community-id="${community.id}"
                           data-stage="${escapeHtml(item.stage)}" data-type="${escapeHtml(item.type)}"
                           data-${dataAttr}="${escapeHtml(dataName)}"
                           ${isChecked ? 'checked' : ''}>
                    <label for="${checkboxId}">${escapeHtml(labelText)}</label>
                </div>
            `;
        }

        html += '</div></div>';
        return html;
    }

    handleCheckboxChange(e) {
        const checkbox = e.target;
        const communityId = parseInt(checkbox.dataset.communityId, 10);
        const stage = checkbox.dataset.stage || '';
        const type = checkbox.dataset.type || '';
        const displayText = checkbox.dataset[this.config.dataAttr];

        if (checkbox.checked) {
            if (!this.isSelected(communityId, stage, type)) {
                const item = this.config.buildSelectedItem(communityId, stage, type, displayText, this.communities);
                this.selectedItems.push(item);
            }
        } else {
            const idField = this.config.idField;
            this.selectedItems = this.selectedItems.filter(item =>
                !(item[idField] === communityId &&
                  (item.stage || '') === stage &&
                  (item.type || '') === type)
            );
        }

        this.renderSelectedTags();
        this.updateTriggerText();
    }

    renderSelectedTags() {
        const { selectedEl, tagClass, displayField, idField } = this.config;
        if (!selectedEl) return;

        if (this.selectedItems.length === 0) {
            selectedEl.innerHTML = '';
            return;
        }

        selectedEl.innerHTML = this.selectedItems.map((item, index) =>
            `<span class="${tagClass}">
                ${escapeHtml(item[displayField])}
                <span class="remove-tag" data-index="${index}">&times;</span>
            </span>`
        ).join('');

        // Add remove listeners
        selectedEl.querySelectorAll('.remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index, 10);
                const removed = this.selectedItems[index];
                this.selectedItems.splice(index, 1);

                // Uncheck the corresponding checkbox
                const itemId = removed[idField];
                if (itemId) {
                    const checkboxId = this.generateCheckboxId(itemId, removed.stage || '', removed.type || '');
                    const checkbox = document.getElementById(checkboxId);
                    if (checkbox) checkbox.checked = false;
                }

                this.renderSelectedTags();
                this.updateTriggerText();
            });
        });
    }

    updateTriggerText() {
        const { triggerEl, emptyText } = this.config;
        if (!triggerEl) return;

        const span = triggerEl.querySelector('.trigger-text');
        if (!span) return;

        if (this.selectedItems.length === 0) {
            span.textContent = emptyText;
        } else {
            span.textContent = `已选择 ${this.selectedItems.length} 个`;
        }
    }

    // Add a free-text item (for disease filter)
    addFreeTextItem(displayText) {
        if (!displayText) return false;

        const displayField = this.config.displayField;
        const exists = this.selectedItems.some(item => item[displayField] === displayText);
        if (exists) return false;

        const item = this.config.buildSelectedItem(null, '', '', displayText, this.communities);
        this.selectedItems.push(item);
        this.renderSelectedTags();
        this.updateTriggerText();
        return true;
    }
}

// ============ State ============
let communities = [];
let communityFilterSelector = null;
let diseaseFilterSelector = null;
let currentOffset = 0;
let currentTotal = 0;
const LIMIT = 20;

// DOM Elements (initialized in initDiscover after DOMContentLoaded)
let searchForm, communityTrigger, communityDropdown, communityFilterList, communityFilterSelected;
let diseaseFilterTrigger, diseaseFilterDropdown, diseaseFilterList, diseaseFilterSelected;
let resultsTitle, searchHint, resultsLoading, noResults, userCards;
let resultsPagination, loadMoreBtn, clearFiltersBtn;
let autoFindBtn, autoFindLoginHint, autoFindLoginLink;
let usernameSearchInput, usernameSearchBtn;

/**
 * Initialize page
 */
async function initDiscover() {
    // Initialize DOM elements
    searchForm = document.getElementById('search-form');
    communityTrigger = document.getElementById('community-trigger');
    communityDropdown = document.getElementById('community-dropdown');
    communityFilterList = document.getElementById('community-filter-list');
    communityFilterSelected = document.getElementById('community-filter-selected');
    diseaseFilterTrigger = document.getElementById('disease-filter-trigger');
    diseaseFilterDropdown = document.getElementById('disease-filter-dropdown');
    diseaseFilterList = document.getElementById('disease-filter-list');
    diseaseFilterSelected = document.getElementById('disease-filter-selected');
    resultsTitle = document.getElementById('results-title');
    searchHint = document.getElementById('search-hint');
    resultsLoading = document.getElementById('results-loading');
    noResults = document.getElementById('no-results');
    userCards = document.getElementById('user-cards');
    resultsPagination = document.getElementById('results-pagination');
    loadMoreBtn = document.getElementById('load-more-btn');
    clearFiltersBtn = document.getElementById('clear-filters-btn');
    autoFindBtn = document.getElementById('auto-find-btn');
    autoFindLoginHint = document.getElementById('auto-find-login-hint');
    autoFindLoginLink = document.getElementById('auto-find-login-link');
    usernameSearchInput = document.getElementById('username-search-input');
    usernameSearchBtn = document.getElementById('username-search-btn');

    await loadCommunities();
    initFilterSelectors();
    setupEventListeners();
    updateAutoFindState();
}

/**
 * Initialize filter selectors using DiscoverFilterSelector
 */
function initFilterSelectors() {
    // Community filter selector
    communityFilterSelector = new DiscoverFilterSelector({
        idPrefix: 'community',
        dataAttr: 'name',
        idField: 'id',
        displayField: 'name',
        emptyText: '选择社区...',
        tagClass: 'community-filter-tag',
        contentClass: 'community-filter-item-content',
        itemClass: 'community-filter-item',
        headerClass: 'community-filter-item-header',
        nameClass: 'community-filter-item-name',
        listEl: communityFilterList,
        selectedEl: communityFilterSelected,
        triggerEl: communityTrigger,
        buildSelectedItem: (communityId, stage, type, displayText, allCommunities) => {
            const community = allCommunities.find(c => parseInt(c.id, 10) === communityId);
            return {
                id: communityId,
                name: displayText,
                stage: stage,
                type: type,
                dimensions: community && community.dimensions ? JSON.parse(community.dimensions) : null
            };
        }
    });
    communityFilterSelector.setCommunities(communities);
    communityFilterSelector.render();

    // Disease filter selector
    diseaseFilterSelector = new DiscoverFilterSelector({
        idPrefix: 'disease',
        dataAttr: 'disease',
        idField: 'community_id',
        displayField: 'disease',
        emptyText: '选择疾病...',
        tagClass: 'disease-filter-tag',
        contentClass: 'disease-filter-community-content',
        itemClass: 'disease-filter-community',
        headerClass: 'disease-filter-community-header',
        nameClass: 'disease-filter-community-name',
        listEl: diseaseFilterList,
        selectedEl: diseaseFilterSelected,
        triggerEl: diseaseFilterTrigger,
        buildSelectedItem: (communityId, stage, type, displayText, allCommunities) => {
            return {
                community_id: communityId,
                stage: stage,
                type: type,
                disease: displayText
            };
        }
    });
    diseaseFilterSelector.setCommunities(communities);
    diseaseFilterSelector.render();
}

/**
 * Update auto-find button state based on login status
 */
function updateAutoFindState() {
    const user = getUser();
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
        const response = await fetch('/api/communities');
        const data = await response.json();

        if (data.success) {
            communities = data.data;
        }
    } catch (error) {
        console.error('Error loading communities:', error);
    }
}

// escapeHtml is defined in main.js

/**
 * Toggle community dropdown
 */
function toggleCommunityDropdown() {
    const selector = document.querySelector('.community-filter-selector');
    if (selector) {
        selector.classList.toggle('open');
    }
}

/**
 * Close dropdown when clicking outside
 */
function handleClickOutside(e) {
    // Handle community filter dropdown
    const communitySelector = document.querySelector('.community-filter-selector');
    if (communitySelector && !communitySelector.contains(e.target)) {
        communitySelector.classList.remove('open');
    }
    // Handle disease filter dropdown
    const diseaseSelector = document.querySelector('.disease-filter-selector');
    if (diseaseSelector && !diseaseSelector.contains(e.target)) {
        diseaseSelector.classList.remove('open');
    }
}

/**
 * Add free-text disease to filter
 */
function addFreetextDiseaseFilter() {
    const input = document.getElementById('disease-filter-freetext');
    if (!input) return;

    const value = input.value.trim();
    if (!value) return;

    if (diseaseFilterSelector && diseaseFilterSelector.addFreeTextItem(value)) {
        input.value = '';
    }
}

/**
 * Toggle disease filter dropdown
 */
function toggleDiseaseDropdown() {
    const selector = document.querySelector('.disease-filter-selector');
    if (selector) {
        selector.classList.toggle('open');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Community dropdown toggle
    if (communityTrigger) {
        communityTrigger.addEventListener('click', toggleCommunityDropdown);
    }
    document.addEventListener('click', handleClickOutside);

    // Disease filter dropdown
    if (diseaseFilterTrigger) {
        diseaseFilterTrigger.addEventListener('click', toggleDiseaseDropdown);
    }

    // Disease filter free-text
    const diseaseFreetextInput = document.getElementById('disease-filter-freetext');
    const diseaseFreetextBtn = document.getElementById('disease-filter-freetext-add');
    if (diseaseFreetextInput) {
        diseaseFreetextInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addFreetextDiseaseFilter();
            }
        });
    }
    if (diseaseFreetextBtn) {
        diseaseFreetextBtn.addEventListener('click', addFreetextDiseaseFilter);
    }

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

    // Username search
    if (usernameSearchBtn) {
        usernameSearchBtn.addEventListener('click', handleUsernameSearch);
    }
    if (usernameSearchInput) {
        usernameSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleUsernameSearch();
            }
        });
    }

    // Listen for login state changes (cross-tab via storage event)
    window.addEventListener('storage', (e) => {
        if (e.key === USER_KEY) {
            updateAutoFindState();
        }
    });

    // Listen for login state changes (same-tab via custom event)
    window.addEventListener('authStateChanged', updateAutoFindState);
}

/**
 * Handle username search
 */
async function handleUsernameSearch() {
    const username = usernameSearchInput?.value.trim();
    if (!username) return;

    // Show loading
    showLoading();
    resultsTitle.textContent = `搜索用户: ${username}`;

    try {
        // Search by username
        const params = new URLSearchParams();
        params.set('username', username);
        params.set('limit', LIMIT);
        params.set('offset', 0);

        const response = await fetch(`/api/auth/users/search?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            currentOffset = 0;
            currentTotal = data.total;
            renderResults(data.data, data.total);
            if (data.total === 0) {
                resultsTitle.textContent = `未找到用户: ${username}`;
            } else {
                resultsTitle.textContent = `找到 ${data.total} 位用户`;
            }
        } else {
            showNoResults();
            resultsTitle.textContent = '搜索失败';
        }
    } catch (error) {
        console.error('Username search error:', error);
        showNoResults();
        resultsTitle.textContent = '搜索失败，请稍后再试';
    }
}

/**
 * Handle auto-find button click
 */
async function handleAutoFind() {
    const user = getUser();
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
        const hasDiseaseHistory = profile.disease_history && profile.disease_history.length > 0;
        const hasLocation = profile.location_living || profile.location_from ||
            profile.location_living_district || profile.location_living_street;
        const hasHospitals = profile.hospitals && profile.hospitals.length > 0;
        const hasBasicInfo = profile.gender || profile.age || profile.hukou || profile.education;
        const hasEconomicInfo = profile.income_individual || profile.income_family ||
            profile.consumption_level || profile.housing_status || profile.economic_dependency;

        if (!hasCommunities && !hasDiseaseHistory && !hasLocation && !hasHospitals && !hasBasicInfo && !hasEconomicInfo) {
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
        if (hasDiseaseHistory) {
            // Use first disease for search
            params.set('disease_tag', profile.disease_history[0].disease);
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
        if (profile.profession) {
            params.set('profession', profile.profession);
        }
        if (profile.marriage_status) {
            params.set('marriage_status', profile.marriage_status);
        }
        if (profile.fertility_status) {
            params.set('fertility_status', profile.fertility_status);
        }
        if (profile.location_from) {
            params.set('location_from', profile.location_from);
        }
        if (profile.hukou) {
            params.set('hukou', profile.hukou);
        }
        if (profile.education) {
            params.set('education', profile.education);
        }
        if (profile.family_size) {
            params.set('family_size', profile.family_size);
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

        if (searchData.success) {
            currentOffset = 0;
            currentTotal = searchData.total;

            // Update filters UI to show what was searched
            updateFiltersFromProfile(profile);

            renderResults(searchData.data, searchData.total);
            resultsTitle.textContent = `找到 ${searchData.total} 位相似的病友`;
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
    if (profile.communities && profile.communities.length > 0 && communityFilterSelector) {
        // For auto-find, deduplicate by community ID and use Level I only
        // This avoids showing multiple panels for the same community when user has joined multiple sub-communities
        const uniqueCommunityIds = [...new Set(profile.communities.map(c => parseInt(c.id, 10)))];

        const items = uniqueCommunityIds.map(id => {
            const fullCommunity = communities.find(fc => parseInt(fc.id, 10) === id);
            const profileCommunity = profile.communities.find(c => parseInt(c.id, 10) === id);
            return {
                id,
                name: profileCommunity?.name || (fullCommunity ? fullCommunity.name : ''),
                stage: '',  // Use Level I for auto-find
                type: '',   // Use Level I for auto-find
                dimensions: fullCommunity && fullCommunity.dimensions ? JSON.parse(fullCommunity.dimensions) : null
            };
        });

        communityFilterSelector.setSelected(items);
    }

    // Update disease selection
    if (profile.disease_history && profile.disease_history.length > 0 && diseaseFilterSelector) {
        const items = profile.disease_history.map(d => ({
            community_id: d.community_id || null,
            stage: d.stage || '',
            type: d.type || '',
            disease: d.disease
        }));
        diseaseFilterSelector.setSelected(items);
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
    if (profile.profession) {
        document.getElementById('filter-profession').value = profile.profession;
    }
    if (profile.marriage_status) {
        document.getElementById('filter-marriage').value = profile.marriage_status;
    }
    if (profile.fertility_status) {
        document.getElementById('filter-fertility-status').value = profile.fertility_status;
    }
    if (profile.location_from) {
        document.getElementById('filter-location-from').value = profile.location_from;
    }
    if (profile.hukou) {
        document.getElementById('filter-hukou').value = profile.hukou;
    }
    if (profile.education) {
        document.getElementById('filter-education').value = profile.education;
    }
    if (profile.family_size) {
        const familySizeValue = profile.family_size >= 5 ? '5+' : String(profile.family_size);
        document.getElementById('filter-family-size').value = familySizeValue;
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
    // Disease filter now uses selectedDiseases array
    const gender = document.getElementById('filter-gender').value;
    const ageMin = document.getElementById('filter-age-min').value;
    const ageMax = document.getElementById('filter-age-max').value;
    const location = document.getElementById('filter-location').value.trim();
    const locationDistrict = document.getElementById('filter-district').value.trim();
    const locationStreet = document.getElementById('filter-street').value.trim();
    const hospital = document.getElementById('filter-hospital').value.trim();
    const profession = document.getElementById('filter-profession').value.trim();
    const marriageStatus = document.getElementById('filter-marriage').value;
    const fertilityStatus = document.getElementById('filter-fertility-status').value;
    const locationFrom = document.getElementById('filter-location-from').value.trim();
    const hukou = document.getElementById('filter-hukou').value;
    const education = document.getElementById('filter-education').value;
    const familySize = document.getElementById('filter-family-size').value;
    const incomeIndividual = document.getElementById('filter-income-individual').value;
    const incomeFamily = document.getElementById('filter-income-family').value;
    const consumptionLevel = document.getElementById('filter-consumption-level').value;
    const housingStatus = document.getElementById('filter-housing-status').value;
    const economicDependency = document.getElementById('filter-economic-dependency').value;

    // Get selected items from filter selectors
    const selectedCommunities = communityFilterSelector ? communityFilterSelector.getSelected() : [];
    const selectedDiseases = diseaseFilterSelector ? diseaseFilterSelector.getSelected() : [];

    // Check if any filter is set
    const hasAnyFilter = selectedCommunities.length > 0 || selectedDiseases.length > 0 || gender || ageMin || ageMax ||
        location || locationDistrict || locationStreet || hospital || profession || marriageStatus || fertilityStatus ||
        locationFrom || hukou || education || familySize || incomeIndividual || incomeFamily ||
        consumptionLevel || housingStatus || economicDependency;

    if (!hasAnyFilter) {
        showSearchHint();
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
    if (selectedDiseases.length > 0) {
        // Use first disease name for search (API currently supports single disease_tag)
        params.set('disease_tag', selectedDiseases[0].disease);
    }
    if (gender) params.set('gender', gender);
    if (ageMin) params.set('age_min', ageMin);
    if (ageMax) params.set('age_max', ageMax);
    if (location) params.set('location', location);
    if (locationDistrict) params.set('location_district', locationDistrict);
    if (locationStreet) params.set('location_street', locationStreet);
    if (hospital) params.set('hospital', hospital);
    if (profession) params.set('profession', profession);
    if (marriageStatus) params.set('marriage_status', marriageStatus);
    if (fertilityStatus) params.set('fertility_status', fertilityStatus);
    if (locationFrom) params.set('location_from', locationFrom);
    if (hukou) params.set('hukou', hukou);
    if (education) params.set('education', education);
    if (familySize) params.set('family_size', familySize);
    if (incomeIndividual) params.set('income_individual', incomeIndividual);
    if (incomeFamily) params.set('income_family', incomeFamily);
    if (consumptionLevel) params.set('consumption_level', consumptionLevel);
    if (housingStatus) params.set('housing_status', housingStatus);
    if (economicDependency) params.set('economic_dependency', economicDependency);

    // Exclude current user from results
    const currentUser = getUser();
    if (currentUser) {
        params.set('exclude_user', currentUser.username);
    }

    params.set('limit', LIMIT);
    params.set('offset', currentOffset);

    try {
        const response = await fetch(`/api/auth/users/search?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            currentTotal = data.total;

            if (append) {
                appendResults(data.data);
            } else {
                renderResults(data.data, data.total);
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

    // Format basic info line
    const basicInfo = [];
    if (user.gender) basicInfo.push(user.gender);
    if (user.age) basicInfo.push(`${user.age}岁`);
    if (user.marriage_status) basicInfo.push(user.marriage_status);
    if (user.fertility_status) basicInfo.push(user.fertility_status);

    // Format location info
    const locationInfo = [];
    if (user.location_living) locationInfo.push(`现居: ${user.location_living}`);
    if (user.location_from) locationInfo.push(`家乡: ${user.location_from}`);

    // Format extra info (profession, education, etc.)
    const extraInfo = [];
    if (user.profession) extraInfo.push(user.profession);
    if (user.education) extraInfo.push(user.education);

    // Communities - show all with full path (e.g., "乳腺癌 > 0期 · 三阴性")
    const communitiesHtml = user.communities && user.communities.length > 0
        ? user.communities.map(c => `<span class="user-card-tag community-tag">${c.displayPath || c.name}</span>`).join('')
        : '';

    // Disease history - show up to 5 with duration
    let diseaseTagsHtml = '';
    if (user.disease_history && user.disease_history.length > 0) {
        const shown = user.disease_history.slice(0, 5);
        const remaining = user.disease_history.length - shown.length;
        diseaseTagsHtml = shown.map(d => {
            const displayText = typeof d === 'object' ? formatDiseaseWithDuration(d.disease, d.onset_date) : d;
            return `<span class="user-card-tag disease-tag">${escapeHtml(displayText)}</span>`;
        }).join('');
        if (remaining > 0) {
            diseaseTagsHtml += `<span class="user-card-tag disease-tag more-tag">+${remaining}</span>`;
        }
    }

    // Hospitals - show up to 3
    let hospitalsHtml = '';
    if (user.hospitals && user.hospitals.length > 0) {
        const shown = user.hospitals.slice(0, 3);
        const remaining = user.hospitals.length - shown.length;
        hospitalsHtml = shown.map(h => `<span class="user-card-tag hospital-tag">${h}</span>`).join('');
        if (remaining > 0) {
            hospitalsHtml += `<span class="user-card-tag hospital-tag more-tag">+${remaining}</span>`;
        }
    }

    return `
        <a href="profile.html?user=${encodeURIComponent(user.username)}" class="user-card">
            <div class="user-card-avatar">
                <span>${letter}</span>
            </div>
            <div class="user-card-content">
                <div class="user-card-header">
                    <h4>${user.username}</h4>
                </div>
                <div class="user-card-info-lines">
                    ${basicInfo.length > 0 ? `<div class="user-card-info-line">${basicInfo.join(' · ')}</div>` : ''}
                    ${locationInfo.length > 0 ? `<div class="user-card-info-line secondary">${locationInfo.join(' | ')}</div>` : ''}
                    ${extraInfo.length > 0 ? `<div class="user-card-info-line secondary">${extraInfo.join(' · ')}</div>` : ''}
                </div>
                <div class="user-card-tags">
                    ${diseaseTagsHtml}
                    ${communitiesHtml}
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
    if (communityFilterSelector) {
        communityFilterSelector.clear();
    }

    // Clear disease selection
    if (diseaseFilterSelector) {
        diseaseFilterSelector.clear();
    }

    // Clear username search
    if (usernameSearchInput) {
        usernameSearchInput.value = '';
    }

    // Clear other inputs
    document.getElementById('filter-gender').value = '';
    document.getElementById('filter-age-min').value = '';
    document.getElementById('filter-age-max').value = '';
    document.getElementById('filter-location').value = '';
    document.getElementById('filter-district').value = '';
    document.getElementById('filter-street').value = '';
    document.getElementById('filter-hospital').value = '';
    document.getElementById('filter-profession').value = '';
    document.getElementById('filter-marriage').value = '';
    document.getElementById('filter-fertility-status').value = '';
    document.getElementById('filter-location-from').value = '';
    document.getElementById('filter-hukou').value = '';
    document.getElementById('filter-education').value = '';
    document.getElementById('filter-family-size').value = '';
    document.getElementById('filter-income-individual').value = '';
    document.getElementById('filter-income-family').value = '';
    document.getElementById('filter-consumption-level').value = '';
    document.getElementById('filter-housing-status').value = '';
    document.getElementById('filter-economic-dependency').value = '';

    // Reset results
    currentOffset = 0;
    showSearchHint();
    resultsTitle.textContent = '';
}

// Initialize
document.addEventListener('DOMContentLoaded', initDiscover);
