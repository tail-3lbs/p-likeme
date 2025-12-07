/**
 * Community utility functions
 * Shared logic for building community details with display paths
 */

const { getThreadCommunityDetails, getCommunityById } = require('../database');

/**
 * Build community info with names and display paths for a thread
 * @param {number} threadId - The thread ID
 * @returns {Array} - Array of community objects with id, name, stage, type, displayPath
 */
function getThreadCommunitiesWithDetails(threadId) {
    const communityDetails = getThreadCommunityDetails(threadId);

    return communityDetails.map(detail => {
        const community = getCommunityById(detail.community_id);
        const communityName = community ? community.name : '未知社区';

        // Build display path based on stage/type
        let displayPath = communityName;
        const parts = [];
        if (detail.stage) parts.push(detail.stage);
        if (detail.type) parts.push(detail.type);
        if (parts.length > 0) {
            displayPath = `${communityName} > ${parts.join(' · ')}`;
        }

        return {
            id: detail.community_id,
            name: communityName,
            stage: detail.stage || null,
            type: detail.type || null,
            displayPath
        };
    });
}

/**
 * Add community details to a thread object
 * @param {Object} thread - Thread object
 * @returns {Object} - Thread with communities array added
 */
function enrichThreadWithCommunities(thread) {
    return {
        ...thread,
        communities: getThreadCommunitiesWithDetails(thread.id)
    };
}

/**
 * Add community details to multiple threads
 * @param {Array} threads - Array of thread objects
 * @returns {Array} - Threads with communities arrays added
 */
function enrichThreadsWithCommunities(threads) {
    return threads.map(enrichThreadWithCommunities);
}

module.exports = {
    getThreadCommunitiesWithDetails,
    enrichThreadWithCommunities,
    enrichThreadsWithCommunities
};
