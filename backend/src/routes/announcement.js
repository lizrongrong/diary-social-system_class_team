const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authMiddleware } = require('../middleware/auth');

// 公開：取得目前生效的公告（供未登入或任何人）
router.get('/active', announcementController.getActive);

// 需登入：取得使用者未讀公告數
router.get('/my/unread-count', authMiddleware, announcementController.getUnreadCount);

// 需登入：使用者標示公告為已讀
router.put('/:announcementId/read', authMiddleware, announcementController.markAsRead);

module.exports = router;
