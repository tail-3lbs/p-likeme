/**
 * P-LikeMe API Server
 * Express + SQLite backend
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { getAllCommunities, searchCommunities, getCommunityById } = require('./database');
const authRoutes = require('./auth');
const threadsRoutes = require('./threads');

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

// API Routes

/**
 * GET /api/communities
 * Get communities with pagination or search
 * Query params: ?q=搜索词&limit=6&offset=0
 */
app.get('/api/communities', (req, res) => {
    try {
        const { q, limit, offset } = req.query;
        const pageLimit = parseInt(limit) || 6;
        const pageOffset = parseInt(offset) || 0;

        let communities;
        let total;

        if (q && q.trim()) {
            // Search - return all matches (no pagination for search)
            communities = searchCommunities(q.trim());
            total = communities.length;
        } else {
            // Get all with pagination
            const allCommunities = getAllCommunities();
            total = allCommunities.length;
            communities = allCommunities.slice(pageOffset, pageOffset + pageLimit);
        }

        res.json({
            success: true,
            data: communities,
            count: communities.length,
            total: total,
            hasMore: pageOffset + communities.length < total
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
