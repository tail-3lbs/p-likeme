/**
 * Threads API Routes
 * CRUD operations for user threads/shares
 */

const express = require('express');
const { createThread, getThreadsByUserId, getThreadById, getThreadCommunityDetails, deleteThread, updateThread, getAllCommunities, getCommunityById, findUserById, findUserByUsernamePublic } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

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
 * GET /api/threads/user/:username
 * Get all threads for a specific user (requires login)
 */
router.get('/user/:username', authMiddleware, (req, res) => {
    try {
        const { username } = req.params;

        // Find user by username
        const user = findUserByUsernamePublic(username);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }

        const threads = getThreadsByUserId(user.id);

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
            count: threads.length,
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Error fetching user threads:', error);
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
 * Includes author username and community details with stage/type
 */
router.get('/:id/public', (req, res) => {
    try {
        const threadId = parseInt(req.params.id);
        const thread = getThreadById(threadId);

        if (!thread) {
            return res.status(404).json({
                success: false,
                error: '分享不存在'
            });
        }

        // Get author info
        const author = findUserById(thread.user_id);

        // Get community details with stage/type
        const communityDetails = getThreadCommunityDetails(threadId);

        // Build community info with names and full path
        const communities = communityDetails.map(detail => {
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

        res.json({
            success: true,
            data: {
                ...thread,
                author: author ? author.username : '匿名用户',
                communities
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
 * Body params:
 *   - title: string (required)
 *   - content: string (required)
 *   - community_ids: number[] (legacy format, Level I only)
 *   - community_links: {id: number, stage?: string, type?: string}[] (new format with sub-community support)
 */
router.post('/', authMiddleware, (req, res) => {
    try {
        const { title, content, community_ids = [], community_links = [] } = req.body;

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
            community_ids: community_ids.map(id => parseInt(id)),
            community_links: community_links.map(link => ({
                id: parseInt(link.id),
                stage: link.stage || '',
                type: link.type || ''
            }))
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
 * Body params:
 *   - title: string (required)
 *   - content: string (required)
 *   - community_ids: number[] (legacy format, Level I only)
 *   - community_links: {id: number, stage?: string, type?: string}[] (new format with sub-community support)
 */
router.put('/:id', authMiddleware, (req, res) => {
    try {
        const { title, content, community_ids = [], community_links = [] } = req.body;

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
            community_ids: community_ids.map(id => parseInt(id)),
            community_links: community_links.map(link => ({
                id: parseInt(link.id),
                stage: link.stage || '',
                type: link.type || ''
            }))
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
