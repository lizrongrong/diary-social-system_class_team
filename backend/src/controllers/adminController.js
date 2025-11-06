const db = require('../config/db');

// 獲取系統統計數據
exports.getStats = async (req, res) => {
  try {
    // 總用戶數
    const [totalUsersResult] = await db.execute('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult[0].count;

    // 總日記數
    const [totalDiariesResult] = await db.execute('SELECT COUNT(*) as count FROM diaries');
    const totalDiaries = totalDiariesResult[0].count;

    // 總留言數
    const [totalCommentsResult] = await db.execute('SELECT COUNT(*) as count FROM comments');
    const totalComments = totalCommentsResult[0].count;

    // 總按讚數
    const [totalLikesResult] = await db.execute('SELECT COUNT(*) as count FROM likes');
    const totalLikes = totalLikesResult[0].count;

    // 今日新增用戶
    const [newUsersTodayResult] = await db.execute(
      'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()'
    );
    const newUsersToday = newUsersTodayResult[0].count;

    // 今日新增日記
    const [newDiariesTodayResult] = await db.execute(
      'SELECT COUNT(*) as count FROM diaries WHERE DATE(created_at) = CURDATE()'
    );
    const newDiariesToday = newDiariesTodayResult[0].count;

    // 活躍用戶（最近7天有活動，使用 updated_at 作為代理）
    const [activeUsersResult] = await db.execute(
      'SELECT COUNT(*) as count FROM users WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    const activeUsers = activeUsersResult[0].count;

    // 待審核內容（這裡假設有 reports 表）
    const reportedContent = 0; // 需要實作 reports 功能

    res.json({
      stats: {
        totalUsers,
        totalDiaries,
        totalComments,
        totalLikes,
        newUsersToday,
        newDiariesToday,
        activeUsers,
        reportedContent
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 獲取用戶列表
exports.getUsers = async (req, res) => {
  try {
    const parsedLimit = parseInt(req.query.limit);
    const parsedOffset = parseInt(req.query.offset);
    const limit = Math.max(1, Math.min(100, isNaN(parsedLimit) ? 20 : parsedLimit));
    const offset = Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset);
    const search = req.query.search || '';

    let query = `
      SELECT user_id, username, email, role, status, created_at
      FROM users
    `;
    const params = [];

    if (search) {
      query += ' WHERE username LIKE ? OR email LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [users] = await db.execute(query, params);

    // 獲取總數
    let countQuery = 'SELECT COUNT(*) as count FROM users';
    if (search) {
      countQuery += ' WHERE username LIKE ? OR email LIKE ?';
      const [countResult] = await db.execute(countQuery, [
        `%${search}%`,
        `%${search}%`
      ]);
      res.json({ users, total: countResult[0].count });
    } else {
      const [countResult] = await db.execute(countQuery);
      res.json({ users, total: countResult[0].count });
    }
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 獲取日記列表（管理員視圖）
exports.getDiaries = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const [diaries] = await db.execute(
      `SELECT d.diary_id, d.title, d.visibility, d.status, d.created_at, 
              u.username
       FROM diaries d
       JOIN users u ON d.user_id = u.user_id
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await db.execute('SELECT COUNT(*) as count FROM diaries');
    
    res.json({ 
      diaries,
      total: countResult[0].count
    });
  } catch (error) {
    console.error('Get diaries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 更新用戶狀態
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await db.execute(
      'UPDATE users SET status = ? WHERE user_id = ?',
      [status, userId]
    );

    res.json({ message: 'User status updated' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 刪除日記（管理員）
exports.deleteDiary = async (req, res) => {
  try {
    const { diaryId } = req.params;

    await db.execute('DELETE FROM diaries WHERE diary_id = ?', [diaryId]);

    res.json({ message: 'Diary deleted' });
  } catch (error) {
    console.error('Delete diary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = exports;