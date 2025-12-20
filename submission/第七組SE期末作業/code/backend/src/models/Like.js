const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Like {
  static async toggle(targetType, targetId, userId) {
    const existing = await db.execute(
      'SELECT like_id FROM likes WHERE target_type = ? AND target_id = ? AND user_id = ?',
      [targetType, targetId, userId]
    );
    
    if (existing[0].length > 0) {
      await db.execute('DELETE FROM likes WHERE like_id = ?', [existing[0][0].like_id]);
      return { liked: false };
    } else {
      const likeId = uuidv4();
      await db.execute(
        'INSERT INTO likes (like_id, target_type, target_id, user_id) VALUES (?, ?, ?, ?)',
        [likeId, targetType, targetId, userId]
      );
      return { liked: true, like_id: likeId };
    }
  }

  static async count(targetType, targetId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM likes WHERE target_type = ? AND target_id = ?',
      [targetType, targetId]
    );
    return rows[0].count;
  }

  static async isLiked(targetType, targetId, userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM likes WHERE target_type = ? AND target_id = ? AND user_id = ?',
      [targetType, targetId, userId]
    );
    return rows[0].count > 0;
  }
}

module.exports = Like;
