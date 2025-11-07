const express = require('express');
const router = express.Router();
const followerController = require('../controllers/followController');
const { authMiddleware } = require('../middleware/auth');

// 所有路由都需要認證
router.use(authMiddleware);

// GET /api/v1/followers - 獲取追蹤中 (following) 列表
router.get('/', followerController.getAll);

// GET /api/v1/followers/status/:userId - 檢查追蹤狀態
router.get('/status/:userId', followerController.checkStatus);

// 取得指定用戶的追蹤/粉絲列表與統計
router.get('/:userId/following', followerController.getFollowingByUser);
router.get('/:userId/followers', followerController.getFollowersByUser);
router.get('/:userId/counts', followerController.getCounts);

// POST /api/v1/followers - 添加追蹤 (follow)
router.post('/', followerController.add);

// DELETE /api/v1/followers/:followingId - 移除追蹤
router.delete('/:followingId', followerController.remove);

module.exports = router;
