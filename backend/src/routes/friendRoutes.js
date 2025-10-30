const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { authMiddleware } = require('../middleware/auth');

// 所有路由都需要認證
router.use(authMiddleware);

// GET /api/v1/friends - 獲取好友列表
router.get('/', friendController.getAll);

// GET /api/v1/friends/status/:userId - 檢查好友狀態
router.get('/status/:userId', friendController.checkStatus);

// 取得指定用戶的追蹤/粉絲列表與統計
router.get('/:userId/following', friendController.getFollowingByUser);
router.get('/:userId/followers', friendController.getFollowersByUser);
router.get('/:userId/counts', friendController.getCounts);

// POST /api/v1/friends - 添加好友
router.post('/', friendController.add);

// DELETE /api/v1/friends/:friendId - 移除好友
router.delete('/:friendId', friendController.remove);

module.exports = router;
