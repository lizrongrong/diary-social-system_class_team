const Announcement = require('../models/Announcement');

exports.getActive = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const announcements = await Announcement.findActive(limit, offset);
    res.json({ announcements });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
};

// We'll use db queries in model for read-tracking

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const count = await Announcement.countUnreadForUser(userId);
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Get announcement unread count error:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
}

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { announcementId } = req.params;
    await Announcement.markAsRead(announcementId, userId);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark announcement read error:', error);
    res.status(500).json({ message: 'Failed to mark as read' });
  }
}
