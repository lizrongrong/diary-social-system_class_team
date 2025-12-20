const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    // 確保 limit 和 offset 是有效數字
    const safeLimit = Math.max(1, Math.min(100, isNaN(limit) ? 20 : limit));
    const safeOffset = Math.max(0, isNaN(offset) ? 0 : offset);

    const notifications = await Notification.findByUser(userId, safeLimit, safeOffset);
    const unreadCount = await Notification.countUnread(userId);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await Notification.markAsRead(notificationId);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const count = await Notification.markAllAsRead(userId);
    res.json({ message: 'All marked as read', count });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await Notification.delete(notificationId);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
