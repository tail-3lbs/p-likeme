/**
 * Gurus (明星) API Routes
 * CRUD operations for guru profiles, questions, and replies
 */

const express = require('express');
const {
    getAllGurus,
    getGuruByUsername,
    updateGuruIntro,
    getThreadsByUserId,
    getUserAllCommunities,
    getUserDiseaseHistory,
    createGuruQuestion,
    getGuruQuestions,
    getGuruQuestionById,
    deleteGuruQuestion,
    createGuruQuestionReply,
    getGuruQuestionReplies,
    getGuruQuestionReplyById,
    deleteGuruQuestionReply,
    findUserById
} = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { INPUT_LIMITS } = require('../config');
const { sanitizeInput } = require('../utils/sanitize');
const { enrichThreadsWithCommunities } = require('../utils/community');

const router = express.Router();

/**
 * GET /api/gurus
 * Get all gurus (public)
 */
router.get('/', (req, res) => {
    try {
        const gurus = getAllGurus();

        // Add disease_history to each guru (for guru list page)
        const gurusWithDiseaseHistory = gurus.map(guru => {
            const diseaseHistory = getUserDiseaseHistory(guru.id);
            return {
                ...guru,
                disease_history: diseaseHistory
            };
        });

        res.json({
            success: true,
            data: gurusWithDiseaseHistory,
            count: gurusWithDiseaseHistory.length
        });
    } catch (error) {
        console.error('Error fetching gurus:', error);
        res.status(500).json({
            success: false,
            error: '获取明星列表失败'
        });
    }
});

/**
 * GET /api/gurus/:username
 * Get guru detail by username (public)
 */
router.get('/:username', (req, res) => {
    try {
        const { username } = req.params;
        const guru = getGuruByUsername(username);

        if (!guru) {
            return res.status(404).json({
                success: false,
                error: '明星不存在'
            });
        }

        // Get guru's disease history first (needed for threads)
        const diseaseHistory = getUserDiseaseHistory(guru.id);

        // Get guru's joined communities (all memberships)
        const guruCommunities = getUserAllCommunities(guru.id);

        // Get guru's threads with full details (similar to thread-detail API)
        const threads = getThreadsByUserId(guru.id);
        const threadsWithDetails = enrichThreadsWithCommunities(threads);

        res.json({
            success: true,
            data: {
                ...guru,
                communities: guruCommunities,
                disease_history: diseaseHistory,
                threads: threadsWithDetails
            }
        });
    } catch (error) {
        console.error('Error fetching guru:', error);
        res.status(500).json({
            success: false,
            error: '获取明星信息失败'
        });
    }
});

/**
 * PUT /api/gurus/intro
 * Update guru's intro (authenticated guru only)
 */
router.put('/intro', authMiddleware, (req, res) => {
    try {
        const { intro } = req.body;
        const userId = req.user.id;

        // Check if user is a guru
        const user = findUserById(userId);
        if (!user || user.is_guru !== 1) {
            return res.status(403).json({
                success: false,
                error: '只有明星可以编辑简介'
            });
        }

        // Validate intro type
        if (intro !== undefined && intro !== null && typeof intro !== 'string') {
            return res.status(400).json({
                success: false,
                error: '简介必须是文本'
            });
        }

        // Validate intro length
        if (intro && intro.length > INPUT_LIMITS.GURU_INTRO_MAX) {
            return res.status(400).json({
                success: false,
                error: `简介不能超过${INPUT_LIMITS.GURU_INTRO_MAX}个字符`
            });
        }

        const success = updateGuruIntro(userId, sanitizeInput(intro) || '');

        if (success) {
            res.json({
                success: true,
                message: '简介更新成功'
            });
        } else {
            res.status(500).json({
                success: false,
                error: '更新简介失败'
            });
        }
    } catch (error) {
        console.error('Error updating guru intro:', error);
        res.status(500).json({
            success: false,
            error: '更新简介失败'
        });
    }
});

/**
 * GET /api/gurus/:username/questions
 * Get all questions for a guru (public)
 */
router.get('/:username/questions', (req, res) => {
    try {
        const { username } = req.params;
        const guru = getGuruByUsername(username);

        if (!guru) {
            return res.status(404).json({
                success: false,
                error: '明星不存在'
            });
        }

        const questions = getGuruQuestions(guru.id);

        // Enrich with asker usernames
        const enrichedQuestions = questions.map(q => {
            const asker = findUserById(q.asker_user_id);
            return {
                ...q,
                asker_username: asker ? asker.username : '未知用户'
            };
        });

        res.json({
            success: true,
            data: enrichedQuestions,
            count: enrichedQuestions.length
        });
    } catch (error) {
        console.error('Error fetching guru questions:', error);
        res.status(500).json({
            success: false,
            error: '获取问题列表失败'
        });
    }
});

/**
 * POST /api/gurus/:username/questions
 * Ask a question to a guru (authenticated)
 */
router.post('/:username/questions', authMiddleware, (req, res) => {
    try {
        const { username } = req.params;
        const { title, content } = req.body;
        const askerId = req.user.id;

        // Validate guru
        const guru = getGuruByUsername(username);
        if (!guru) {
            return res.status(404).json({
                success: false,
                error: '明星不存在'
            });
        }

        // Prevent self-questioning
        if (guru.id === askerId) {
            return res.status(400).json({
                success: false,
                error: '不能向自己提问'
            });
        }

        // Validate title
        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                error: '标题不能为空'
            });
        }

        if (title.trim().length > INPUT_LIMITS.GURU_QUESTION_TITLE_MAX) {
            return res.status(400).json({
                success: false,
                error: `标题不能超过${INPUT_LIMITS.GURU_QUESTION_TITLE_MAX}个字符`
            });
        }

        // Validate content
        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: '内容不能为空'
            });
        }

        if (content.trim().length > INPUT_LIMITS.GURU_QUESTION_CONTENT_MAX) {
            return res.status(400).json({
                success: false,
                error: `内容不能超过${INPUT_LIMITS.GURU_QUESTION_CONTENT_MAX}个字符`
            });
        }

        const questionId = createGuruQuestion({
            guru_user_id: guru.id,
            asker_user_id: askerId,
            title: sanitizeInput(title),
            content: sanitizeInput(content)
        });

        res.status(201).json({
            success: true,
            data: { id: questionId },
            message: '问题发布成功'
        });
    } catch (error) {
        console.error('Error creating guru question:', error);
        res.status(500).json({
            success: false,
            error: '发布问题失败'
        });
    }
});

/**
 * GET /api/gurus/questions/:questionId
 * Get a specific question with replies (public)
 */
router.get('/questions/:questionId', (req, res) => {
    try {
        const questionId = parseInt(req.params.questionId, 10);

        if (isNaN(questionId)) {
            return res.status(400).json({
                success: false,
                error: '无效的问题ID'
            });
        }

        const question = getGuruQuestionById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                error: '问题不存在'
            });
        }

        // Get asker info
        const asker = findUserById(question.asker_user_id);

        // Get guru info
        const guru = findUserById(question.guru_user_id);

        // Get replies
        const replies = getGuruQuestionReplies(questionId);

        // Enrich replies with usernames
        const enrichedReplies = replies.map(r => {
            const user = findUserById(r.user_id);
            return {
                ...r,
                username: user ? user.username : '未知用户'
            };
        });

        res.json({
            success: true,
            data: {
                ...question,
                asker_username: asker ? asker.username : '未知用户',
                guru_username: guru ? guru.username : '未知用户',
                replies: enrichedReplies
            }
        });
    } catch (error) {
        console.error('Error fetching question:', error);
        res.status(500).json({
            success: false,
            error: '获取问题详情失败'
        });
    }
});

/**
 * DELETE /api/gurus/questions/:questionId
 * Delete a question (only asker or guru can delete)
 */
router.delete('/questions/:questionId', authMiddleware, (req, res) => {
    try {
        const questionId = parseInt(req.params.questionId, 10);
        const userId = req.user.id;

        if (isNaN(questionId)) {
            return res.status(400).json({
                success: false,
                error: '无效的问题ID'
            });
        }

        const question = getGuruQuestionById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                error: '问题不存在'
            });
        }

        // Only asker or guru can delete
        if (question.asker_user_id !== userId && question.guru_user_id !== userId) {
            return res.status(403).json({
                success: false,
                error: '没有权限删除此问题'
            });
        }

        const success = deleteGuruQuestion(questionId);

        if (success) {
            res.json({
                success: true,
                message: '问题已删除'
            });
        } else {
            res.status(500).json({
                success: false,
                error: '删除问题失败'
            });
        }
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({
            success: false,
            error: '删除问题失败'
        });
    }
});

/**
 * POST /api/gurus/questions/:questionId/replies
 * Reply to a question (authenticated)
 */
router.post('/questions/:questionId/replies', authMiddleware, (req, res) => {
    try {
        const questionId = parseInt(req.params.questionId, 10);
        const { content, parent_reply_id } = req.body;
        const userId = req.user.id;

        if (isNaN(questionId)) {
            return res.status(400).json({
                success: false,
                error: '无效的问题ID'
            });
        }

        // Validate question exists
        const question = getGuruQuestionById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                error: '问题不存在'
            });
        }

        // Validate content
        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: '回复内容不能为空'
            });
        }

        if (content.trim().length > INPUT_LIMITS.GURU_REPLY_CONTENT_MAX) {
            return res.status(400).json({
                success: false,
                error: `回复内容不能超过${INPUT_LIMITS.GURU_REPLY_CONTENT_MAX}个字符`
            });
        }

        // Validate parent_reply_id if provided
        let parentId = null;
        if (parent_reply_id !== undefined && parent_reply_id !== null) {
            parentId = parseInt(parent_reply_id, 10);
            if (isNaN(parentId)) {
                return res.status(400).json({
                    success: false,
                    error: '无效的父回复ID'
                });
            }

            const parentReply = getGuruQuestionReplyById(parentId);
            if (!parentReply || parentReply.question_id !== questionId) {
                return res.status(400).json({
                    success: false,
                    error: '父回复不存在'
                });
            }
        }

        const replyId = createGuruQuestionReply({
            question_id: questionId,
            user_id: userId,
            content: sanitizeInput(content),
            parent_reply_id: parentId
        });

        res.status(201).json({
            success: true,
            data: { id: replyId },
            message: '回复发布成功'
        });
    } catch (error) {
        console.error('Error creating reply:', error);
        res.status(500).json({
            success: false,
            error: '发布回复失败'
        });
    }
});

/**
 * DELETE /api/gurus/questions/replies/:replyId
 * Delete a reply (only reply author can delete)
 */
router.delete('/questions/replies/:replyId', authMiddleware, (req, res) => {
    try {
        const replyId = parseInt(req.params.replyId, 10);
        const userId = req.user.id;

        if (isNaN(replyId)) {
            return res.status(400).json({
                success: false,
                error: '无效的回复ID'
            });
        }

        const reply = getGuruQuestionReplyById(replyId);
        if (!reply) {
            return res.status(404).json({
                success: false,
                error: '回复不存在'
            });
        }

        // Only reply author can delete
        if (reply.user_id !== userId) {
            return res.status(403).json({
                success: false,
                error: '没有权限删除此回复'
            });
        }

        const success = deleteGuruQuestionReply(replyId);

        if (success) {
            res.json({
                success: true,
                message: '回复已删除'
            });
        } else {
            res.status(500).json({
                success: false,
                error: '删除回复失败'
            });
        }
    } catch (error) {
        console.error('Error deleting reply:', error);
        res.status(500).json({
            success: false,
            error: '删除回复失败'
        });
    }
});

module.exports = router;
