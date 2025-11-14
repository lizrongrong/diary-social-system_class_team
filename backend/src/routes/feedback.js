const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, feedbackController.getMyFeedbacks);
router.post('/', authMiddleware, feedbackController.createFeedback);

module.exports = router;