const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { authMiddleware } = require('../middleware/auth');

// 所有路由都需要認證
router.use(authMiddleware);

// GET /api/v1/cards - 獲取所有卡片
router.get('/', cardController.getAllCards);

// POST /api/v1/cards/draw - 抽卡
router.post('/draw', cardController.drawCard);

// GET /api/v1/cards/my-cards - 獲取我的卡片收藏
router.get('/my-cards', cardController.getMyCards);

// GET /api/v1/cards/stats - 獲取抽卡統計
router.get('/stats', cardController.getCardStats);

module.exports = router;