const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Comment {
  static async create(diaryId, userId, content, parentCommentId = null) {
    const commentId = uuidv4();
    await db.execute(
      'INSERT INTO comments (comment_id, diary_id, user_id, content, parent_comment_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [commentId, diaryId, userId, content, parentCommentId, 'active']
    );
    return commentId;
  }

  static async findById(commentId) {
    const [rows] = await db.execute(
      'SELECT c.*, u.username, u.display_name, u.avatar_url FROM comments c JOIN users u ON c.user_id = u.user_id WHERE c.comment_id = ? AND c.status = ?',
      [commentId, 'active']
    );
    return rows[0] || null;
  }

  static async findByDiary(diaryId) {
    const [rows] = await db.execute(
      'SELECT c.*, u.username, u.display_name, u.avatar_url FROM comments c JOIN users u ON c.user_id = u.user_id WHERE c.diary_id = ? AND c.status = ? ORDER BY c.created_at ASC',
      [diaryId, 'active']
    );
    return rows;
  }

  static async delete(commentId) {
    const [result] = await db.execute(
      'UPDATE comments SET status = ? WHERE comment_id = ?',
      ['deleted', commentId]
    );
    return result.affectedRows > 0;
  }

  static async isOwner(commentId, userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM comments WHERE comment_id = ? AND user_id = ?',
      [commentId, userId]
    );
    return rows[0].count > 0;
  }
}

module.exports = Comment;
