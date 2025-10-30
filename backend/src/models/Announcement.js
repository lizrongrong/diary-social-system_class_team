const db = require('../config/db');

class Announcement {
  static async findActive(limit = 10, offset = 0) {
    const [rows] = await db.query(
      `SELECT a.*, u.display_name AS admin_display_name
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
}

module.exports = Announcement;
