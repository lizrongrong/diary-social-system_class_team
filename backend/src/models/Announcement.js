const db = require('../config/db');

class Announcement {
  static async findActive(limit = 10, offset = 0) {
    const [rows] = await db.query(
      `SELECT a.*, u.username AS admin_username
       FROM announcements a
       JOIN users u ON a.admin_id = u.user_id
       WHERE a.is_active = TRUE
         AND (a.published_at IS NULL OR a.published_at <= NOW())
         AND (a.expires_at IS NULL OR a.expires_at > NOW())
       ORDER BY 
         FIELD(a.priority, 'high','normal','low'),
         COALESCE(a.published_at, a.created_at) DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  }

  static async findAll(limit = 50, offset = 0) {
    const [rows] = await db.query(
      `SELECT a.*, u.username AS admin_username
       FROM announcements a
       JOIN users u ON a.admin_id = u.user_id
       ORDER BY COALESCE(a.published_at, a.created_at) DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  }

  static async create({ admin_id, title, content, priority = 'normal', is_active = true, published_at = null, expires_at = null }) {
    const announcementId = require('uuid').v4();
    const sql = `
      INSERT INTO announcements (
        announcement_id, admin_id, title, content, priority, is_active, published_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.execute(sql, [announcementId, admin_id, title, content, priority, is_active ? 1 : 0, published_at, expires_at]);
    return announcementId;
  }

  static async deleteById(announcementId) {
    const [result] = await db.execute('DELETE FROM announcements WHERE announcement_id = ?', [announcementId]);
    return result.affectedRows > 0;
  }
}

module.exports = Announcement;
