const db = require('../config/db');
const User = require('../models/User');

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

    let query = `SELECT user_id, username, email, role, status, profile_image, created_at FROM users`;
    const params = [];

    if (search) {
      // Allow searching by username, email or user_id to support admin searches
      query += ' WHERE username LIKE ? OR email LIKE ? OR user_id LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
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
        countQuery += ' WHERE username LIKE ? OR email LIKE ? OR user_id LIKE ?';
        const [countResult] = await db.execute(countQuery, [`%${search}%`, `%${search}%`, `%${search}%`]);
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

    if (!['active', 'suspended', 'banned', 'deleted'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (status === 'deleted') {
      // 執行硬刪除 (Hard Delete)
      const success = await User.deleteAccount(userId);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({ message: 'User account and associated data permanently deleted' });
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

// ========== Analytics endpoints ===========
// Helper: compute period start date SQL expression based on period param
const computePeriodStartSQL = (period) => {
  switch ((period || '').toLowerCase()) {
    case 'day':
      return "DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
    case 'week':
      return "DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    case 'month':
      return "DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    case 'year':
    default:
      return "DATE_SUB(CURDATE(), INTERVAL 365 DAY)";
  }
};

// 會員分析：回傳四個族群的數量 (existing_male, existing_female, new_male, new_female)
exports.getMemberAnalytics = async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const startParam = req.query.start; // optional YYYY-MM-DD
    const endParam = req.query.end; // optional YYYY-MM-DD

    if (isValidDateString(startParam) && isValidDateString(endParam)) {
      const start = startParam;
      const end = endParam;
      // existing: created before start; new: created between start and end
      const sql = `
        SELECT
          SUM(gender = 'male' AND created_at < ?) AS existing_male,
          SUM(gender = 'female' AND created_at < ?) AS existing_female,
          SUM(gender = 'male' AND created_at >= ? AND created_at <= ?) AS new_male,
          SUM(gender = 'female' AND created_at >= ? AND created_at <= ?) AS new_female
        FROM users
        WHERE status != 'deleted'
      `;
      const params = [start, start, start, end, start, end];
      const [rows] = await db.query(sql, params);
      const r = rows && rows[0] ? rows[0] : { existing_male: 0, existing_female: 0, new_male: 0, new_female: 0 };
      return res.json({ period, start, end, ...r });
    }

    // Fallback: use period-based window
    const periodStartSQL = computePeriodStartSQL(period);
    const sql = `
      SELECT
        SUM(gender = 'male' AND created_at < ${periodStartSQL}) AS existing_male,
        SUM(gender = 'female' AND created_at < ${periodStartSQL}) AS existing_female,
        SUM(gender = 'male' AND created_at >= ${periodStartSQL}) AS new_male,
        SUM(gender = 'female' AND created_at >= ${periodStartSQL}) AS new_female
      FROM users
      WHERE status != 'deleted'
    `;
    const [rows] = await db.query(sql);
    const r = rows && rows[0] ? rows[0] : { existing_male: 0, existing_female: 0, new_male: 0, new_female: 0 };
    res.json({ period, ...r });
  } catch (err) {
    console.error('getMemberAnalytics error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 日記分析：回傳時間序列 (labels, data) 依 period
exports.getDiaryAnalytics = async (req, res) => {
  try {
    const period = (req.query.period || 'month').toLowerCase();
    const startParam = req.query.start;
    const endParam = req.query.end;

    // determine grouping format
    let groupByFmt = '%Y-%m-%d';
    if (period === 'year') groupByFmt = '%Y-%m';

    if (isValidDateString(startParam) && isValidDateString(endParam)) {
      const start = startParam;
      const end = endParam;
      // Query grouped counts between start and end
      const sql = `
        SELECT DATE_FORMAT(created_at, '${groupByFmt}') AS label, COUNT(*) AS count
        FROM diaries
        WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
        GROUP BY label
        ORDER BY label ASC
      `;
      const [rows] = await db.query(sql, [start, end]);

      // Generate full label sequence and map counts
      const labels = groupByFmt === '%Y-%m' ? generateMonthLabels(start, end) : generateDayLabels(start, end);
      const map = new Map();
      for (const r of rows) map.set(r.label, r.count);
      const data = labels.map(l => map.get(l) || 0);
      return res.json({ period, start, end, labels, data });
    }

    // Fallback: use rangeDays based on period
    let rangeDays = 30;
    if (period === 'year') rangeDays = 365;
    else if (period === 'week') rangeDays = 7;

    const sql = `
      SELECT DATE_FORMAT(created_at, '${groupByFmt}') AS label, COUNT(*) AS count
      FROM diaries
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${rangeDays} DAY)
      GROUP BY label
      ORDER BY label ASC
    `;
    const [rows] = await db.query(sql);
    const labels = rows.map(r => r.label);
    const data = rows.map(r => r.count);
    res.json({ period, labels, data });
  } catch (err) {
    console.error('getDiaryAnalytics error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 卡牌分析：回傳有抽與沒抽的人數（相對於整體使用者數）
exports.getCardAnalytics = async (req, res) => {
  try {
    const period = (req.query.period || 'month').toLowerCase();
    const startParam = req.query.start;
    const endParam = req.query.end;

    const [totalRows] = await db.query("SELECT COUNT(*) AS c FROM users WHERE status != 'deleted'");
    const totalUsers = (totalRows && totalRows[0] && totalRows[0].c) || 0;
    console.log('getCardAnalytics totalUsers:', totalUsers);

    let drawn = 0;
    if (isValidDateString(startParam) && isValidDateString(endParam)) {
      const start = startParam;
      const end = endParam;
      // get drawn per day within range
      const sql = `SELECT DATE_FORMAT(draw_date, '%Y-%m-%d') AS label, COUNT(DISTINCT user_id) AS drawn
         FROM user_card_draws
         WHERE DATE(draw_date) >= ? AND DATE(draw_date) <= ?
         GROUP BY label
         ORDER BY label ASC`;
      console.log('getCardAnalytics executing SQL:', sql, 'params:', [start, end]);
      const [rows] = await db.query(sql, [start, end]);
      console.log('getCardAnalytics rows fetched:', rows);
      const labels = generateDayLabels(start, end);
      const map = new Map();
      // tolerant mapping: accept many possible count fields and normalize label keys
      for (const r of rows) {
        const rawLabel = r.label || r.draw_date || r.date || '';
        // try to extract YYYY-MM-DD
        let key = '';
        try {
          const s = String(rawLabel);
          const m = s.match(/\d{4}-\d{2}-\d{2}/);
          if (m) key = m[0];
          else {
            // try to parse as Date and format
            const d = new Date(s);
            if (!isNaN(d)) key = d.toISOString().slice(0,10);
            else key = s.slice(0,10);
          }
        } catch (e) { key = String(rawLabel || '').slice(0,10); }
        const val = Number(r.drawn || r.drawn_rows || r.count || r.c || r.users || r.user_count || 0) || 0;
        // store multiple keys for tolerant lookup
        map.set(key, val);
        map.set(String(rawLabel), val);
        // also store slash variant
        map.set(String(key).replace(/-/g, '/'), val);
      }
      const drawnData = labels.map(l => {
        if (map.has(l)) return map.get(l) || 0;
        const iso = (String(l).match(/\d{4}-\d{2}-\d{2}/) || [String(l).slice(0,10)])[0];
        if (map.has(iso)) return map.get(iso) || 0;
        if (map.has(String(l).replace(/-/g, '/'))) return map.get(String(l).replace(/-/g, '/')) || 0;
        return 0;
      });
      const notDrawnData = drawnData.map(v => Math.max(0, totalUsers - v));
      return res.json({ period, start, end, labels, drawnData, notDrawnData, totalUsers, rawRows: rows });
    }

    // fallback: rangeDays
    let rangeDays = 30;
    if (period === 'year') rangeDays = 365;
    else if (period === 'week') rangeDays = 7;
    else if (period === 'day') rangeDays = 1;

    // compute labels for last rangeDays
    const end = new Date();
    const startDateObj = new Date();
    startDateObj.setDate(end.getDate() - (rangeDays - 1));
    const endStr = end.toISOString().slice(0, 10);
    const startStr = startDateObj.toISOString().slice(0, 10);

    const fallbackSql = `SELECT DATE_FORMAT(draw_date, '%Y-%m-%d') AS label, COUNT(DISTINCT user_id) AS drawn
       FROM user_card_draws
       WHERE DATE(draw_date) >= DATE_SUB(CURDATE(), INTERVAL ${rangeDays} DAY)
       GROUP BY label
       ORDER BY label ASC`;
     console.log('getCardAnalytics executing fallback SQL:', fallbackSql);
     const [rows] = await db.query(fallbackSql);
     console.log('getCardAnalytics fallback rows fetched:', rows);
    const labels = generateDayLabels(startStr, endStr);
    const map = new Map();
    for (const r of rows) {
      const rawLabel = r.label || r.draw_date || r.date || '';
      let key = '';
      try {
        const s = String(rawLabel);
        const m = s.match(/\d{4}-\d{2}-\d{2}/);
        if (m) key = m[0];
        else {
          const d = new Date(s);
          if (!isNaN(d)) key = d.toISOString().slice(0,10);
          else key = s.slice(0,10);
        }
      } catch (e) { key = String(rawLabel || '').slice(0,10); }
      const val = Number(r.drawn || r.drawn_rows || r.count || r.c || r.users || r.user_count || 0) || 0;
      map.set(key, val);
      map.set(String(rawLabel), val);
      map.set(String(key).replace(/-/g, '/'), val);
    }
    const drawnData = labels.map(l => {
      if (map.has(l)) return map.get(l) || 0;
      const iso = (String(l).match(/\d{4}-\d{2}-\d{2}/) || [String(l).slice(0,10)])[0];
      if (map.has(iso)) return map.get(iso) || 0;
      if (map.has(String(l).replace(/-/g, '/'))) return map.get(String(l).replace(/-/g, '/')) || 0;
      return 0;
    });
    const notDrawnData = drawnData.map(v => Math.max(0, totalUsers - v));
    res.json({ period, labels, drawnData, notDrawnData, totalUsers, rawRows: rows });
  } catch (err) {
    console.error('getCardAnalytics error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
};

const isValidDateString = (s) => {
  if (!s) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
};

const buildDateRangeDefaults = (period) => {
  const end = new Date();
  let start = new Date();
  switch ((period || 'month').toLowerCase()) {
    case 'day':
      start.setDate(end.getDate() - 1);
      break;
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'year':
      start.setFullYear(end.getFullYear() - 1);
      break;
    case 'month':
    default:
      start.setDate(end.getDate() - 30);
      break;
  }
  const toYMD = (d) => d.toISOString().slice(0, 10);
  return { start: toYMD(start), end: toYMD(end) };
};

const padZero = (v) => (v < 10 ? `0${v}` : `${v}`);

const generateDayLabels = (startStr, endStr) => {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  const labels = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = padZero(d.getMonth() + 1);
    const day = padZero(d.getDate());
    labels.push(`${y}-${m}-${day}`);
  }
  return labels;
};

const generateMonthLabels = (startStr, endStr) => {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  const labels = [];
  let y = start.getFullYear();
  let m = start.getMonth();
  while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
    labels.push(`${y}-${padZero(m + 1)}`);
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return labels;
};