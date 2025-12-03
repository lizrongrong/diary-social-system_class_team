const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Notification {
  static async create(userId, type, title, content, sourceUserId = null, relatedDiaryId = null) {
    const notificationId = uuidv4();
    try {
      await db.execute(
        'INSERT INTO notifications (notification_id, user_id, type, title, content, source_user_id, related_diary_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [notificationId, userId, type, title, content, sourceUserId, relatedDiaryId]
      );
      console.log('Notification.create: inserted id=', notificationId, 'user=', userId, 'type=', type);
      return notificationId;
    } catch (err) {
      console.error('Notification.create error:', err && err.message ? err.message : err);
      return null;
    }
  }

  static async findByUser(userId, limit = 20, offset = 0) {
    // Ensure numeric limit/offset to avoid prepared-statement execution errors
    const l = Number.isFinite(Number(limit)) ? Math.max(0, parseInt(limit, 10)) : 20;
    const o = Number.isFinite(Number(offset)) ? Math.max(0, parseInt(offset, 10)) : 0;
    const finalQuery = `SELECT n.*, u.username, u.profile_image as avatar_url FROM notifications n LEFT JOIN users u ON n.source_user_id = u.user_id WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ${l} OFFSET ${o}`;
    const [rows] = await db.query(finalQuery, [userId]);
    return rows;
  }

  static async markAsRead(notificationId) {
    const [result] = await db.execute(
      'UPDATE notifications SET is_read = TRUE WHERE notification_id = ?',
      [notificationId]
    );
    return result.affectedRows > 0;
  }

  static async markAllAsRead(userId) {
    const [result] = await db.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return result.affectedRows;
  }

  static async countUnread(userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return rows[0].count;
  }

  static async delete(notificationId) {
    const [result] = await db.execute('DELETE FROM notifications WHERE notification_id = ?', [notificationId]);
    return result.affectedRows > 0;
  }
}

module.exports = Notification;
