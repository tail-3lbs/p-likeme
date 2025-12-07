/**
 * Community Selector Module
 * Shared accordion-style community selector for thread creation/editing
 *
 * Usage:
 *   const selector = new CommunitySelector('my-prefix', communities);
 *   selector.init();
 *   selector.setSelected([{id: 1, name: '...', stage: '', type: ''}]);
 *   const selected = selector.getSelected();
 */

class CommunitySelector {
    /**
     * @param {string} prefix - Unique prefix for DOM element IDs (e.g., 'thread', 'edit')
     * @param {Array} communities - Array of community objects with dimensions
     */
    constructor(prefix, communities = []) {
        this.prefix = prefix;
        this.communities = communities;
        this.selectedCommunities = [];
    }

    /**
     * Set the communities list
     */
    setCommunities(communities) {
        this.communities = communities;
    }

    /**
     * Initialize the selector (render and attach event listeners)
     */
    init() {
        const listEl = document.getElementById(`${this.prefix}-community-list`);
        const triggerEl = document.getElementById(`${this.prefix}-community-trigger`);
        const selectorEl = document.getElementById(`${this.prefix}-community-selector`);

        if (!listEl) return;

        this.renderCommunityList(listEl);

        // Toggle dropdown
        if (triggerEl) {
            triggerEl.addEventListener('click', () => {
                selectorEl.classList.toggle('open');
            });
        }
    }

    /**
     * Generate unique checkbox ID
     */
    generateCheckboxId(communityId, stage, type) {
        return `${this.prefix}-community-cb-${communityId}-${stage || 'none'}-${type || 'none'}`;
    }

    /**
     * Check if a community is selected
     */
    isSelected(communityId, stage, type) {
        return this.selectedCommunities.some(c =>
            c.id === communityId &&
            (c.stage || '') === (stage || '') &&
            (c.type || '') === (type || '')
        );
    }

    /**
     * Get selected communities
     */
    getSelected() {
        return this.selectedCommunities.map(c => ({
            id: c.id,
            stage: c.stage || '',
            type: c.type || ''
        }));
    }

    /**
     * Set selected communities (for edit mode)
     */
    setSelected(communities) {
        this.selectedCommunities = (communities || []).map(c => ({
            id: c.id,
            name: c.displayPath || c.name,
            stage: c.stage || '',
            type: c.type || ''
        }));

        // Re-render to update checkbox states
        const listEl = document.getElementById(`${this.prefix}-community-list`);
        if (listEl) this.renderCommunityList(listEl);

        this.renderSelectedTags();
        this.updateTriggerText();
    }

    /**
     * Clear all selections
     */
    clear() {
        this.selectedCommunities = [];
        this.renderSelectedTags();
        this.updateTriggerText();

        // Uncheck all checkboxes
        const listEl = document.getElementById(`${this.prefix}-community-list`);
        if (listEl) {
            listEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
        }
    }

    /**
     * Render the community list with accordion style
     */
    renderCommunityList(listEl) {
        if (this.communities.length === 0) {
            listEl.innerHTML = `
                <div class="empty-list-hint">
                    <p>暂无可选社区</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = this.communities.map(c => this.renderCommunityItem(c)).join('');

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
            checkbox.addEventListener('change', (e) => this.handleCheckboxChange(e));
        });
    }

    /**
     * Render a single community item (with or without dimensions)
     */
    renderCommunityItem(community) {
        const dimensions = community.dimensions ? JSON.parse(community.dimensions) : null;
        const hasDimensions = dimensions && (dimensions.stage || dimensions.type);

        if (hasDimensions) {
            return this.renderCommunityWithDimensions(community, dimensions);
        } else {
            return this.renderSimpleCommunity(community);
        }
    }

    /**
     * Render a simple community (no dimensions)
     */
    renderSimpleCommunity(community) {
        const checkboxId = this.generateCheckboxId(community.id, '', '');
        const isChecked = this.isSelected(community.id, '', '');

        return `
            <div class="community-filter-item" data-community-id="${community.id}">
                <div class="filter-checkbox-row">
                    <input type="checkbox" id="${checkboxId}"
                           data-community-id="${community.id}"
                           data-stage="" data-type=""
                           data-name="${escapeHtml(community.name)}"
                           ${isChecked ? 'checked' : ''}>
                    <label for="${checkboxId}">${escapeHtml(community.name)}</label>
                </div>
            </div>
        `;
    }

    /**
     * Render a community with dimensions (accordion style)
     */
    renderCommunityWithDimensions(community, dimensions) {
        let contentHtml = '<div class="community-filter-item-content">';

        // Add Level I option (base community)
        const levelIId = this.generateCheckboxId(community.id, '', '');
        const levelIChecked = this.isSelected(community.id, '', '');
        contentHtml += `
            <div class="filter-checkbox-row">
                <input type="checkbox" id="${levelIId}"
                       data-community-id="${community.id}"
                       data-stage="" data-type=""
                       data-name="${escapeHtml(community.name)}"
                       ${levelIChecked ? 'checked' : ''}>
                <label for="${levelIId}">${escapeHtml(community.name)} (仅大类)</label>
            </div>
        `;

        const stages = dimensions.stage?.values || [];
        const types = dimensions.type?.values || [];

        // Stage dimension section
        if (stages.length > 0) {
            contentHtml += this.renderDimensionSection(
                community,
                dimensions.stage.label,
                stages.map(stage => ({ stage, type: '' })),
                (stage) => `${community.name} - ${stage}`
            );
        }

        // Type dimension section
        if (types.length > 0) {
            contentHtml += this.renderDimensionSection(
                community,
                dimensions.type.label,
                types.map(type => ({ stage: '', type })),
                (_, type) => `${community.name} - ${type}`
            );
        }

        // Combined section (if both dimensions exist)
        if (stages.length > 0 && types.length > 0) {
            const combos = [];
            for (const stage of stages) {
                for (const type of types) {
                    combos.push({ stage, type });
                }
            }
            contentHtml += this.renderDimensionSection(
                community,
                '组合选择',
                combos,
                (stage, type) => `${community.name} - ${stage} · ${type}`,
                (stage, type) => `${stage} · ${type}`
            );
        }

        contentHtml += '</div>';

        return `
            <div class="community-filter-item" data-community-id="${community.id}">
                <div class="community-filter-item-header">
                    <span class="filter-expand-icon">▶</span>
                    <span class="community-filter-item-name">${escapeHtml(community.name)}</span>
                </div>
                ${contentHtml}
            </div>
        `;
    }

    /**
     * Render a dimension section (stage, type, or combined)
     */
    renderDimensionSection(community, label, items, getDataName, getLabel = null) {
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
                           data-name="${escapeHtml(dataName)}"
                           ${isChecked ? 'checked' : ''}>
                    <label for="${checkboxId}">${escapeHtml(labelText)}</label>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Handle checkbox change
     */
    handleCheckboxChange(e) {
        const checkbox = e.target;
        const communityId = parseInt(checkbox.dataset.communityId, 10);
        const stage = checkbox.dataset.stage || '';
        const type = checkbox.dataset.type || '';
        const name = checkbox.dataset.name;

        if (checkbox.checked) {
            if (!this.isSelected(communityId, stage, type)) {
                this.selectedCommunities.push({
                    id: communityId,
                    name: name,
                    stage: stage,
                    type: type
                });
            }
        } else {
            const idx = this.selectedCommunities.findIndex(c =>
                c.id === communityId &&
                (c.stage || '') === stage &&
                (c.type || '') === type
            );
            if (idx !== -1) {
                this.selectedCommunities.splice(idx, 1);
            }
        }

        this.renderSelectedTags();
        this.updateTriggerText();
    }

    /**
     * Render selected community tags
     */
    renderSelectedTags() {
        const selectedEl = document.getElementById(`${this.prefix}-community-selected`);
        if (!selectedEl) return;

        if (this.selectedCommunities.length === 0) {
            selectedEl.innerHTML = '';
            return;
        }

        selectedEl.innerHTML = this.selectedCommunities.map((c, index) =>
            `<span class="community-filter-tag">
                ${escapeHtml(c.name)}
                <span class="remove-tag" data-index="${index}">&times;</span>
            </span>`
        ).join('');

        // Add remove listeners
        selectedEl.querySelectorAll('.remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index, 10);
                const removed = this.selectedCommunities[index];

                this.selectedCommunities.splice(index, 1);

                // Uncheck the corresponding checkbox
                const checkboxId = this.generateCheckboxId(removed.id, removed.stage || '', removed.type || '');
                const checkbox = document.getElementById(checkboxId);
                if (checkbox) checkbox.checked = false;

                this.renderSelectedTags();
                this.updateTriggerText();
            });
        });
    }

    /**
     * Update trigger text to show selection count
     */
    updateTriggerText() {
        const triggerEl = document.getElementById(`${this.prefix}-community-trigger`);
        if (!triggerEl) return;

        const span = triggerEl.querySelector('.trigger-text');
        if (!span) return;

        if (this.selectedCommunities.length === 0) {
            span.textContent = '选择社区...';
        } else {
            span.textContent = `已选择 ${this.selectedCommunities.length} 个社区`;
        }
    }
}

/**
 * Close all open community selectors when clicking outside
 */
function handleCommunitySelectorClickOutside(e) {
    document.querySelectorAll('.community-filter-selector.open').forEach(sel => {
        if (!sel.contains(e.target)) {
            sel.classList.remove('open');
        }
    });
}

// Add global click handler for closing dropdowns
document.addEventListener('click', handleCommunitySelectorClickOutside);
