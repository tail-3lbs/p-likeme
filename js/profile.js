/**
 * Profile Page JavaScript
 * Handles viewing and editing user profiles
 */

// Get username from URL
const urlParams = new URLSearchParams(window.location.search);
const profileUsername = urlParams.get('user');

// State
let profileData = null;
let isOwnProfile = false;
let diseaseHistory = []; // Array of {community_id, stage, type, disease, onset_date}
let hospitalTags = [];
let allCommunities = []; // All available communities for disease selection
let userCommunityIds = new Set(); // Community IDs user has joined (Level I)
let pendingDiseaseCheckbox = null; // Currently pending disease checkbox waiting for date input

// DOM Elements
const profileLoading = document.getElementById('profile-loading');
const profileNotFound = document.getElementById('profile-not-found');
const profileContent = document.getElementById('profile-content');
const viewMode = document.getElementById('view-mode');
const editMode = document.getElementById('edit-mode');
const editProfileBtn = document.getElementById('edit-profile-btn');
const viewThreadsBtn = document.getElementById('view-threads-btn');
const viewGuruBtn = document.getElementById('view-guru-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const profileForm = document.getElementById('profile-form');
const profileError = document.getElementById('profile-error');

/**
 * Initialize page
 */
async function initProfile() {
    if (!profileUsername) {
        showNotFound();
        return;
    }

    // Check if viewing own profile
    const currentUser = getUser();
    isOwnProfile = currentUser && currentUser.username === profileUsername;

    // Update page title
    document.getElementById('profile-title').textContent = isOwnProfile ? '我的资料' : `${profileUsername} 的资料`;
    document.getElementById('profile-subtitle').textContent = isOwnProfile ? '管理你的个人信息' : '查看用户信息';

    // Load profile data
    await loadProfile();
}

/**
 * Load profile from API
 */
async function loadProfile() {
    try {
        const response = await fetch(`/api/auth/profile/${encodeURIComponent(profileUsername)}`);
        const data = await response.json();

        if (!data.success) {
            showNotFound();
            return;
        }

        profileData = data.data;
        renderViewMode();
        showContent();

        // Show appropriate button based on profile ownership
        if (isOwnProfile) {
            editProfileBtn.style.display = 'block';
            viewThreadsBtn.style.display = 'block';
            viewThreadsBtn.href = `threads-user.html?user=${encodeURIComponent(profileUsername)}`;
            viewThreadsBtn.textContent = '我的分享';

            // Show guru link if user is a guru
            if (profileData.is_guru) {
                viewGuruBtn.style.display = 'block';
                viewGuruBtn.href = `guru-detail.html?user=${encodeURIComponent(profileUsername)}`;
                viewGuruBtn.textContent = '明星主页';
            } else {
                viewGuruBtn.style.display = 'none';
            }
        } else {
            editProfileBtn.style.display = 'none';
            viewThreadsBtn.style.display = 'block';
            viewThreadsBtn.href = `threads-user.html?user=${encodeURIComponent(profileUsername)}`;
            viewThreadsBtn.textContent = 'TA的分享';

            // Show guru link if user is a guru
            if (profileData.is_guru) {
                viewGuruBtn.style.display = 'block';
                viewGuruBtn.href = `guru-detail.html?user=${encodeURIComponent(profileUsername)}`;
                viewGuruBtn.textContent = '明星主页';
            } else {
                viewGuruBtn.style.display = 'none';
            }
        }

    } catch (error) {
        console.error('Error loading profile:', error);
        showNotFound();
    }
}

/**
 * Show loading state
 */
function showLoading() {
    profileLoading.style.display = 'block';
    profileNotFound.style.display = 'none';
    profileContent.style.display = 'none';
}

/**
 * Show not found state
 */
function showNotFound() {
    profileLoading.style.display = 'none';
    profileNotFound.style.display = 'block';
    profileContent.style.display = 'none';
}

/**
 * Show content
 */
function showContent() {
    profileLoading.style.display = 'none';
    profileNotFound.style.display = 'none';
    profileContent.style.display = 'block';
}

/**
 * Render view mode with profile data
 */
function renderViewMode() {
    if (!profileData) return;

    // Avatar letter
    const letter = profileData.username.charAt(0).toUpperCase();
    document.getElementById('avatar-letter').textContent = letter;
    document.getElementById('edit-avatar-letter').textContent = letter;

    // Username
    document.getElementById('display-username').textContent = profileData.username;
    document.getElementById('edit-username').textContent = profileData.username;

    // Join date - uses shared CST formatting from main.js
    document.getElementById('display-join-date').textContent = `加入于 ${formatCSTDateSimple(profileData.created_at)}`;

    // Communities (with sub-community info)
    const communitiesEl = document.getElementById('display-communities');
    if (profileData.communities && profileData.communities.length > 0) {
        communitiesEl.innerHTML = profileData.communities.map(c => {
            // Build URL with stage/type parameters
            let href = `community-detail.html?id=${c.id}`;
            if (c.stage) href += `&stage=${encodeURIComponent(c.stage)}`;
            if (c.type) href += `&type=${encodeURIComponent(c.type)}`;

            // Use displayPath if available, otherwise just the name
            const displayText = c.displayPath || c.name;
            return `<a href="${href}" class="profile-tag community-tag">${escapeHtml(displayText)}</a>`;
        }).join('');
    } else {
        communitiesEl.innerHTML = '<span class="empty-hint">暂未加入任何社区</span>';
    }

    // Disease history - make community-based items clickable, show duration
    const diseaseTagsEl = document.getElementById('display-disease-tags');
    if (profileData.disease_history && profileData.disease_history.length > 0) {
        diseaseTagsEl.innerHTML = profileData.disease_history.map(item => {
            const duration = calculateDuration(item.onset_date);
            const durationText = duration ? `（${duration}）` : '';
            if (item.community_id) {
                // Community-based - make it a link
                let href = `community-detail.html?id=${item.community_id}`;
                if (item.stage) href += `&stage=${encodeURIComponent(item.stage)}`;
                if (item.type) href += `&type=${encodeURIComponent(item.type)}`;
                return `<a href="${href}" class="profile-tag disease-tag">${escapeHtml(item.disease)}${durationText}</a>`;
            } else {
                // Free-text - just a span
                return `<span class="profile-tag disease-tag">${escapeHtml(item.disease)}${durationText}</span>`;
            }
        }).join('');
    } else {
        diseaseTagsEl.innerHTML = '<span class="empty-hint">暂未添加</span>';
    }

    // Personal info
    document.getElementById('display-gender').textContent = profileData.gender || '未设置';
    document.getElementById('display-age').textContent = profileData.age ? `${profileData.age}岁` : '未设置';
    document.getElementById('display-profession').textContent = profileData.profession || '未设置';
    document.getElementById('display-marriage').textContent = profileData.marriage_status || '未设置';

    // Location info
    document.getElementById('display-location-from').textContent = profileData.location_from || '未设置';
    document.getElementById('display-location-living').textContent = profileData.location_living || '未设置';
    document.getElementById('display-location-district').textContent = profileData.location_living_district || '未设置';
    document.getElementById('display-location-street').textContent = profileData.location_living_street || '未设置';
    document.getElementById('display-hukou').textContent = profileData.hukou || '未设置';

    // Family & economic info
    document.getElementById('display-education').textContent = profileData.education || '未设置';
    document.getElementById('display-family-size').textContent = profileData.family_size ? `${profileData.family_size}人` : '未设置';
    document.getElementById('display-income-individual').textContent = profileData.income_individual || '未设置';
    document.getElementById('display-income-family').textContent = profileData.income_family || '未设置';
    document.getElementById('display-consumption-level').textContent = profileData.consumption_level || '未设置';
    document.getElementById('display-housing-status').textContent = profileData.housing_status || '未设置';
    document.getElementById('display-economic-dependency').textContent = profileData.economic_dependency || '未设置';

    // Hospitals
    const hospitalsEl = document.getElementById('display-hospitals');
    if (profileData.hospitals && profileData.hospitals.length > 0) {
        hospitalsEl.innerHTML = profileData.hospitals.map(h =>
            `<span class="profile-tag hospital-tag">${escapeHtml(h)}</span>`
        ).join('');
    } else {
        hospitalsEl.innerHTML = '<span class="empty-hint">暂未添加</span>';
    }
}

/**
 * Load all communities for disease selector
 */
async function loadAllCommunities() {
    try {
        const response = await fetch('/api/communities');
        const data = await response.json();
        if (data.success) {
            allCommunities = data.data;
        }
    } catch (error) {
        console.error('Error loading communities:', error);
    }
}

/**
 * Enter edit mode
 */
async function enterEditMode() {
    if (!isOwnProfile || !profileData) return;

    // Load communities if not already loaded
    if (allCommunities.length === 0) {
        await loadAllCommunities();
    }

    // Build set of user's Level I community IDs
    userCommunityIds = new Set();
    if (profileData.communities) {
        profileData.communities.forEach(c => {
            if (!c.stage && !c.type) {
                userCommunityIds.add(c.id);
            }
        });
    }

    // Populate form fields - Personal info
    document.getElementById('edit-gender').value = profileData.gender || '';
    document.getElementById('edit-age').value = profileData.age || '';
    document.getElementById('edit-profession').value = profileData.profession || '';
    document.getElementById('edit-marriage').value = profileData.marriage_status || '';

    // Location info
    document.getElementById('edit-location-from').value = profileData.location_from || '';
    document.getElementById('edit-location-living').value = profileData.location_living || '';
    document.getElementById('edit-location-district').value = profileData.location_living_district || '';
    document.getElementById('edit-location-street').value = profileData.location_living_street || '';
    document.getElementById('edit-hukou').value = profileData.hukou || '';

    // Family & economic info
    document.getElementById('edit-education').value = profileData.education || '';
    document.getElementById('edit-family-size').value = profileData.family_size || '';
    document.getElementById('edit-income-individual').value = profileData.income_individual || '';
    document.getElementById('edit-income-family').value = profileData.income_family || '';
    document.getElementById('edit-consumption-level').value = profileData.consumption_level || '';
    document.getElementById('edit-housing-status').value = profileData.housing_status || '';
    document.getElementById('edit-economic-dependency').value = profileData.economic_dependency || '';

    // Initialize disease history and hospital tags
    diseaseHistory = profileData.disease_history ? profileData.disease_history.map(item => ({
        community_id: item.community_id,
        stage: item.stage || '',
        type: item.type || '',
        disease: item.disease,
        onset_date: item.onset_date || null
    })) : [];
    hospitalTags = profileData.hospitals ? [...profileData.hospitals] : [];

    // Render disease selector and hospital tags
    renderDiseaseSelector();
    renderSelectedDiseases();
    renderHospitalTags();

    // Switch to edit mode
    viewMode.style.display = 'none';
    editMode.style.display = 'block';
    profileError.textContent = '';
}

/**
 * Exit edit mode
 */
function exitEditMode() {
    viewMode.style.display = 'block';
    editMode.style.display = 'none';
    profileError.textContent = '';
}

/**
 * Build display path for disease item
 */
function buildDiseaseDisplayPath(communityName, stage, type) {
    let path = communityName;
    if (stage && type) {
        path += ` > ${stage} · ${type}`;
    } else if (stage) {
        path += ` > ${stage}`;
    } else if (type) {
        path += ` > ${type}`;
    }
    return path;
}

/**
 * Check if a disease is already selected
 */
function isDiseaseSelected(communityId, stage, type, disease) {
    return diseaseHistory.some(item =>
        item.community_id === communityId &&
        (item.stage || '') === (stage || '') &&
        (item.type || '') === (type || '') &&
        item.disease === disease
    );
}

/**
 * Generate unique ID for checkbox
 */
function generateCheckboxId(communityId, stage, type) {
    return `disease-cb-${communityId}-${stage || 'none'}-${type || 'none'}`;
}

/**
 * Render disease selector with communities
 */
function renderDiseaseSelector() {
    const container = document.getElementById('disease-community-list');
    if (!container) return;

    // Sort communities: joined first, then by name
    const sortedCommunities = [...allCommunities].sort((a, b) => {
        const aJoined = userCommunityIds.has(a.id);
        const bJoined = userCommunityIds.has(b.id);
        if (aJoined && !bJoined) return -1;
        if (!aJoined && bJoined) return 1;
        return a.name.localeCompare(b.name, 'zh');
    });

    let html = '';

    for (const community of sortedCommunities) {
        const isJoined = userCommunityIds.has(community.id);
        const joinedBadge = isJoined ? '<span class="disease-joined-badge">已加入</span>' : '';
        const dimensions = community.dimensions ? JSON.parse(community.dimensions) : null;

        if (!dimensions || (!dimensions.stage && !dimensions.type)) {
            // No dimensions - simple checkbox
            const checkboxId = generateCheckboxId(community.id, '', '');
            const isChecked = isDiseaseSelected(community.id, '', '', community.name);
            html += `
                <div class="disease-community-item">
                    <div class="disease-checkbox-row">
                        <input type="checkbox" id="${checkboxId}"
                               data-community-id="${community.id}"
                               data-stage="" data-type=""
                               data-disease="${escapeHtml(community.name)}"
                               ${isChecked ? 'checked' : ''}>
                        <label for="${checkboxId}">${escapeHtml(community.name)}</label>
                        ${joinedBadge}
                    </div>
                </div>
            `;
        } else {
            // Has dimensions - expandable
            html += `
                <div class="disease-community-expandable" data-community-id="${community.id}">
                    <div class="disease-community-header">
                        <span class="disease-expand-icon">▶</span>
                        <span class="disease-community-name">${escapeHtml(community.name)}</span>
                        ${joinedBadge}
                    </div>
                    <div class="disease-community-content">
            `;

            // Level I option (base community only)
            const levelIId = generateCheckboxId(community.id, '', '');
            const levelIChecked = isDiseaseSelected(community.id, '', '', community.name);
            html += `
                <div class="disease-checkbox-row">
                    <input type="checkbox" id="${levelIId}"
                           data-community-id="${community.id}"
                           data-stage="" data-type=""
                           data-disease="${escapeHtml(community.name)}"
                           ${levelIChecked ? 'checked' : ''}>
                    <label for="${levelIId}">${escapeHtml(community.name)} (仅大类)</label>
                </div>
            `;

            // Get stage and type values
            const stages = dimensions.stage?.values || [];
            const types = dimensions.type?.values || [];

            // Stage dimension section (if available)
            if (stages.length > 0) {
                html += `
                    <div class="disease-dimension-group">
                        <div class="disease-dimension-header">
                            <span class="disease-expand-icon">▶</span>
                            <span class="disease-dimension-label">${escapeHtml(dimensions.stage?.label || '阶段')}</span>
                        </div>
                        <div class="disease-dimension-content">
                `;
                for (const stage of stages) {
                    const stageId = generateCheckboxId(community.id, stage, '');
                    const stageDisease = `${community.name} > ${stage}`;
                    const stageChecked = isDiseaseSelected(community.id, stage, '', stageDisease);
                    html += `
                        <div class="disease-checkbox-row">
                            <input type="checkbox" id="${stageId}"
                                   data-community-id="${community.id}"
                                   data-stage="${escapeHtml(stage)}" data-type=""
                                   data-disease="${escapeHtml(stageDisease)}"
                                   ${stageChecked ? 'checked' : ''}>
                            <label for="${stageId}">${escapeHtml(stage)}</label>
                        </div>
                    `;
                }
                html += `
                        </div>
                    </div>
                `;
            }

            // Type dimension section (if available)
            if (types.length > 0) {
                html += `
                    <div class="disease-dimension-group">
                        <div class="disease-dimension-header">
                            <span class="disease-expand-icon">▶</span>
                            <span class="disease-dimension-label">${escapeHtml(dimensions.type?.label || '类型')}</span>
                        </div>
                        <div class="disease-dimension-content">
                `;
                for (const type of types) {
                    const typeId = generateCheckboxId(community.id, '', type);
                    const typeDisease = `${community.name} > ${type}`;
                    const typeChecked = isDiseaseSelected(community.id, '', type, typeDisease);
                    html += `
                        <div class="disease-checkbox-row">
                            <input type="checkbox" id="${typeId}"
                                   data-community-id="${community.id}"
                                   data-stage="" data-type="${escapeHtml(type)}"
                                   data-disease="${escapeHtml(typeDisease)}"
                                   ${typeChecked ? 'checked' : ''}>
                            <label for="${typeId}">${escapeHtml(type)}</label>
                        </div>
                    `;
                }
                html += `
                        </div>
                    </div>
                `;
            }

            // Combined section (if both dimensions exist)
            if (stages.length > 0 && types.length > 0) {
                html += `
                    <div class="disease-dimension-group">
                        <div class="disease-dimension-header">
                            <span class="disease-expand-icon">▶</span>
                            <span class="disease-dimension-label">组合选择</span>
                        </div>
                        <div class="disease-dimension-content">
                `;
                for (const stage of stages) {
                    for (const type of types) {
                        const comboId = generateCheckboxId(community.id, stage, type);
                        const comboDisease = `${community.name} > ${stage} · ${type}`;
                        const comboChecked = isDiseaseSelected(community.id, stage, type, comboDisease);
                        html += `
                            <div class="disease-checkbox-row">
                                <input type="checkbox" id="${comboId}"
                                       data-community-id="${community.id}"
                                       data-stage="${escapeHtml(stage)}" data-type="${escapeHtml(type)}"
                                       data-disease="${escapeHtml(comboDisease)}"
                                       ${comboChecked ? 'checked' : ''}>
                                <label for="${comboId}">${escapeHtml(stage)} · ${escapeHtml(type)}</label>
                            </div>
                        `;
                    }
                }
                html += `
                        </div>
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        }
    }

    container.innerHTML = html;

    // Add event listeners for expandable headers
    container.querySelectorAll('.disease-community-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('expanded');
        });
    });

    container.querySelectorAll('.disease-dimension-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('expanded');
        });
    });

    // Add event listeners for checkboxes
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleDiseaseCheckboxChange);
    });
}

/**
 * Calculate duration string from onset_date
 * Returns format like "3年" or "2月" or "1年3月"
 */
function calculateDuration(onsetDate) {
    if (!onsetDate) return null;

    const [year, month] = onsetDate.split('-').map(Number);
    if (!year || !month) return null;

    const onset = new Date(year, month - 1, 1);
    const now = new Date();

    let months = (now.getFullYear() - onset.getFullYear()) * 12 + (now.getMonth() - onset.getMonth());
    if (months < 0) months = 0;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years >= 1) {
        if (remainingMonths === 0) {
            return `${years}年`;
        } else {
            return `${years}年${remainingMonths}月`;
        }
    } else if (months === 0) {
        return '刚确诊';
    } else {
        return `${months}月`;
    }
}

/**
 * Generate year options for onset date (last 30 years)
 */
function generateYearOptions() {
    const currentYear = new Date().getFullYear();
    let options = '<option value="">年</option>';
    for (let year = currentYear; year >= currentYear - 30; year--) {
        options += `<option value="${year}">${year}</option>`;
    }
    return options;
}

/**
 * Generate month options
 */
function generateMonthOptions() {
    let options = '<option value="">月</option>';
    for (let month = 1; month <= 12; month++) {
        options += `<option value="${String(month).padStart(2, '0')}">${month}</option>`;
    }
    return options;
}

/**
 * Show inline onset date picker below checkbox
 */
function showOnsetDatePicker(checkbox) {
    // Remove any existing picker
    hideOnsetDatePicker();

    pendingDiseaseCheckbox = checkbox;
    const row = checkbox.closest('.disease-checkbox-row');

    const picker = document.createElement('div');
    picker.className = 'onset-date-picker';
    picker.innerHTML = `
        <span class="onset-date-label">确诊时间:</span>
        <select class="onset-year">${generateYearOptions()}</select>
        <span>年</span>
        <select class="onset-month">${generateMonthOptions()}</select>
        <span>月</span>
        <button type="button" class="onset-confirm-btn">确认</button>
        <button type="button" class="onset-cancel-btn">取消</button>
    `;

    row.insertAdjacentElement('afterend', picker);

    // Add event listeners
    picker.querySelector('.onset-confirm-btn').addEventListener('click', confirmOnsetDate);
    picker.querySelector('.onset-cancel-btn').addEventListener('click', cancelOnsetDate);
}

/**
 * Hide onset date picker
 */
function hideOnsetDatePicker() {
    const existingPicker = document.querySelector('.onset-date-picker');
    if (existingPicker) {
        existingPicker.remove();
    }
    pendingDiseaseCheckbox = null;
}

/**
 * Confirm onset date and add disease
 */
function confirmOnsetDate() {
    if (!pendingDiseaseCheckbox) return;

    const picker = document.querySelector('.onset-date-picker');
    const year = picker.querySelector('.onset-year').value;
    const month = picker.querySelector('.onset-month').value;

    let onsetDate = null;
    if (year && month) {
        onsetDate = `${year}-${month}`;
    }

    const checkbox = pendingDiseaseCheckbox;
    const communityId = parseInt(checkbox.dataset.communityId, 10);
    const stage = checkbox.dataset.stage || '';
    const type = checkbox.dataset.type || '';
    const disease = checkbox.dataset.disease;

    // Add to disease history
    if (!isDiseaseSelected(communityId, stage, type, disease)) {
        diseaseHistory.push({
            community_id: communityId,
            stage: stage,
            type: type,
            disease: disease,
            onset_date: onsetDate
        });
    }

    hideOnsetDatePicker();
    renderSelectedDiseases();
}

/**
 * Cancel onset date input
 */
function cancelOnsetDate() {
    if (pendingDiseaseCheckbox) {
        pendingDiseaseCheckbox.checked = false;
    }
    hideOnsetDatePicker();
}

/**
 * Handle disease checkbox change
 */
function handleDiseaseCheckboxChange(e) {
    const checkbox = e.target;
    const communityId = parseInt(checkbox.dataset.communityId, 10);
    const stage = checkbox.dataset.stage || '';
    const type = checkbox.dataset.type || '';
    const disease = checkbox.dataset.disease;

    if (checkbox.checked) {
        // Show onset date picker instead of immediately adding
        if (!isDiseaseSelected(communityId, stage, type, disease)) {
            showOnsetDatePicker(checkbox);
        }
    } else {
        // Remove from disease history
        diseaseHistory = diseaseHistory.filter(item =>
            !(item.community_id === communityId &&
              (item.stage || '') === stage &&
              (item.type || '') === type &&
              item.disease === disease)
        );
        renderSelectedDiseases();
    }
}

/**
 * Render selected diseases
 */
function renderSelectedDiseases() {
    const container = document.getElementById('disease-selected-tags');
    if (!container) return;

    if (diseaseHistory.length === 0) {
        container.innerHTML = '<span class="empty-hint">暂未选择</span>';
        return;
    }

    container.innerHTML = diseaseHistory.map((item, index) => {
        const duration = calculateDuration(item.onset_date);
        const durationText = duration ? `（${duration}）` : '';
        return `
            <span class="disease-selected-tag">
                <span class="tag-path">${escapeHtml(item.disease)}${durationText}</span>
                <button type="button" class="tag-remove" data-index="${index}">&times;</button>
            </span>
        `;
    }).join('');

    // Add remove handlers
    container.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            const removed = diseaseHistory[index];
            diseaseHistory.splice(index, 1);

            // Uncheck the corresponding checkbox if it exists
            if (removed.community_id) {
                const checkboxId = generateCheckboxId(removed.community_id, removed.stage, removed.type);
                const checkbox = document.getElementById(checkboxId);
                if (checkbox) checkbox.checked = false;
            }

            renderSelectedDiseases();
        });
    });
}

/**
 * Add free-text disease - shows onset date picker first
 */
function addFreetextDisease() {
    const input = document.getElementById('disease-freetext-input');
    if (!input) return;

    const value = input.value.trim();
    if (!value) return;

    // Check if already exists (as free-text)
    const exists = diseaseHistory.some(item =>
        !item.community_id && item.disease === value
    );

    if (exists) {
        input.value = '';
        return;
    }

    // Store the pending free-text disease and show the picker
    pendingFreetextDisease = value;
    showFreetextOnsetDatePicker();
}

// Variable to store pending free-text disease
let pendingFreetextDisease = null;

/**
 * Show onset date picker for free-text disease
 */
function showFreetextOnsetDatePicker() {
    // Remove any existing picker
    hideOnsetDatePicker();

    const freetextContainer = document.querySelector('.disease-freetext');

    const picker = document.createElement('div');
    picker.className = 'onset-date-picker';
    picker.innerHTML = `
        <span class="onset-date-label">确诊时间:</span>
        <select class="onset-year">${generateYearOptions()}</select>
        <span>年</span>
        <select class="onset-month">${generateMonthOptions()}</select>
        <span>月</span>
        <button type="button" class="onset-confirm-btn">确认</button>
        <button type="button" class="onset-cancel-btn">取消</button>
    `;

    freetextContainer.appendChild(picker);

    // Add event listeners
    picker.querySelector('.onset-confirm-btn').addEventListener('click', confirmFreetextOnsetDate);
    picker.querySelector('.onset-cancel-btn').addEventListener('click', cancelFreetextOnsetDate);
}

/**
 * Confirm onset date for free-text disease
 */
function confirmFreetextOnsetDate() {
    if (!pendingFreetextDisease) return;

    const picker = document.querySelector('.onset-date-picker');
    const year = picker.querySelector('.onset-year').value;
    const month = picker.querySelector('.onset-month').value;

    let onsetDate = null;
    if (year && month) {
        onsetDate = `${year}-${month}`;
    }

    // Add to disease history
    diseaseHistory.push({
        community_id: null,
        stage: '',
        type: '',
        disease: pendingFreetextDisease,
        onset_date: onsetDate
    });

    // Clear input and picker
    const input = document.getElementById('disease-freetext-input');
    if (input) input.value = '';
    pendingFreetextDisease = null;
    hideOnsetDatePicker();
    renderSelectedDiseases();
}

/**
 * Cancel free-text onset date input
 */
function cancelFreetextOnsetDate() {
    pendingFreetextDisease = null;
    hideOnsetDatePicker();
}

/**
 * Render hospital tags in edit mode
 */
function renderHospitalTags() {
    const container = document.getElementById('hospitals-tags-display');
    if (!container) return;

    container.innerHTML = hospitalTags.map((tag, index) =>
        `<span class="edit-tag">${escapeHtml(tag)}<button type="button" class="tag-remove" data-index="${index}">&times;</button></span>`
    ).join('');

    // Add click handlers for remove buttons
    container.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            hospitalTags.splice(index, 1);
            renderHospitalTags();
        });
    });
}

// Tag limits (should match server config)
const TAG_LIMITS = {
    DISEASE_TAG_MAX: 50,
    HOSPITAL_NAME_MAX: 100,
    MAX_DISEASE_TAGS: 20,
    MAX_HOSPITALS: 10
};

/**
 * Add hospital tag from input
 */
function addHospitalFromInput(input) {
    const value = input.value.trim();
    if (!value) return;

    // Split by comma or Chinese comma
    const newTags = value.split(/[,，]/).map(t => t.trim()).filter(t => t);

    for (const tag of newTags) {
        // Check max count
        if (hospitalTags.length >= TAG_LIMITS.MAX_HOSPITALS) {
            alert(`最多只能添加${TAG_LIMITS.MAX_HOSPITALS}个医院`);
            break;
        }
        // Check max length
        if (tag.length > TAG_LIMITS.HOSPITAL_NAME_MAX) {
            alert(`医院名称"${tag.substring(0, 10)}..."超过${TAG_LIMITS.HOSPITAL_NAME_MAX}个字符限制`);
            continue;
        }
        if (!hospitalTags.includes(tag)) {
            hospitalTags.push(tag);
        }
    }

    input.value = '';
    renderHospitalTags();
}

/**
 * Handle profile form submit
 */
async function handleProfileSubmit(e) {
    e.preventDefault();

    if (!getUser()) {
        profileError.textContent = '请先登录';
        return;
    }

    const formData = {
        // Personal info
        gender: document.getElementById('edit-gender').value,
        age: document.getElementById('edit-age').value,
        profession: document.getElementById('edit-profession').value,
        marriage_status: document.getElementById('edit-marriage').value,
        // Location info
        location_from: document.getElementById('edit-location-from').value,
        location_living: document.getElementById('edit-location-living').value,
        location_living_district: document.getElementById('edit-location-district').value,
        location_living_street: document.getElementById('edit-location-street').value,
        hukou: document.getElementById('edit-hukou').value,
        // Family & economic info
        education: document.getElementById('edit-education').value,
        family_size: document.getElementById('edit-family-size').value,
        income_individual: document.getElementById('edit-income-individual').value,
        income_family: document.getElementById('edit-income-family').value,
        consumption_level: document.getElementById('edit-consumption-level').value,
        housing_status: document.getElementById('edit-housing-status').value,
        economic_dependency: document.getElementById('edit-economic-dependency').value,
        // Health info
        disease_history: diseaseHistory,
        hospitals: hospitalTags
    };

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            profileData = data.data;
            renderViewMode();
            exitEditMode();
        } else {
            profileError.textContent = data.error || '保存失败';
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        profileError.textContent = '网络错误，请稍后再试';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initProfile();
});

// Edit button
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', enterEditMode);
}

// Cancel button
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', exitEditMode);
}

// Form submit
if (profileForm) {
    profileForm.addEventListener('submit', handleProfileSubmit);
}

// Free-text disease input
const diseaseFreetextInput = document.getElementById('disease-freetext-input');
const diseaseFreetextAdd = document.getElementById('disease-freetext-add');

if (diseaseFreetextInput) {
    diseaseFreetextInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addFreetextDisease();
        }
    });
}

if (diseaseFreetextAdd) {
    diseaseFreetextAdd.addEventListener('click', addFreetextDisease);
}

// Hospitals input
const hospitalsInput = document.getElementById('hospitals-input');
if (hospitalsInput) {
    hospitalsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addHospitalFromInput(hospitalsInput);
        }
    });
    hospitalsInput.addEventListener('blur', () => {
        addHospitalFromInput(hospitalsInput);
    });
}
