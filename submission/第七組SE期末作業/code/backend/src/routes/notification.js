const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, notificationController.getNotifications);
router.put('/:notificationId/read', authMiddleware, notificationController.markAsRead);
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);
router.delete('/:notificationId', authMiddleware, notificationController.deleteNotification);

module.exports = router;
