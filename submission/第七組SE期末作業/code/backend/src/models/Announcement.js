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

  static async findById(announcementId) {
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

  static async updateById(announcementId, { title, content, priority, is_active, published_at, expires_at, admin_id }) {
    const sql = `
      UPDATE announcements
      SET title = ?, content = ?, priority = ?, is_active = ?, published_at = ?, expires_at = ?
      WHERE announcement_id = ?
    `;
    const params = [title, content, priority || 'normal', is_active ? 1 : 0, published_at || null, expires_at || null, announcementId];
    const [result] = await db.execute(sql, params);
    return result.affectedRows > 0;
  }

  // -- per-user read tracking (optional table 'announcement_reads') --
  static async markRead(userId, announcementId) {
    try {
      // ensure announcement_reads table exists (idempotent)
      const createSql = `
        CREATE TABLE IF NOT EXISTS announcement_reads (
          user_id VARCHAR(64) NOT NULL,
          announcement_id CHAR(36) NOT NULL,
          read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, announcement_id),
          INDEX idx_user (user_id),
          INDEX idx_announcement (announcement_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `;
      await db.execute(createSql);

      const sql = `INSERT INTO announcement_reads (user_id, announcement_id, read_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE read_at = NOW()`;
      const [result] = await db.execute(sql, [userId, announcementId]);
      // result may be an OkPacket; log affectedRows for visibility
      if (result && (result.affectedRows !== undefined)) {
        console.log(`Announcement.markRead: user=${userId} announcement=${announcementId} affectedRows=${result.affectedRows}`);
      } else {
        console.log(`Announcement.markRead: user=${userId} announcement=${announcementId} result=`, result);
      }
      return true;
    } catch (e) {
      console.error('Announcement.markRead error:', e);
      // If table doesn't exist or other DB issues, return false (client will fallback to localStorage)
      return false;
    }
  }

  static async getReadIdsForUser(userId) {
    try {
      // Ensure table exists to avoid query errors
      const createSql = `
        CREATE TABLE IF NOT EXISTS announcement_reads (
          user_id VARCHAR(64) NOT NULL,
          announcement_id CHAR(36) NOT NULL,
          read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, announcement_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `;
      await db.execute(createSql);

      const [rows] = await db.query('SELECT announcement_id FROM announcement_reads WHERE user_id = ?', [userId]);
      return rows.map(r => r.announcement_id);
    } catch (e) {
      return [];
    }
  }

  static async clearReadsForAnnouncement(announcementId) {
    try {
      // ensure table exists
      const createSql = `
        CREATE TABLE IF NOT EXISTS announcement_reads (
          user_id VARCHAR(64) NOT NULL,
          announcement_id CHAR(36) NOT NULL,
          read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, announcement_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `;
      await db.execute(createSql);

      const [result] = await db.execute('DELETE FROM announcement_reads WHERE announcement_id = ?', [announcementId]);
      return result.affectedRows >= 0;
    } catch (e) {
      return false;
    }
  }

  static async deleteById(announcementId) {
    const [result] = await db.execute('DELETE FROM announcements WHERE announcement_id = ?', [announcementId]);
    return result.affectedRows > 0;
  }
}

module.exports = Announcement;
