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
    console.log('admin.getUsers called - query:', req.query);
    const parsedLimit = parseInt(req.query.limit, 10);
    const parsedOffset = parseInt(req.query.offset, 10);
    const limit = Number.isFinite(parsedLimit) && !isNaN(parsedLimit) ? Math.max(1, Math.min(100, parsedLimit)) : 20;
    const offset = Number.isFinite(parsedOffset) && !isNaN(parsedOffset) ? Math.max(0, parsedOffset) : 0;
    const search = (req.query.search || '').toString().trim();

    let query = `SELECT user_id, username, email, role, status, created_at FROM users`;
    const params = [];

    if (search) {
      query += ' WHERE username LIKE ? OR email LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    // Embed sanitized limit/offset directly to avoid driver issues with binding LIMIT/OFFSET
    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    let users = [];
    let total = 0;

    try {
      const [userRows] = await db.execute(query, params);
      users = userRows || [];
      console.log(`admin.getUsers: fetched ${users.length} users (limit=${limit} offset=${offset})`);

      // 獲取總數
      let countQuery = 'SELECT COUNT(*) as count FROM users';
      if (search) {
        countQuery += ' WHERE username LIKE ? OR email LIKE ?';
        const [countResult] = await db.execute(countQuery, [`%${search}%`, `%${search}%`]);
        total = (countResult && countResult[0] && countResult[0].count) || users.length;
      } else {
        const [countResult] = await db.execute(countQuery);
        total = (countResult && countResult[0] && countResult[0].count) || users.length;
      }

      res.json({ users, total });
    } catch (dbErr) {
      // Log full DB error and return an empty result set to avoid breaking the frontend
      console.error('DB error in getUsers:', dbErr && dbErr.stack ? dbErr.stack : dbErr);
      res.json({ users: [], total: 0 });
    }
  } catch (error) {
    console.error('Get users unexpected error:', error && error.stack ? error.stack : error);
    // Unexpected error at controller level - return empty list to frontend
    res.json({ users: [], total: 0 });
  }
};

// 獲取日記列表（管理員視圖）
exports.getDiaries = async (req, res) => {
  // declare these in outer scope so error logging can access them
  let limit;
  let offset;
  let hasStatus = false;
  let query = null;

  try {
    console.log('admin.getDiaries called - query:', req.query);
    limit = Number.isFinite(parseInt(req.query.limit, 10)) ? Math.max(1, Math.min(100, parseInt(req.query.limit, 10))) : 20;
    offset = Number.isFinite(parseInt(req.query.offset, 10)) ? Math.max(0, parseInt(req.query.offset, 10)) : 0;

    // Detect whether the 'status' column exists in the diaries table to support older schemas
    try {
      const [cols] = await db.execute("SHOW COLUMNS FROM diaries LIKE 'status'");
      hasStatus = Array.isArray(cols) && cols.length > 0;
    } catch (e) {
      hasStatus = false;
    }

    // Use LEFT JOIN and COALESCE for username to tolerate mismatched/absent users
    const selectFields = hasStatus
      ? 'd.diary_id, d.title, d.visibility, d.status, d.created_at, COALESCE(u.username, d.user_id) AS username'
      : 'd.diary_id, d.title, d.visibility, d.created_at, COALESCE(u.username, d.user_id) AS username';

    query = `
      SELECT ${selectFields}
      FROM diaries d
      LEFT JOIN users u ON d.user_id = u.user_id
      ORDER BY d.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Execute query - wrap DB call to catch DB errors separately
    let diaries = [];
    try {
      const [rows] = await db.execute(query);
      diaries = rows || [];
      console.log(`admin.getDiaries: fetched ${diaries.length} diaries (limit=${limit} offset=${offset})`);
    } catch (dbErr) {
      console.error('DB error while fetching diaries:', dbErr && dbErr.stack ? dbErr.stack : dbErr);
      // Return empty dataset to avoid 500 on frontend (temporary defensive fallback)
      return res.json({ diaries: [], total: 0 });
    }

    // total count
    let total = 0;
    try {
      const [countResult] = await db.execute('SELECT COUNT(*) as count FROM diaries');
      total = (countResult && countResult[0] && countResult[0].count) || diaries.length;
    } catch (cntErr) {
      console.error('DB error while counting diaries:', cntErr && cntErr.stack ? cntErr.stack : cntErr);
      total = diaries.length;
    }

    return res.json({ diaries, total });
  } catch (error) {
    // Enhanced debug logging for diagnostics
    try {
      console.error('Get diaries error - context:', {
        queryString: query || '<not-built>',
        reqQuery: req.query,
        limit: typeof limit !== 'undefined' ? limit : '<undef>',
        offset: typeof offset !== 'undefined' ? offset : '<undef>',
        hasStatus: typeof hasStatus !== 'undefined' ? hasStatus : '<undef>'
      });
    } catch (ctxErr) {
      // ignore
    }

    // Print SQL-specific error info when available
    if (error && error.stack) console.error(error.stack);
    if (error && error.sqlMessage) console.error('SQL message:', error.sqlMessage);

    // Defensive fallback
    return res.json({ diaries: [], total: 0 });
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