/**
 * Threads API Routes
 * CRUD operations for user threads/shares
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { createThread, getThreadsByUserId, getThreadById, deleteThread, updateThread, getAllCommunities, findUserById } = require('../database');

const router = express.Router();

// JWT Secret (same as auth.js)
const JWT_SECRET = 'p-likeme-secret-key-change-in-production';

/**
 * Middleware: Verify JWT token
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: '未登录' });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
    }
}

/**
 * GET /api/threads
 * Get all threads for the logged-in user
 */
router.get('/', authMiddleware, (req, res) => {
    try {
        const threads = getThreadsByUserId(req.user.id);

        // Get community names for each thread
        const communities = getAllCommunities();
        const communityMap = {};
        communities.forEach(c => { communityMap[c.id] = c.name; });

        const threadsWithNames = threads.map(thread => ({
            ...thread,
            communities: thread.community_ids.map(id => ({
                id,
                name: communityMap[id] || '未知社区'
            }))
        }));

        res.json({
            success: true,
            data: threadsWithNames,
            count: threads.length
        });
    } catch (error) {
        console.error('Error fetching threads:', error);
        res.status(500).json({
            success: false,
            error: '获取分享列表失败'
        });
    }
});

/**
 * GET /api/threads/:id
 * Get a single thread by ID
 */
router.get('/:id', authMiddleware, (req, res) => {
    try {
        const thread = getThreadById(parseInt(req.params.id));

        if (!thread) {
            return res.status(404).json({
                success: false,
                error: '分享不存在'
            });
        }

        // Check if user owns this thread
        if (thread.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: '无权访问此分享'
            });
        }

        // Get community names
        const communities = getAllCommunities();
        const communityMap = {};
        communities.forEach(c => { communityMap[c.id] = c.name; });

        res.json({
            success: true,
            data: {
                ...thread,
                communities: thread.community_ids.map(id => ({
                    id,
                    name: communityMap[id] || '未知社区'
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching thread:', error);
        res.status(500).json({
            success: false,
            error: '获取分享详情失败'
        });
    }
});

/**
 * GET /api/threads/:id/public
 * Get a single thread by ID (public - no auth required)
 * Includes author username
 */
router.get('/:id/public', (req, res) => {
    try {
        const thread = getThreadById(parseInt(req.params.id));

        if (!thread) {
            return res.status(404).json({
                success: false,
                error: '分享不存在'
            });
        }

        // Get author info
        const author = findUserById(thread.user_id);

        // Get community names
        const communities = getAllCommunities();
        const communityMap = {};
        communities.forEach(c => { communityMap[c.id] = c.name; });

        res.json({
            success: true,
            data: {
                ...thread,
                author: author ? author.username : '匿名用户',
                communities: thread.community_ids.map(id => ({
                    id,
                    name: communityMap[id] || '未知社区'
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching thread:', error);
        res.status(500).json({
            success: false,
            error: '获取分享详情失败'
        });
    }
});

/**
 * POST /api/threads
 * Create a new thread
 */
router.post('/', authMiddleware, (req, res) => {
    try {
        const { title, content, community_ids = [] } = req.body;

        // Validate input
        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                error: '标题不能为空'
            });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: '内容不能为空'
            });
        }

        // Create thread
        const threadId = createThread({
            user_id: req.user.id,
            title: title.trim(),
            content: content.trim(),
            community_ids: community_ids.map(id => parseInt(id))
        });

        const thread = getThreadById(threadId);

        res.status(201).json({
            success: true,
            message: '分享创建成功',
            data: thread
        });
    } catch (error) {
        console.error('Error creating thread:', error);
        res.status(500).json({
            success: false,
            error: '创建分享失败'
        });
    }
});

/**
 * PUT /api/threads/:id
 * Update a thread
 */
router.put('/:id', authMiddleware, (req, res) => {
    try {
        const { title, content, community_ids = [] } = req.body;

        // Validate input
        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                error: '标题不能为空'
            });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: '内容不能为空'
            });
        }

        // Update thread
        const updated = updateThread({
            id: parseInt(req.params.id),
            user_id: req.user.id,
            title: title.trim(),
            content: content.trim(),
            community_ids: community_ids.map(id => parseInt(id))
        });

        if (!updated) {
            return res.status(404).json({
                success: false,
                error: '分享不存在或无权修改'
            });
        }

        const thread = getThreadById(parseInt(req.params.id));

        res.json({
            success: true,
            message: '分享更新成功',
            data: thread
        });
    } catch (error) {
        console.error('Error updating thread:', error);
        res.status(500).json({
            success: false,
            error: '更新分享失败'
        });
    }
});

/**
 * DELETE /api/threads/:id
 * Delete a thread
 */
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const deleted = deleteThread(parseInt(req.params.id), req.user.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: '分享不存在或无权删除'
            });
        }

        res.json({
            success: true,
            message: '分享已删除'
        });
    } catch (error) {
        console.error('Error deleting thread:', error);
        res.status(500).json({
            success: false,
            error: '删除分享失败'
        });
    }
});

module.exports = router;
