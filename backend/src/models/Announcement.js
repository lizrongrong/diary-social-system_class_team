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

  static async getById(announcementId) {
    const [rows] = await db.query(
      `SELECT a.*, u.username AS admin_username
       FROM announcements a
       JOIN users u ON a.admin_id = u.user_id
       WHERE a.announcement_id = ?
       LIMIT 1`,
      [announcementId]
    );
    return rows[0] || null;
  }

  // Count unread announcements for a given user.
  // This expects a per-user read tracking table `announcement_reads(announcement_id, user_id, read_at)`.
  static async countUnreadForUser(userId) {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM announcements a
         WHERE a.is_active = TRUE
           AND (a.published_at IS NULL OR a.published_at <= NOW())
           AND (a.expires_at IS NULL OR a.expires_at > NOW())
           AND NOT EXISTS (
             SELECT 1 FROM announcement_reads ar
             WHERE ar.announcement_id = a.announcement_id
               AND ar.user_id = ?
           )`,
        [userId]
      );
      return rows[0]?.cnt || 0;
    } catch (err) {
      // If the announcement_reads table doesn't exist (or other schema issues),
      // degrade gracefully by returning 0 unread instead of throwing.
      // This keeps the API usable without requiring migrations.
      if (err && err.code === 'ER_NO_SUCH_TABLE') {
        return 0;
      }
      console.error('countUnreadForUser error:', err);
      return 0;
    }
  }

  // Mark an announcement as read for user (idempotent)
  static async markAsRead(announcementId, userId) {
    try {
      // insert if not exists
      await db.query(
        `INSERT IGNORE INTO announcement_reads (announcement_id, user_id, read_at)
         VALUES (?, ?, NOW())`,
        [announcementId, userId]
      );
    } catch (err) {
      // If table doesn't exist or schema error, degrade to no-op.
      if (err && err.code === 'ER_NO_SUCH_TABLE') {
        return;
      }
      console.error('markAsRead error:', err);
    }
  }
}

module.exports = Announcement;
