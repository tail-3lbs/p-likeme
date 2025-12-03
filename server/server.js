/**
 * P-LikeMe API Server
 * Express + SQLite backend
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { getAllCommunities, searchCommunities, getCommunityById, joinCommunity, leaveCommunity, getUserCommunityIds, getUserCommunities, getThreadsByCommunityId, findUserById, getSubCommunityMemberCounts, isUserInCommunity, getUserSubCommunities } = require('./database');
const authRoutes = require('./routes/auth');
const { authMiddleware } = require('./routes/auth');
const threadsRoutes = require('./routes/threads');
const repliesRoutes = require('./routes/replies');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from parent directory (frontend)
app.use(express.static(path.join(__dirname, '..')));

// Auth Routes
app.use('/api/auth', authRoutes);

// Threads Routes
app.use('/api/threads', threadsRoutes);

// Replies Routes (nested under threads)
app.use('/api/threads', repliesRoutes);

// API Routes

/**
 * GET /api/communities
 * Get all communities or search
 * Query params: ?q=搜索词
 * Note: Search also looks through sub-community dimension values and returns hints
 */
app.get('/api/communities', (req, res) => {
    try {
        const { q } = req.query;

        let communities;

        if (q && q.trim()) {
            // Search - return all matches
            communities = searchCommunities(q.trim());
            const searchTerm = q.trim().toLowerCase();

            // Also search through dimension values for sub-community hints
            const allCommunities = getAllCommunities();

            // Add hint property for communities that match via dimension values
            communities = communities.map(community => {
                if (community.dimensions) {
                    try {
                        const dims = JSON.parse(community.dimensions);
                        const matchedValues = [];

                        if (dims.stage && dims.stage.values) {
                            dims.stage.values.forEach(val => {
                                if (val.toLowerCase().includes(searchTerm)) {
                                    matchedValues.push(val);
                                }
                            });
                        }
                        if (dims.type && dims.type.values) {
                            dims.type.values.forEach(val => {
                                if (val.toLowerCase().includes(searchTerm)) {
                                    matchedValues.push(val);
                                }
                            });
                        }

                        if (matchedValues.length > 0) {
                            return { ...community, subCommunityHint: matchedValues.join(', ') };
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
                return community;
            });

            // Also find communities that weren't in results but have matching dimension values
            const resultIds = new Set(communities.map(c => c.id));
            allCommunities.forEach(community => {
                if (!resultIds.has(community.id) && community.dimensions) {
                    try {
                        const dims = JSON.parse(community.dimensions);
                        const matchedValues = [];

                        if (dims.stage && dims.stage.values) {
                            dims.stage.values.forEach(val => {
                                if (val.toLowerCase().includes(searchTerm)) {
                                    matchedValues.push(val);
                                }
                            });
                        }
                        if (dims.type && dims.type.values) {
                            dims.type.values.forEach(val => {
                                if (val.toLowerCase().includes(searchTerm)) {
                                    matchedValues.push(val);
                                }
                            });
                        }

                        if (matchedValues.length > 0) {
                            communities.push({ ...community, subCommunityHint: matchedValues.join(', ') });
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            });
        } else {
            // Get all communities
            communities = getAllCommunities();
        }

        res.json({
            success: true,
            data: communities,
            count: communities.length
        });
    } catch (error) {
        console.error('Error fetching communities:', error);
        res.status(500).json({
            success: false,
            error: '获取社区列表失败'
        });
    }
});

/**
 * GET /api/communities/:id
 * Get a single community by ID
 * Query params: ?stage=xxx&type=xxx for sub-community info
 */
app.get('/api/communities/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { stage, type } = req.query;
        const community = getCommunityById(parseInt(id));

        if (!community) {
            return res.status(404).json({
                success: false,
                error: '社区不存在'
            });
        }

        // Parse dimensions if they exist
        let dimensions = null;
        if (community.dimensions) {
            try {
                dimensions = JSON.parse(community.dimensions);
            } catch (e) {
                console.error('Error parsing dimensions:', e);
            }
        }

        // Get sub-community member counts for matrix display
        const subCommunityMembers = getSubCommunityMemberCounts(parseInt(id));

        // Build response with parsed dimensions and sub-community info
        const response = {
            ...community,
            dimensions,
            subCommunityMembers,
            // Current sub-community context (if viewing Level II or III)
            currentStage: stage || null,
            currentType: type || null
        };

        res.json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Error fetching community:', error);
        res.status(500).json({
            success: false,
            error: '获取社区信息失败'
        });
    }
});

/**
 * GET /api/communities/:id/threads
 * Get all threads linked to a community (public, with pagination)
 * Query params: ?limit=10&offset=0&stage=xxx&type=xxx
 * Sub-community filtering:
 * - No stage/type: shows ALL threads for this community (Level I)
 * - stage only: shows threads with matching stage (Level II)
 * - type only: shows threads with matching type (Level II)
 * - both: shows only threads with exact match (Level III)
 */
app.get('/api/communities/:id/threads', (req, res) => {
    try {
        const communityId = parseInt(req.params.id);
        const community = getCommunityById(communityId);

        if (!community) {
            return res.status(404).json({
                success: false,
                error: '社区不存在'
            });
        }

        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const stage = req.query.stage || null;
        const type = req.query.type || null;

        const { threads, total } = getThreadsByCommunityId(communityId, limit, offset, stage, type);

        // Add author info and community names for each thread
        const communities = getAllCommunities();
        const communityMap = {};
        communities.forEach(c => { communityMap[c.id] = c.name; });

        const threadsWithDetails = threads.map(thread => {
            const author = findUserById(thread.user_id);
            return {
                ...thread,
                author: author ? author.username : '匿名用户',
                communities: thread.community_ids.map(id => ({
                    id,
                    name: communityMap[id] || '未知社区'
                })),
                // Include sub-community details for display
                communityDetails: thread.community_details || []
            };
        });

        res.json({
            success: true,
            data: threadsWithDetails,
            count: threads.length,
            total: total,
            hasMore: offset + threads.length < total
        });
    } catch (error) {
        console.error('Error fetching community threads:', error);
        res.status(500).json({
            success: false,
            error: '获取社区分享失败'
        });
    }
});

/**
 * GET /api/user/communities
 * Get communities the current user has joined
 * Query params:
 *   ?details=true for full community objects
 *   ?community_id=X to get sub-community memberships for a specific community
 */
app.get('/api/user/communities', authMiddleware, (req, res) => {
    try {
        const { details, community_id } = req.query;

        // If community_id is provided, get sub-community memberships for that community
        if (community_id) {
            const subCommunities = getUserSubCommunities(req.user.id, parseInt(community_id));
            const isLevelIMember = isUserInCommunity(req.user.id, parseInt(community_id));
            res.json({
                success: true,
                data: {
                    isLevelIMember,
                    subCommunities
                }
            });
            return;
        }

        if (details === 'true') {
            const communities = getUserCommunities(req.user.id);
            res.json({
                success: true,
                data: communities
            });
        } else {
            const communityIds = getUserCommunityIds(req.user.id);
            res.json({
                success: true,
                data: communityIds
            });
        }
    } catch (error) {
        console.error('Error fetching user communities:', error);
        res.status(500).json({
            success: false,
            error: '获取已加入社区失败'
        });
    }
});

/**
 * POST /api/communities/:id/join
 * Join a community (requires authentication)
 * Body params: { stage, type } for sub-community joining
 * Note: Joining a sub-community auto-joins Level I
 */
app.post('/api/communities/:id/join', authMiddleware, (req, res) => {
    try {
        const communityId = parseInt(req.params.id);
        const { stage, type } = req.body || {};
        const community = getCommunityById(communityId);

        if (!community) {
            return res.status(404).json({
                success: false,
                error: '社区不存在'
            });
        }

        const joined = joinCommunity(req.user.id, communityId, stage || null, type || null);
        const isSubCommunity = stage || type;

        if (joined) {
            res.json({
                success: true,
                message: isSubCommunity ? '加入细分社区成功' : '加入成功',
                data: { community_id: communityId, stage: stage || null, type: type || null }
            });
        } else {
            res.json({
                success: true,
                message: isSubCommunity ? '您已经是该细分社区成员' : '您已经是该社区成员',
                data: { community_id: communityId, stage: stage || null, type: type || null }
            });
        }
    } catch (error) {
        console.error('Error joining community:', error);
        res.status(500).json({
            success: false,
            error: '加入社区失败'
        });
    }
});

/**
 * DELETE /api/communities/:id/leave
 * Leave a community (requires authentication)
 * Query params: ?stage=xxx&type=xxx for leaving specific sub-community
 * Note: Leaving Level I (no stage/type) auto-leaves all Level II and III
 */
app.delete('/api/communities/:id/leave', authMiddleware, (req, res) => {
    try {
        const communityId = parseInt(req.params.id);
        const { stage, type } = req.query;
        const isSubCommunity = stage || type;

        const left = leaveCommunity(req.user.id, communityId, stage || null, type || null);

        if (left) {
            res.json({
                success: true,
                message: isSubCommunity ? '已退出细分社区' : '已退出社区',
                data: { community_id: communityId, stage: stage || null, type: type || null }
            });
        } else {
            res.json({
                success: true,
                message: isSubCommunity ? '您尚未加入该细分社区' : '您尚未加入该社区',
                data: { community_id: communityId, stage: stage || null, type: type || null }
            });
        }
    } catch (error) {
        console.error('Error leaving community:', error);
        res.status(500).json({
            success: false,
            error: '退出社区失败'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务器运行正常' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   P-LikeMe Server Started!             ║
╠════════════════════════════════════════╣
║   Local:   http://localhost:${PORT}       ║
║   API:     http://localhost:${PORT}/api   ║
╚════════════════════════════════════════╝
    `);
});
