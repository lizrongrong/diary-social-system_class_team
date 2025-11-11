const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/today', cardController.getTodayFortune);
router.post('/draw', cardController.drawCard);

module.exports = router;