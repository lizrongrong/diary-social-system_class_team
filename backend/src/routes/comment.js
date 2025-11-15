const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

router.post('/', authMiddleware, commentController.createComment);
router.get('/diary/:diaryId', optionalAuth, commentController.getComments);
router.delete('/:commentId', authMiddleware, commentController.deleteComment);

module.exports = router;
