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
let diseaseTags = [];
let hospitalTags = [];

// DOM Elements
const profileLoading = document.getElementById('profile-loading');
const profileNotFound = document.getElementById('profile-not-found');
const profileContent = document.getElementById('profile-content');
const viewMode = document.getElementById('view-mode');
const editMode = document.getElementById('edit-mode');
const editProfileBtn = document.getElementById('edit-profile-btn');
const viewThreadsBtn = document.getElementById('view-threads-btn');
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
            viewThreadsBtn.style.display = 'none';
        } else {
            editProfileBtn.style.display = 'none';
            viewThreadsBtn.style.display = 'block';
            viewThreadsBtn.href = `threads-user.html?user=${encodeURIComponent(profileUsername)}`;
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

    // Join date
    const joinDate = new Date(profileData.created_at);
    document.getElementById('display-join-date').textContent = `加入于 ${joinDate.toLocaleDateString('zh-CN')}`;

    // Communities
    const communitiesEl = document.getElementById('display-communities');
    if (profileData.communities && profileData.communities.length > 0) {
        communitiesEl.innerHTML = profileData.communities.map(c =>
            `<a href="community-detail.html?id=${c.id}" class="profile-tag community-tag">${c.name}</a>`
        ).join('');
    } else {
        communitiesEl.innerHTML = '<span class="empty-hint">暂未加入任何社区</span>';
    }

    // Disease tags
    const diseaseTagsEl = document.getElementById('display-disease-tags');
    if (profileData.disease_tags && profileData.disease_tags.length > 0) {
        diseaseTagsEl.innerHTML = profileData.disease_tags.map(tag =>
            `<span class="profile-tag disease-tag">${tag}</span>`
        ).join('');
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
            `<span class="profile-tag hospital-tag">${h}</span>`
        ).join('');
    } else {
        hospitalsEl.innerHTML = '<span class="empty-hint">暂未添加</span>';
    }
}

/**
 * Enter edit mode
 */
function enterEditMode() {
    if (!isOwnProfile || !profileData) return;

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

    // Initialize tags
    diseaseTags = profileData.disease_tags ? [...profileData.disease_tags] : [];
    hospitalTags = profileData.hospitals ? [...profileData.hospitals] : [];
    renderTags();

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
 * Render tags in edit mode
 */
function renderTags() {
    // Disease tags
    const diseaseDisplay = document.getElementById('disease-tags-display');
    diseaseDisplay.innerHTML = diseaseTags.map((tag, index) =>
        `<span class="edit-tag">${tag}<button type="button" class="tag-remove" data-type="disease" data-index="${index}">&times;</button></span>`
    ).join('');

    // Hospital tags
    const hospitalsDisplay = document.getElementById('hospitals-tags-display');
    hospitalsDisplay.innerHTML = hospitalTags.map((tag, index) =>
        `<span class="edit-tag">${tag}<button type="button" class="tag-remove" data-type="hospital" data-index="${index}">&times;</button></span>`
    ).join('');

    // Add click handlers for remove buttons
    document.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            const index = parseInt(e.target.dataset.index);
            if (type === 'disease') {
                diseaseTags.splice(index, 1);
            } else {
                hospitalTags.splice(index, 1);
            }
            renderTags();
        });
    });
}

/**
 * Add tag from input
 */
function addTagFromInput(input, tagsArray, renderFn) {
    const value = input.value.trim();
    if (!value) return;

    // Split by comma or Chinese comma
    const newTags = value.split(/[,，]/).map(t => t.trim()).filter(t => t);

    for (const tag of newTags) {
        if (!tagsArray.includes(tag)) {
            tagsArray.push(tag);
        }
    }

    input.value = '';
    renderFn();
}

/**
 * Handle profile form submit
 */
async function handleProfileSubmit(e) {
    e.preventDefault();

    const token = getToken();
    if (!token) {
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
        disease_tags: diseaseTags,
        hospitals: hospitalTags
    };

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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

// Disease tags input
const diseaseTagsInput = document.getElementById('disease-tags-input');
if (diseaseTagsInput) {
    diseaseTagsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTagFromInput(diseaseTagsInput, diseaseTags, renderTags);
        }
    });
    diseaseTagsInput.addEventListener('blur', () => {
        addTagFromInput(diseaseTagsInput, diseaseTags, renderTags);
    });
}

// Hospitals input
const hospitalsInput = document.getElementById('hospitals-input');
if (hospitalsInput) {
    hospitalsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTagFromInput(hospitalsInput, hospitalTags, renderTags);
        }
    });
    hospitalsInput.addEventListener('blur', () => {
        addTagFromInput(hospitalsInput, hospitalTags, renderTags);
    });
}
