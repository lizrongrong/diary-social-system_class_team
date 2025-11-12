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
