const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 所有路由都需要管理員權限
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/v1/admin/stats - 獲取系統統計
router.get('/stats', adminController.getStats);

// GET /api/v1/admin/users - 獲取用戶列表
router.get('/users', adminController.getUsers);

// GET /api/v1/admin/diaries - 獲取日記列表
router.get('/diaries', adminController.getDiaries);

// PUT /api/v1/admin/users/:userId/status - 更新用戶狀態
router.put('/users/:userId/status', adminController.updateUserStatus);

// DELETE /api/v1/admin/diaries/:diaryId - 刪除日記
router.delete('/diaries/:diaryId', adminController.deleteDiary);

module.exports = router;