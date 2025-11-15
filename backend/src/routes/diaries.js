const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { validateDiary } = require('../middleware/validation');

// GET /api/v1/diaries/explore - 探索公開日記（不需認證）
router.get('/explore', optionalAuth, diaryController.exploreDiaries);

// GET /api/v1/diaries/search - 搜尋日記（不需認證，但可選認證以顯示按讚狀態）
router.get('/search', optionalAuth, diaryController.searchDiaries);

// 需要認證的路由
router.use(authMiddleware);

// GET /api/v1/diaries - 取得使用者的日記列表（必須在 /:id 之前）
router.get('/', diaryController.getDiaries);

// POST /api/v1/diaries - 建立新日記
router.post('/', validateDiary, diaryController.createDiary);

// GET /api/v1/diaries/:id - 取得單篇日記
router.get('/:id', diaryController.getDiaryById);

// PUT /api/v1/diaries/:id - 更新日記
router.put('/:id', validateDiary, diaryController.updateDiary);

// DELETE /api/v1/diaries/:id - 刪除日記
router.delete('/:id', diaryController.deleteDiary);

module.exports = router;
