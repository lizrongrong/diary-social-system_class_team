const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authMiddleware } = require('../middleware/auth');

// 公告是公開的，不需要登入即可讀取
router.get('/active', announcementController.getActive);

// 使用者：標示公告為已讀（需要登入）
router.put('/:id/read', authMiddleware, announcementController.markAsRead);

// 使用者：取得自己已讀的公告 IDs（需要登入）
router.get('/reads', authMiddleware, announcementController.getReadsForUser);

module.exports = router;
