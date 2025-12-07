/**
 * Shares Page JavaScript
 * Handles viewing and managing threads/shares
 * Supports viewing own threads or other users' threads (read-only)
 */

// Get username from URL (if viewing other user's threads)
const urlParams = new URLSearchParams(window.location.search);
const viewUsername = urlParams.get('user');

// State
let isOwnPage = false;
let viewingUser = null;
let userCommunities = []; // User's joined communities for selectors
let userDiseases = []; // User's disease history for selectors
let threadSelectedDiseases = []; // Selected diseases for new thread
let threadSelectedCommunities = []; // Selected communities for new thread
let editSelectedDiseases = []; // Selected diseases for edit
let editSelectedCommunities = []; // Selected communities for edit

// DOM Elements
const loginRequired = document.getElementById('login-required');
const sharesContent = document.getElementById('shares-content');
const threadsList = document.getElementById('threads-list');
const noThreads = document.getElementById('no-threads');
const newShareBtn = document.getElementById('new-share-btn');
const promptLoginBtn = document.getElementById('prompt-login-btn');
const pageTitle = document.getElementById('page-title');

// Thread Modal Elements
const threadModal = document.getElementById('thread-modal');
const threadModalClose = document.getElementById('thread-modal-close');
const threadForm = document.getElementById('thread-form');
const threadError = document.getElementById('thread-error');

// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const editModalClose = document.getElementById('edit-modal-close');
const editForm = document.getElementById('edit-form');
const editError = document.getElementById('edit-error');

// API Base
const THREADS_API = '/api/threads';
const COMMUNITIES_API = '/api/communities';

/**
 * Check if user is logged in and update UI
 */
function checkLoginState() {
    const currentUser = getUser();

    if (!currentUser) {
        // Not logged in - show login prompt
        loginRequired.style.display = 'block';
        sharesContent.style.display = 'none';
        return;
    }

    // Determine if viewing own page or another user's page
    if (viewUsername) {
        // Viewing a specific user's threads
        isOwnPage = currentUser && currentUser.username === viewUsername;
        viewingUser = viewUsername;
    } else {
        // No user specified - show current user's threads
        isOwnPage = true;
        viewingUser = currentUser ? currentUser.username : null;
    }

    // Update page title
    if (isOwnPage) {
        pageTitle.textContent = '我的分享';
        document.title = '我的分享 - 像我一样';
    } else {
        pageTitle.innerHTML = `<a href="profile.html?user=${encodeURIComponent(viewingUser)}" class="username-link">${escapeHtml(viewingUser)}</a> 的分享`;
        document.title = `${viewingUser} 的分享 - 像我一样`;
    }

    // Show/hide new share button based on ownership
    if (newShareBtn) {
        newShareBtn.style.display = isOwnPage ? 'block' : 'none';
    }

    loginRequired.style.display = 'none';
    sharesContent.style.display = 'block';
    loadThreads();

    // Only load user data for own page (for create/edit forms)
    if (isOwnPage) {
        loadUserData();
    }
}

/**
 * Load user's joined communities and disease history for the selectors
 */
async function loadUserData() {
    try {
        // Load user's joined communities and disease history in parallel
        const [communitiesRes, diseasesRes] = await Promise.all([
            fetch('/api/user/communities?details=true', { credentials: 'include' }),
            fetch('/api/user/diseases', { credentials: 'include' })
        ]);

        const communitiesData = await communitiesRes.json();
        const diseasesData = await diseasesRes.json();

        if (communitiesData.success) {
            userCommunities = communitiesData.data;
        }

        if (diseasesData.success) {
            userDiseases = diseasesData.data;
        }

        // Initialize the selectors
        initDiseaseSelector('thread');
        initCommunitySelector('thread');
        initDiseaseSelector('edit');
        initCommunitySelector('edit');
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

/**
 * Initialize disease selector for a form (thread or edit)
 */
function initDiseaseSelector(prefix) {
    const listEl = document.getElementById(`${prefix}-disease-list`);
    const triggerEl = document.getElementById(`${prefix}-disease-trigger`);
    const selectorEl = document.getElementById(`${prefix}-disease-selector`);

    if (!listEl) return;

    // Render disease list from user's disease history
    renderDiseaseList(listEl, prefix);

    // Toggle dropdown
    triggerEl.addEventListener('click', () => {
        selectorEl.classList.toggle('open');
    });
}

/**
 * Generate unique checkbox ID for disease in threads
 */
function generateThreadDiseaseCheckboxId(prefix, index) {
    return `${prefix}-disease-cb-${index}`;
}

/**
 * Check if a disease is already selected in threads
 */
function isDiseaseSelectedInThreads(prefix, communityId, stage, type, disease) {
    const selectedList = prefix === 'thread' ? threadSelectedDiseases : editSelectedDiseases;
    return selectedList.some(d =>
        d.community_id === communityId &&
        (d.stage || '') === (stage || '') &&
        (d.type || '') === (type || '') &&
        d.disease === disease
    );
}

/**
 * Render disease list from user's disease history
 */
function renderDiseaseList(listEl, prefix) {
    if (userDiseases.length === 0) {
        listEl.innerHTML = `
            <div class="empty-list-hint">
                <p>你还没有添加任何疾病</p>
                <p><a href="profile.html">去个人资料页添加</a></p>
            </div>
        `;
        return;
    }

    // Render user's diseases as checkboxes
    listEl.innerHTML = userDiseases.map((d, index) => {
        const checkboxId = generateThreadDiseaseCheckboxId(prefix, index);
        const isChecked = isDiseaseSelectedInThreads(prefix, d.community_id, d.stage, d.type, d.disease);
        return `
            <div class="filter-checkbox-row">
                <input type="checkbox" id="${checkboxId}"
                       data-prefix="${prefix}"
                       data-index="${index}"
                       data-community-id="${d.community_id || ''}"
                       data-stage="${d.stage || ''}"
                       data-type="${d.type || ''}"
                       data-disease="${escapeHtml(d.disease)}"
                       ${isChecked ? 'checked' : ''}>
                <label for="${checkboxId}">${escapeHtml(d.disease)}</label>
            </div>
        `;
    }).join('');

    // Add change listeners for checkboxes
    listEl.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleThreadDiseaseCheckboxChange);
    });
}

/**
 * Handle disease checkbox change in threads
 */
function handleThreadDiseaseCheckboxChange(e) {
    const checkbox = e.target;
    const prefix = checkbox.dataset.prefix;
    const communityId = checkbox.dataset.communityId ? parseInt(checkbox.dataset.communityId, 10) : null;
    const stage = checkbox.dataset.stage || '';
    const type = checkbox.dataset.type || '';
    const disease = checkbox.dataset.disease;

    const selectedList = prefix === 'thread' ? threadSelectedDiseases : editSelectedDiseases;

    if (checkbox.checked) {
        // Add to selected diseases
        if (!isDiseaseSelectedInThreads(prefix, communityId, stage, type, disease)) {
            selectedList.push({
                community_id: communityId,
                stage: stage,
                type: type,
                disease: disease
            });
        }
    } else {
        // Remove from selected diseases
        const idx = selectedList.findIndex(d =>
            d.community_id === communityId &&
            (d.stage || '') === stage &&
            (d.type || '') === type &&
            d.disease === disease
        );
        if (idx !== -1) {
            selectedList.splice(idx, 1);
        }
    }

    renderSelectedDiseases(prefix);
    updateDiseaseTriggerText(prefix);
}

/**
 * Render selected disease tags
 */
function renderSelectedDiseases(prefix) {
    const selectedEl = document.getElementById(`${prefix}-disease-selected`);
    const selectedList = prefix === 'thread' ? threadSelectedDiseases : editSelectedDiseases;

    if (!selectedEl) return;

    if (selectedList.length === 0) {
        selectedEl.innerHTML = '';
        return;
    }

    selectedEl.innerHTML = selectedList.map((d, index) =>
        `<span class="disease-filter-tag">
            ${escapeHtml(d.disease)}
            <span class="remove-tag" data-prefix="${prefix}" data-index="${index}">&times;</span>
        </span>`
    ).join('');

    // Add remove listeners
    selectedEl.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pf = e.target.dataset.prefix;
            const index = parseInt(e.target.dataset.index, 10);
            const removed = pf === 'thread' ? threadSelectedDiseases[index] : editSelectedDiseases[index];

            if (pf === 'thread') {
                threadSelectedDiseases.splice(index, 1);
            } else {
                editSelectedDiseases.splice(index, 1);
            }

            // Find and uncheck the corresponding checkbox
            const diseaseIndex = userDiseases.findIndex(d =>
                d.community_id === removed.community_id &&
                (d.stage || '') === (removed.stage || '') &&
                (d.type || '') === (removed.type || '') &&
                d.disease === removed.disease
            );
            if (diseaseIndex !== -1) {
                const checkboxId = generateThreadDiseaseCheckboxId(pf, diseaseIndex);
                const checkbox = document.getElementById(checkboxId);
                if (checkbox) checkbox.checked = false;
            }

            renderSelectedDiseases(pf);
            updateDiseaseTriggerText(pf);
        });
    });
}

/**
 * Update disease trigger text
 */
function updateDiseaseTriggerText(prefix) {
    const triggerEl = document.getElementById(`${prefix}-disease-trigger`);
    const selectedList = prefix === 'thread' ? threadSelectedDiseases : editSelectedDiseases;

    if (!triggerEl) return;
    const span = triggerEl.querySelector('.trigger-text');
    if (selectedList.length === 0) {
        span.textContent = '选择疾病...';
    } else {
        span.textContent = `已选择 ${selectedList.length} 个疾病`;
    }
}

/**
 * Initialize community selector for a form (thread or edit)
 */
function initCommunitySelector(prefix) {
    const listEl = document.getElementById(`${prefix}-community-list`);
    const triggerEl = document.getElementById(`${prefix}-community-trigger`);
    const selectorEl = document.getElementById(`${prefix}-community-selector`);

    if (!listEl) return;

    // Render community list (accordion style)
    renderCommunityList(listEl, prefix);

    // Toggle dropdown
    triggerEl.addEventListener('click', () => {
        selectorEl.classList.toggle('open');
    });
}

/**
 * Generate unique checkbox ID for community in threads
 */
function generateThreadCommunityCheckboxId(prefix, communityId, stage, type) {
    return `${prefix}-community-cb-${communityId}-${stage || 'none'}-${type || 'none'}`;
}

/**
 * Check if a community is already selected in threads
 */
function isCommunitySelectedInThreads(prefix, communityId, stage, type) {
    const selectedList = prefix === 'thread' ? threadSelectedCommunities : editSelectedCommunities;
    return selectedList.some(c =>
        c.id === communityId &&
        (c.stage || '') === (stage || '') &&
        (c.type || '') === (type || '')
    );
}

/**
 * Render community list from user's joined communities
 */
function renderCommunityList(listEl, prefix) {
    if (userCommunities.length === 0) {
        listEl.innerHTML = `
            <div class="empty-list-hint">
                <p>你还没有加入任何社区</p>
                <p><a href="community.html">去社区页面加入</a></p>
            </div>
        `;
        return;
    }

    // Render user's joined communities with accordion for dimensions
    listEl.innerHTML = userCommunities.map(c => {
        const dimensions = c.dimensions ? JSON.parse(c.dimensions) : null;
        const hasDimensions = dimensions && (dimensions.stage || dimensions.type);

        if (hasDimensions) {
            // Community with dimensions - show accordion with nested options
            let contentHtml = '<div class="community-filter-item-content">';

            // Add Level I option (base community)
            const levelIId = generateThreadCommunityCheckboxId(prefix, c.id, '', '');
            const levelIChecked = isCommunitySelectedInThreads(prefix, c.id, '', '');
            contentHtml += `
                <div class="filter-checkbox-row">
                    <input type="checkbox" id="${levelIId}"
                           data-prefix="${prefix}"
                           data-community-id="${c.id}"
                           data-stage="" data-type=""
                           data-name="${escapeHtml(c.name)}"
                           ${levelIChecked ? 'checked' : ''}>
                    <label for="${levelIId}">${escapeHtml(c.name)} (仅大类)</label>
                </div>
            `;

            const stages = dimensions.stage?.values || [];
            const types = dimensions.type?.values || [];

            // Stage dimension section (if available)
            if (stages.length > 0) {
                contentHtml += `
                    <div class="filter-dimension-group">
                        <div class="filter-dimension-header">
                            <span class="filter-expand-icon">▶</span>
                            <span class="filter-dimension-label">${escapeHtml(dimensions.stage.label)}</span>
                        </div>
                        <div class="filter-dimension-content">
                `;
                for (const stage of stages) {
                    const stageId = generateThreadCommunityCheckboxId(prefix, c.id, stage, '');
                    const stageChecked = isCommunitySelectedInThreads(prefix, c.id, stage, '');
                    contentHtml += `
                        <div class="filter-checkbox-row">
                            <input type="checkbox" id="${stageId}"
                                   data-prefix="${prefix}"
                                   data-community-id="${c.id}"
                                   data-stage="${escapeHtml(stage)}" data-type=""
                                   data-name="${escapeHtml(c.name)} - ${escapeHtml(stage)}"
                                   ${stageChecked ? 'checked' : ''}>
                            <label for="${stageId}">${escapeHtml(stage)}</label>
                        </div>
                    `;
                }
                contentHtml += `
                        </div>
                    </div>
                `;
            }

            // Type dimension section (if available)
            if (types.length > 0) {
                contentHtml += `
                    <div class="filter-dimension-group">
                        <div class="filter-dimension-header">
                            <span class="filter-expand-icon">▶</span>
                            <span class="filter-dimension-label">${escapeHtml(dimensions.type.label)}</span>
                        </div>
                        <div class="filter-dimension-content">
                `;
                for (const type of types) {
                    const typeId = generateThreadCommunityCheckboxId(prefix, c.id, '', type);
                    const typeChecked = isCommunitySelectedInThreads(prefix, c.id, '', type);
                    contentHtml += `
                        <div class="filter-checkbox-row">
                            <input type="checkbox" id="${typeId}"
                                   data-prefix="${prefix}"
                                   data-community-id="${c.id}"
                                   data-stage="" data-type="${escapeHtml(type)}"
                                   data-name="${escapeHtml(c.name)} - ${escapeHtml(type)}"
                                   ${typeChecked ? 'checked' : ''}>
                            <label for="${typeId}">${escapeHtml(type)}</label>
                        </div>
                    `;
                }
                contentHtml += `
                        </div>
                    </div>
                `;
            }

            // Combined section (if both dimensions exist)
            if (stages.length > 0 && types.length > 0) {
                contentHtml += `
                    <div class="filter-dimension-group">
                        <div class="filter-dimension-header">
                            <span class="filter-expand-icon">▶</span>
                            <span class="filter-dimension-label">组合选择</span>
                        </div>
                        <div class="filter-dimension-content">
                `;
                for (const stage of stages) {
                    for (const type of types) {
                        const comboId = generateThreadCommunityCheckboxId(prefix, c.id, stage, type);
                        const comboChecked = isCommunitySelectedInThreads(prefix, c.id, stage, type);
                        contentHtml += `
                            <div class="filter-checkbox-row">
                                <input type="checkbox" id="${comboId}"
                                       data-prefix="${prefix}"
                                       data-community-id="${c.id}"
                                       data-stage="${escapeHtml(stage)}" data-type="${escapeHtml(type)}"
                                       data-name="${escapeHtml(c.name)} - ${escapeHtml(stage)} · ${escapeHtml(type)}"
                                       ${comboChecked ? 'checked' : ''}>
                                <label for="${comboId}">${escapeHtml(stage)} · ${escapeHtml(type)}</label>
                            </div>
                        `;
                    }
                }
                contentHtml += `
                        </div>
                    </div>
                `;
            }

            contentHtml += '</div>';

            return `
                <div class="community-filter-item" data-community-id="${c.id}">
                    <div class="community-filter-item-header">
                        <span class="filter-expand-icon">▶</span>
                        <span class="community-filter-item-name">${escapeHtml(c.name)}</span>
                    </div>
                    ${contentHtml}
                </div>
            `;
        } else {
            // Simple community - just show with checkbox
            const checkboxId = generateThreadCommunityCheckboxId(prefix, c.id, '', '');
            const isChecked = isCommunitySelectedInThreads(prefix, c.id, '', '');
            return `
                <div class="community-filter-item" data-community-id="${c.id}">
                    <div class="filter-checkbox-row">
                        <input type="checkbox" id="${checkboxId}"
                               data-prefix="${prefix}"
                               data-community-id="${c.id}"
                               data-stage="" data-type=""
                               data-name="${escapeHtml(c.name)}"
                               ${isChecked ? 'checked' : ''}>
                        <label for="${checkboxId}">${escapeHtml(c.name)}</label>
                    </div>
                </div>
            `;
        }
    }).join('');

    // Add accordion toggle listeners for community headers
    listEl.querySelectorAll('.community-filter-item-header').forEach(header => {
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
        checkbox.addEventListener('change', handleThreadCommunityCheckboxChange);
    });
}

/**
 * Handle community checkbox change in threads
 */
function handleThreadCommunityCheckboxChange(e) {
    const checkbox = e.target;
    const prefix = checkbox.dataset.prefix;
    const communityId = parseInt(checkbox.dataset.communityId, 10);
    const stage = checkbox.dataset.stage || '';
    const type = checkbox.dataset.type || '';
    const name = checkbox.dataset.name;

    const selectedList = prefix === 'thread' ? threadSelectedCommunities : editSelectedCommunities;

    if (checkbox.checked) {
        // Add to selected communities
        if (!isCommunitySelectedInThreads(prefix, communityId, stage, type)) {
            selectedList.push({
                id: communityId,
                name: name,
                stage: stage,
                type: type
            });
        }
    } else {
        // Remove from selected communities
        const idx = selectedList.findIndex(c =>
            c.id === communityId &&
            (c.stage || '') === stage &&
            (c.type || '') === type
        );
        if (idx !== -1) {
            selectedList.splice(idx, 1);
        }
    }

    renderSelectedCommunities(prefix);
    updateCommunityTriggerText(prefix);
}

/**
 * Render selected community tags
 */
function renderSelectedCommunities(prefix) {
    const selectedEl = document.getElementById(`${prefix}-community-selected`);
    const selectedList = prefix === 'thread' ? threadSelectedCommunities : editSelectedCommunities;

    if (!selectedEl) return;

    if (selectedList.length === 0) {
        selectedEl.innerHTML = '';
        return;
    }

    selectedEl.innerHTML = selectedList.map((c, index) =>
        `<span class="community-filter-tag">
            ${escapeHtml(c.name)}
            <span class="remove-tag" data-prefix="${prefix}" data-index="${index}">&times;</span>
        </span>`
    ).join('');

    // Add remove listeners
    selectedEl.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pf = e.target.dataset.prefix;
            const index = parseInt(e.target.dataset.index, 10);
            const removed = pf === 'thread' ? threadSelectedCommunities[index] : editSelectedCommunities[index];

            if (pf === 'thread') {
                threadSelectedCommunities.splice(index, 1);
            } else {
                editSelectedCommunities.splice(index, 1);
            }

            // Uncheck the corresponding checkbox
            const checkboxId = generateThreadCommunityCheckboxId(pf, removed.id, removed.stage || '', removed.type || '');
            const checkbox = document.getElementById(checkboxId);
            if (checkbox) checkbox.checked = false;

            renderSelectedCommunities(pf);
            updateCommunityTriggerText(pf);
        });
    });
}

/**
 * Update community trigger text
 */
function updateCommunityTriggerText(prefix) {
    const triggerEl = document.getElementById(`${prefix}-community-trigger`);
    const selectedList = prefix === 'thread' ? threadSelectedCommunities : editSelectedCommunities;

    if (!triggerEl) return;
    const span = triggerEl.querySelector('.trigger-text');
    if (selectedList.length === 0) {
        span.textContent = '选择社区...';
    } else {
        span.textContent = `已选择 ${selectedList.length} 个社区`;
    }
}

/**
 * Load threads (own or another user's)
 */
async function loadThreads() {
    try {
        threadsList.innerHTML = '<div class="loading">加载中...</div>';

        // Use different API endpoint based on whether viewing own or other's threads
        let apiUrl;
        if (isOwnPage) {
            apiUrl = THREADS_API;
        } else {
            apiUrl = `${THREADS_API}/user/${encodeURIComponent(viewingUser)}`;
        }

        const response = await fetch(apiUrl, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            renderThreads(data.data);
        } else {
            threadsList.innerHTML = `<div class="error-message">${data.error || '加载失败'}</div>`;
        }
    } catch (error) {
        console.error('Error loading threads:', error);
        threadsList.innerHTML = '<div class="error-message">加载失败</div>';
    }
}

/**
 * Render threads list
 */
function renderThreads(threads) {
    if (threads.length === 0) {
        threadsList.innerHTML = '';
        noThreads.style.display = 'block';
        // Update no-threads message based on ownership
        if (isOwnPage) {
            noThreads.innerHTML = `
                <p>你还没有发布任何分享</p>
                <p>点击上方"新建分享"按钮开始记录吧</p>
            `;
        } else {
            noThreads.innerHTML = `
                <p>${escapeHtml(viewingUser)} 还没有发布任何分享</p>
            `;
        }
        return;
    }

    noThreads.style.display = 'none';

    threadsList.innerHTML = threads.map(thread => {
        // Build disease tags (clickable if linked to a community)
        let diseaseTags = '';
        if (thread.author_disease_history && thread.author_disease_history.length > 0) {
            diseaseTags = thread.author_disease_history.map(item => {
                if (item.community_id) {
                    return `<a href="community-detail.html?id=${item.community_id}" class="disease-tag">${escapeHtml(item.disease)}</a>`;
                } else {
                    return `<span class="disease-tag">${escapeHtml(item.disease)}</span>`;
                }
            }).join('');
        }

        // Build community tags
        const communityTags = thread.communities.map(c =>
            `<span class="community-tag" data-community-id="${c.id}">${escapeHtml(c.name)}</span>`
        ).join('');

        return `
            <div class="thread-card" data-id="${thread.id}">
                <a href="thread-detail.html?id=${thread.id}" class="thread-card-clickable">
                    <div class="thread-card-header">
                        <h3>${escapeHtml(thread.title)}</h3>
                        <span class="thread-card-date">${formatDate(thread.created_at)}</span>
                    </div>
                    <p>${escapeHtml(thread.content)}</p>
                </a>
                <div class="thread-card-info">
                    <span class="thread-reply-count">${thread.reply_count || 0} 回复</span>
                    <div class="thread-communities">
                        ${diseaseTags}
                        ${communityTags}
                    </div>
                </div>
                ${isOwnPage ? `
                <div class="thread-card-footer">
                    <div class="thread-actions">
                        <button class="btn-edit" onclick="openEditModal(${thread.id})">编辑</button>
                        <button class="btn-delete" onclick="deleteThread(${thread.id})">删除</button>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Open thread modal
 */
function openThreadModal() {
    threadModal.classList.add('active');
    threadForm.reset();
    threadError.textContent = '';
    // Clear selected diseases and communities
    threadSelectedDiseases = [];
    threadSelectedCommunities = [];
    renderSelectedDiseases('thread');
    renderSelectedCommunities('thread');
    updateDiseaseTriggerText('thread');
    updateCommunityTriggerText('thread');
}

/**
 * Close thread modal
 */
function closeThreadModal() {
    threadModal.classList.remove('active');
}

/**
 * Create a new thread
 */
async function createThread(e) {
    e.preventDefault();

    const title = document.getElementById('thread-title').value;
    const content = document.getElementById('thread-content').value;

    // Get selected communities with dimension info
    const communityLinks = threadSelectedCommunities.map(c => ({
        id: c.id,
        stage: c.stage || '',
        type: c.type || ''
    }));

    // Get selected diseases
    const diseases = threadSelectedDiseases.map(d => ({
        community_id: d.community_id,
        stage: d.stage || '',
        type: d.type || '',
        disease: d.disease
    }));

    try {
        const response = await fetch(THREADS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                title,
                content,
                community_links: communityLinks,
                diseases: diseases
            })
        });

        const data = await response.json();

        if (data.success) {
            closeThreadModal();
            loadThreads();
        } else {
            threadError.textContent = data.error || '创建失败';
        }
    } catch (error) {
        console.error('Error creating thread:', error);
        threadError.textContent = '网络错误，请稍后再试';
    }
}

/**
 * Delete a thread
 */
async function deleteThread(id) {
    if (!confirm('确定要删除这条分享吗？')) {
        return;
    }

    try {
        const response = await fetch(`${THREADS_API}/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            loadThreads();
        } else {
            alert(data.error || '删除失败');
        }
    } catch (error) {
        console.error('Error deleting thread:', error);
        alert('网络错误，请稍后再试');
    }
}

/**
 * Open edit modal and load thread data
 */
async function openEditModal(threadId) {
    try {
        // Fetch thread data (use public endpoint to get full community details)
        const response = await fetch(`${THREADS_API}/${threadId}/public`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (!data.success) {
            alert(data.error || '加载分享数据失败');
            return;
        }

        const thread = data.data;

        // Populate form fields
        document.getElementById('edit-thread-id').value = thread.id;
        document.getElementById('edit-title').value = thread.title;
        document.getElementById('edit-content').value = thread.content;

        // Load diseases (from thread.diseases or thread.author_disease_history)
        editSelectedDiseases = (thread.diseases || []).map(d => ({
            community_id: d.community_id || null,
            stage: d.stage || '',
            type: d.type || '',
            disease: d.disease
        }));

        // Load communities
        editSelectedCommunities = (thread.communities || []).map(c => ({
            id: c.id,
            name: c.name,
            stage: c.stage || '',
            type: c.type || ''
        }));

        renderSelectedDiseases('edit');
        renderSelectedCommunities('edit');
        updateDiseaseTriggerText('edit');
        updateCommunityTriggerText('edit');

        editError.textContent = '';
        editModal.classList.add('active');
    } catch (error) {
        console.error('Error loading thread:', error);
        alert('网络错误，请稍后再试');
    }
}

/**
 * Close edit modal
 */
function closeEditModal() {
    editModal.classList.remove('active');
}

/**
 * Update a thread
 */
async function updateThread(e) {
    e.preventDefault();

    const threadId = document.getElementById('edit-thread-id').value;
    const title = document.getElementById('edit-title').value;
    const content = document.getElementById('edit-content').value;

    // Get selected communities with dimension info
    const communityLinks = editSelectedCommunities.map(c => ({
        id: c.id,
        stage: c.stage || '',
        type: c.type || ''
    }));

    // Get selected diseases
    const diseases = editSelectedDiseases.map(d => ({
        community_id: d.community_id,
        stage: d.stage || '',
        type: d.type || '',
        disease: d.disease
    }));

    try {
        const response = await fetch(`${THREADS_API}/${threadId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                title,
                content,
                community_links: communityLinks,
                diseases: diseases
            })
        });

        const data = await response.json();

        if (data.success) {
            closeEditModal();
            loadThreads();
        } else {
            editError.textContent = data.error || '更新失败';
        }
    } catch (error) {
        console.error('Error updating thread:', error);
        editError.textContent = '网络错误，请稍后再试';
    }
}

/**
 * Format date string - uses shared CST formatting from main.js
 */
function formatDate(dateStr) {
    return formatCSTDateFull(dateStr);
}

/**
 * Handle click outside to close dropdowns
 */
function handleClickOutside(e) {
    // Close disease selector dropdowns
    document.querySelectorAll('.disease-filter-selector.open').forEach(sel => {
        if (!sel.contains(e.target)) {
            sel.classList.remove('open');
        }
    });
    // Close community selector dropdowns
    document.querySelectorAll('.community-filter-selector.open').forEach(sel => {
        if (!sel.contains(e.target)) {
            sel.classList.remove('open');
        }
    });
}

// escapeHtml is defined in main.js

// Event Listeners
if (newShareBtn) {
    newShareBtn.addEventListener('click', openThreadModal);
}

if (threadModalClose) {
    threadModalClose.addEventListener('click', closeThreadModal);
}

if (threadModal) {
    threadModal.addEventListener('click', (e) => {
        if (e.target === threadModal) {
            closeThreadModal();
        }
    });
}

if (threadForm) {
    threadForm.addEventListener('submit', createThread);
}

if (promptLoginBtn) {
    promptLoginBtn.addEventListener('click', () => {
        // Trigger login modal from auth.js
        document.getElementById('login-btn')?.click();
    });
}

// Edit modal event listeners
if (editModalClose) {
    editModalClose.addEventListener('click', closeEditModal);
}

if (editModal) {
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    });
}

if (editForm) {
    editForm.addEventListener('submit', updateThread);
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (threadModal.classList.contains('active')) {
            closeThreadModal();
        }
        if (editModal.classList.contains('active')) {
            closeEditModal();
        }
    }
});

// Close dropdowns when clicking outside
document.addEventListener('click', handleClickOutside);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkLoginState();

    // Community tag clicks - redirect to community detail page
    threadsList.addEventListener('click', (e) => {
        const tag = e.target.closest('.community-tag[data-community-id]');
        if (tag) {
            e.preventDefault();
            window.location.href = `community-detail.html?id=${tag.dataset.communityId}`;
        }
    });
});

// Re-check login state when localStorage changes (cross-tab)
window.addEventListener('storage', (e) => {
    if (e.key === USER_KEY) {
        checkLoginState();
    }
});

// Re-check login state on same-tab auth changes
window.addEventListener('authStateChanged', checkLoginState);
