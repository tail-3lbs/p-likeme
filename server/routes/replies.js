/**
 * Replies API Routes
 * CRUD operations for thread replies
 */

const express = require('express');
const { createReply, getRepliesByThreadId, getReplyById, deleteReply, getThreadById, findUserById } = require('../database');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { INPUT_LIMITS } = require('../config');

const router = express.Router();

/**
 * GET /api/threads/:threadId/replies
 * Get all replies for a thread (public)
 */
router.get('/:threadId/replies', optionalAuthMiddleware, (req, res) => {
    try {
        const threadId = parseInt(req.params.threadId, 10);

        // Check if thread exists
        const thread = getThreadById(threadId);
        if (!thread) {
            return res.status(404).json({
                success: false,
                error: '分享不存在'
            });
        }

        const replies = getRepliesByThreadId(threadId);

        // Add author info to each reply
        const repliesWithAuthors = replies.map(reply => {
            const author = findUserById(reply.user_id);
            return {
                ...reply,
                author: author ? author.username : '匿名用户',
                isOwner: req.user ? reply.user_id === req.user.id : false
            };
        });

        res.json({
            success: true,
            data: repliesWithAuthors,
            count: replies.length
        });
    } catch (error) {
        console.error('Error fetching replies:', error);
        res.status(500).json({
            success: false,
            error: '获取回复失败'
        });
    }
});

/**
 * POST /api/threads/:threadId/replies
 * Create a new reply (requires auth)
 * If parent_reply_id is provided, this reply is stacked under that reply's card
 */
router.post('/:threadId/replies', authMiddleware, (req, res) => {
    try {
        const threadId = parseInt(req.params.threadId, 10);
        const { content, parent_reply_id } = req.body;

        // Check if thread exists
        const thread = getThreadById(threadId);
        if (!thread) {
            return res.status(404).json({
                success: false,
                error: '分享不存在'
            });
        }

        // Validate content
        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: '回复内容不能为空'
            });
        }

        if (content.trim().length > INPUT_LIMITS.REPLY_CONTENT_MAX) {
            return res.status(400).json({
                success: false,
                error: `回复内容不能超过${INPUT_LIMITS.REPLY_CONTENT_MAX}个字符`
            });
        }

        // If replying to another reply, validate it exists
        let parentReplyId = null;
        if (parent_reply_id) {
            const parentReply = getReplyById(parseInt(parent_reply_id, 10));
            if (!parentReply || parentReply.thread_id !== threadId) {
                return res.status(400).json({
                    success: false,
                    error: '要回复的评论不存在'
                });
            }
            // Store the immediate parent for @mention display
            // Frontend will handle grouping by finding the root
            parentReplyId = parentReply.id;
        }

        // Create reply
        const replyId = createReply({
            thread_id: threadId,
            user_id: req.user.id,
            content: content.trim(),
            parent_reply_id: parentReplyId
        });

        const reply = getReplyById(replyId);
        const author = findUserById(reply.user_id);

        res.status(201).json({
            success: true,
            message: '回复成功',
            data: {
                ...reply,
                author: author ? author.username : '匿名用户',
                isOwner: true
            }
        });
    } catch (error) {
        console.error('Error creating reply:', error);
        res.status(500).json({
            success: false,
            error: '回复失败'
        });
    }
});

/**
 * DELETE /api/threads/:threadId/replies/:replyId
 * Delete a reply (requires auth, only owner can delete)
 */
router.delete('/:threadId/replies/:replyId', authMiddleware, (req, res) => {
    try {
        const threadId = parseInt(req.params.threadId, 10);
        const replyId = parseInt(req.params.replyId, 10);

        // Check if reply exists and belongs to this thread
        const reply = getReplyById(replyId);
        if (!reply || reply.thread_id !== threadId) {
            return res.status(404).json({
                success: false,
                error: '回复不存在'
            });
        }

        // Delete reply (ownership verified in deleteReply function)
        const deleted = deleteReply(replyId, req.user.id);

        if (!deleted) {
            return res.status(403).json({
                success: false,
                error: '无权删除此回复'
            });
        }

        res.json({
            success: true,
            message: '回复已删除'
        });
    } catch (error) {
        console.error('Error deleting reply:', error);
        res.status(500).json({
            success: false,
            error: '删除回复失败'
        });
    }
});

module.exports = router;
