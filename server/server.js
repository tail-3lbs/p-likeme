/**
 * P-LikeMe API Server
 * Express + SQLite backend
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { getAllCommunities, searchCommunities, getCommunityById, joinCommunity, leaveCommunity, getUserCommunityIds, getUserCommunities, getThreadsByCommunityId, findUserById } = require('./database');
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
 */
app.get('/api/communities', (req, res) => {
    try {
        const { q } = req.query;

        let communities;

        if (q && q.trim()) {
            // Search - return all matches
            communities = searchCommunities(q.trim());
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
 */
app.get('/api/communities/:id', (req, res) => {
    try {
        const { id } = req.params;
        const community = getCommunityById(parseInt(id));

        if (!community) {
            return res.status(404).json({
                success: false,
                error: '社区不存在'
            });
        }

        res.json({
            success: true,
            data: community
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
 * Query params: ?limit=10&offset=0
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

        const { threads, total } = getThreadsByCommunityId(communityId, limit, offset);

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
                }))
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
 * Query params: ?details=true for full community objects, otherwise returns IDs only
 */
app.get('/api/user/communities', authMiddleware, (req, res) => {
    try {
        const { details } = req.query;

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
 */
app.post('/api/communities/:id/join', authMiddleware, (req, res) => {
    try {
        const communityId = parseInt(req.params.id);
        const community = getCommunityById(communityId);

        if (!community) {
            return res.status(404).json({
                success: false,
                error: '社区不存在'
            });
        }

        const joined = joinCommunity(req.user.id, communityId);

        if (joined) {
            res.json({
                success: true,
                message: '加入成功',
                data: { community_id: communityId }
            });
        } else {
            res.json({
                success: true,
                message: '您已经是该社区成员',
                data: { community_id: communityId }
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
 */
app.delete('/api/communities/:id/leave', authMiddleware, (req, res) => {
    try {
        const communityId = parseInt(req.params.id);
        const left = leaveCommunity(req.user.id, communityId);

        if (left) {
            res.json({
                success: true,
                message: '已退出社区',
                data: { community_id: communityId }
            });
        } else {
            res.json({
                success: true,
                message: '您尚未加入该社区',
                data: { community_id: communityId }
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
