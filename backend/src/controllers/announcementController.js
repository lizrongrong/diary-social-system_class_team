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
    // Also clear any read records for this announcement
    try { await Announcement.clearReadsForAnnouncement(id) } catch (e) {}
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
};

// 管理員：取得單一公告
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const ann = await Announcement.findById(id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ announcement: ann });
  } catch (error) {
    console.error('Get announcement by id error:', error);
    res.status(500).json({ message: 'Failed to fetch announcement' });
  }
};

// 管理員：更新公告 (編輯)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, priority, is_active, published_at, expires_at } = req.body || {};
    if (!title || !content) return res.status(400).json({ message: 'title and content are required' });
    // Load existing announcement so we preserve fields not provided in the update (e.g., is_active)
    const existing = await Announcement.findById(id);
    if (!existing) return res.status(404).json({ message: 'Announcement not found' });
    const now = new Date();
    const newTitle = title;
    // if is_active not explicitly provided, preserve existing value
    const finalIsActive = (typeof is_active === 'boolean') ? is_active : (existing.is_active === 1 || existing.is_active === true);
    const ok = await Announcement.updateById(id, { title: newTitle, content, priority, is_active: finalIsActive, published_at: now, expires_at, admin_id: req.user.user_id });
    if (!ok) return res.status(404).json({ message: 'Announcement not found' });

    // clear read marks so edited announcement becomes unread for users
    try {
      await Announcement.clearReadsForAnnouncement(id);
    } catch (e) {
      // ignore
    }

    // return the updated announcement object so clients can update their views
    try {
      const updated = await Announcement.findById(id);
      console.log(`announcement updated: id=${id} title=${updated?.title}`);
      return res.json({ announcement: updated });
    } catch (e) {
      return res.json({ announcement_id: id });
    }
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ message: 'Failed to update announcement' });
  }
};

// 使用者：標示公告為已讀
exports.markAsRead = async (req, res) => {
  try {
    console.log('[markAsRead] incoming request', { method: req.method, url: req.originalUrl, params: req.params, hasAuth: !!req.headers.authorization });
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!id) return res.status(400).json({ message: 'announcement id is required' });

    // verify announcement exists
    try {
      const ann = await Announcement.findById(id);
      if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    } catch (err) {
      console.error('Error checking announcement existence:', err);
      return res.status(500).json({ message: 'Failed to verify announcement' });
    }

    const ok = await Announcement.markRead(req.user.user_id, id);
    console.log(`announcementController.markAsRead: user=${req.user.user_id} announcement=${id} ok=${ok}`);
    // Return current read ids to help clients sync immediately
    try {
      const ids = await Announcement.getReadIdsForUser(req.user.user_id);
      res.json({ message: 'OK', read_ids: ids });
    } catch (e) {
      res.json({ message: 'OK' });
    }
  } catch (error) {
    console.error('Mark announcement read error:', error);
    res.status(500).json({ message: 'Failed to mark read' });
  }
};

// 使用者：取得自己已讀的公告 IDs
exports.getReadsForUser = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const ids = await Announcement.getReadIdsForUser(req.user.user_id);
    console.log(`announcementController.getReadsForUser: user=${req.user.user_id} read_count=${ids.length}`);
    res.json({ read_ids: ids });
  } catch (error) {
    console.error('Get reads for user error:', error);
    res.status(500).json({ message: 'Failed to fetch read ids' });
  }
};
