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

// 管理員：列出所有公告
exports.listAll = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const announcements = await Announcement.findAll(limit, offset);
    res.json({ announcements });
  } catch (error) {
    console.error('Admin list announcements error:', error);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
};

// 管理員：建立公告
exports.create = async (req, res) => {
  try {
    const { title, content, priority, is_active, published_at, expires_at } = req.body || {};
    if (!title || !content) {
      return res.status(400).json({ message: 'title and content are required' });
    }
    const announcementId = await Announcement.create({
      admin_id: req.user.user_id,
      title,
      content,
      priority: priority || 'normal',
      is_active: typeof is_active === 'boolean' ? is_active : true,
      published_at: published_at || null,
      expires_at: expires_at || null
    });
    res.status(201).json({ announcement_id: announcementId });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ message: 'Failed to create announcement' });
  }
};

// 管理員：刪除公告
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const ok = await Announcement.deleteById(id);
    if (!ok) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
};
