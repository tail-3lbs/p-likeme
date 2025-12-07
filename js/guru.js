/**
 * Guru List Page JavaScript
 * Fetches and displays all gurus
 */

(function() {
    const API_BASE = '/api';

    const gurusContainer = document.getElementById('gurus');
    const noResults = document.getElementById('no-results');
    const loading = document.getElementById('loading');

    /**
     * Fetch all gurus from API
     */
    async function fetchGurus() {
        try {
            const response = await fetch(`${API_BASE}/gurus`);
            const result = await response.json();

            if (result.success) {
                renderGurus(result.data);
            } else {
                showNoResults();
            }
        } catch (error) {
            console.error('Failed to fetch gurus:', error);
            showNoResults();
        }
    }

    /**
     * Render guru cards
     */
    function renderGurus(gurus) {
        loading.style.display = 'none';

        if (!gurus || gurus.length === 0) {
            showNoResults();
            return;
        }

        noResults.style.display = 'none';

        gurusContainer.innerHTML = gurus.map(guru => `
            <div class="guru-card">
                <a href="guru-detail.html?user=${encodeURIComponent(guru.username)}" class="guru-card-link">
                    <div class="guru-card-avatar">${guru.username.charAt(0).toUpperCase()}</div>
                    <div class="guru-card-info">
                        <h3 class="guru-card-name">${escapeHtml(guru.username)}</h3>
                        <p class="guru-card-intro">${guru.guru_intro ? escapeHtml(truncateText(guru.guru_intro, 100)) : '暂无简介'}</p>
                        ${guru.disease_history && guru.disease_history.length > 0 ? `
                        <div class="guru-card-communities">
                            ${guru.disease_history.map(d => `<span class="disease-tag-small">${escapeHtml(d.disease)}</span>`).join('')}
                        </div>
                        ` : ''}
                    </div>
                </a>
            </div>
        `).join('');
    }

    /**
     * Show no results message
     */
    function showNoResults() {
        loading.style.display = 'none';
        gurusContainer.innerHTML = '';
        noResults.style.display = 'block';
    }

    /**
     * Truncate text to specified length
     */
    function truncateText(text, maxLength) {
        if (!text) return '';
        // Remove newlines for preview
        const singleLine = text.replace(/\n+/g, ' ');
        if (singleLine.length <= maxLength) return singleLine;
        return singleLine.substring(0, maxLength) + '...';
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        fetchGurus();
    });
})();
