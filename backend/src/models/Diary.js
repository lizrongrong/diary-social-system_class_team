const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// 輔助：對排序欄位與排序方向做白名單檢查，避免 SQL 注入或非法欄位導致查詢失敗
const ALLOWED_ORDER_COLUMNS = new Set(['created_at', 'published_at', 'updated_at', 'diary_id', 'title']);
const sanitizeOrderBy = (col) => (ALLOWED_ORDER_COLUMNS.has(col) ? col : 'created_at');
const sanitizeOrder = (ord) => (String(ord).toUpperCase() === 'ASC' ? 'ASC' : 'DESC');
const toSafeInt = (v, fallback) => {
  const n = parseInt(v)
  return Number.isNaN(n) ? fallback : n
}

// cached flag to check whether 'status' column exists in diaries table
let HAS_STATUS_COLUMN = null
const checkStatusColumn = async () => {
  if (HAS_STATUS_COLUMN !== null) return HAS_STATUS_COLUMN
  try {
    const [rows] = await db.query("SHOW COLUMNS FROM diaries LIKE 'status'")
    HAS_STATUS_COLUMN = Array.isArray(rows) && rows.length > 0
  } catch (err) {
    // if any error (e.g., table doesn't exist), assume column missing
    HAS_STATUS_COLUMN = false
  }
  return HAS_STATUS_COLUMN
}

/**
 * Diary 資料模型
 * 處理日記相關的資料庫操作
 */
class Diary {
  /**
    * 建立新日記
    * @param {Object} diaryData - 日記資料
    * @returns {Promise<string>} 日記 ID
    */
  static async create(diaryData) {
    const diaryId = uuidv4();
    const now = new Date();

    // if the schema has status/published_at columns, include them; otherwise omit
    const hasStatus = await checkStatusColumn();

    if (hasStatus) {
      const query = `
        INSERT INTO diaries (
          diary_id, user_id, title, content, visibility, status,
          created_at, updated_at, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const status = diaryData.status || 'published';
      const published_at = status === 'published' ? now : null;

      const values = [
        diaryId,
        diaryData.user_id,
        diaryData.title,
        diaryData.content,
        diaryData.visibility || 'private',
        status,
        now,
        now,
        published_at
      ];

      await db.execute(query, values);
    } else {
      // older schema without status/published_at
      const query = `
        INSERT INTO diaries (
          diary_id, user_id, title, content, visibility,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        diaryId,
        diaryData.user_id,
        diaryData.title,
        diaryData.content,
        diaryData.visibility || 'private',
        now,
        now
      ];

      await db.execute(query, values);
    }

    return diaryId;
  }

  /**
    * 根據 ID 查找日記
    * @param {string} diaryId - 日記 ID
    * @returns {Promise<Object|null>}
    */
  static async findById(diaryId) {
    const query = `
   SELECT d.*, u.username, u.profile_image AS avatar_url
      FROM diaries d
      JOIN users u ON d.user_id = u.user_id
      WHERE d.diary_id = ?`;

    // if status column exists, filter out deleted
    const hasStatus = await checkStatusColumn();
    if (hasStatus) {
      const queryWithStatus = query + " AND d.status != 'deleted'";
      const [rows] = await db.execute(queryWithStatus, [diaryId]);
      return rows[0] || null;
    }

    const [rows] = await db.execute(query, [diaryId]);
    return rows[0] || null;
  }

  /**
    * 取得使用者的日記列表
    * @param {string} userId - 使用者 ID
    * @param {Object} options - 查詢選項
    * @returns {Promise<Array>}
    */
  static async findByUserId(userId, options = {}) {
    const {
      visibility = null,
      status = 'published', // null 表示不限制狀態
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC'
    } = options;

    // sanitize inputs
    const safeOrderBy = sanitizeOrderBy(orderBy)
    const safeOrder = sanitizeOrder(order)
    const limitNum = Math.max(1, Math.min(100, toSafeInt(limit, 20)))
    const offsetNum = Math.max(0, toSafeInt(offset, 0))

    let query = `
   SELECT d.*, u.username, u.profile_image AS avatar_url
      FROM diaries d
      JOIN users u ON d.user_id = u.user_id
      WHERE d.user_id = ?
    `;

    const params = [userId];

    // only add status filter if the column exists in schema
    const hasStatus = await checkStatusColumn()
    if (hasStatus && status !== null) {
      query += ` AND d.status = ?`;
      params.push(status);
    }

    if (visibility) {
      query += ` AND d.visibility = ?`;
      params.push(visibility);
    }

    // --- 修正點 (1) ---
    // 將 limit/offset 變數直接寫入 SQL 字串
    query += ` ORDER BY d.${safeOrderBy} ${safeOrder} LIMIT ${limitNum} OFFSET ${offsetNum}`;
    // 不再將 limitNum, offsetNum 傳入 params
    // params.push(limitNum, offsetNum); // <-- 移除

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
    * 取得公開日記列表（探索頁面）
    * @param {Object} options - 查詢選項
    * @returns {Promise<Array>}
    */
  static async findPublic(options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        orderBy = 'created_at',
        order = 'DESC'
      } = options;

      // sanitize inputs
      const safeOrderBy = sanitizeOrderBy(orderBy)
      const safeOrder = sanitizeOrder(order)
      const limitNum = Math.max(1, Math.min(100, toSafeInt(limit, 20)))
      const offsetNum = Math.max(0, toSafeInt(offset, 0))

      // only include status filter if the column exists
      const hasStatus = await checkStatusColumn()
      const statusClause = hasStatus ? " AND d.status = 'published'" : ''

      // --- 修正點 (2) ---
      // 將 limit/offset 變數直接寫入 SQL 字串
      const query = `
          SELECT d.*, u.username, u.profile_image AS avatar_url
          FROM diaries d
          JOIN users u ON d.user_id = u.user_id
          WHERE d.visibility = 'public'${statusClause}
          ORDER BY d.${safeOrderBy} ${safeOrder}
          LIMIT ${limitNum} OFFSET ${offsetNum}
      `;

      // 查詢本身沒有 ? 佔位符，參數陣列為空
      const [rows] = await db.query(query, []);
      return rows;
    } catch (err) {
      console.error('Diary.findPublic error:', err && err.stack ? err.stack : err);
      throw err;
    }
  }

  /**
    * 更新日記
    * @param {string} diaryId - 日記 ID
    * @param {Object} updates - 要更新的欄位
    * @returns {Promise<boolean>}
    */
  static async update(diaryId, updates) {
    const allowedFields = ['title', 'content', 'visibility', 'status'];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        // status may not exist in older schema; we'll handle later
        if (key === 'status') {
          // add as a field for now; we'll remove if schema lacks status
          updateFields.push(`${key} = ?`);
          values.push(value);
        } else {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return false;
    }

    // If schema lacks status column, strip any status-related updates
    const hasStatus = await checkStatusColumn();
    if (!hasStatus) {
      // remove any status assignments and published_at
      for (let i = updateFields.length - 1; i >= 0; i--) {
        if (updateFields[i].startsWith('status =')) {
          updateFields.splice(i, 1);
          values.splice(i, 1);
        }
      }
    } else {
      // 如果狀態改為 published，更新 published_at
      if (updates.status === 'published') {
        updateFields.push('published_at = NOW()');
      }
    }

    values.push(diaryId);

    const query = `
      UPDATE diaries 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE diary_id = ?
    `;

    const [result] = await db.execute(query, values);
    return result.affectedRows > 0;
  }

  /**
    * 刪除日記（軟刪除）
    * @param {string} diaryId - 日記 ID
    * @returns {Promise<boolean>}
    */
  static async delete(diaryId) {
    const hasStatus = await checkStatusColumn();
    if (hasStatus) {
      const query = `
        UPDATE diaries 
        SET status = 'deleted', updated_at = NOW()
        WHERE diary_id = ?
      `;
      const [result] = await db.execute(query, [diaryId]);
      return result.affectedRows > 0;
    }

    // older schema without status => fallback to hard delete
    const query = `DELETE FROM diaries WHERE diary_id = ?`;
    const [result] = await db.execute(query, [diaryId]);
    return result.affectedRows > 0;
  }

  /**
    * 檢查日記所有權
    * @param {string} diaryId - 日記 ID
    * @param {string} userId - 使用者 ID
    * @returns {Promise<boolean>}
    */
  static async isOwner(diaryId, userId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM diaries 
      WHERE diary_id = ? AND user_id = ?
    `;

    const [rows] = await db.execute(query, [diaryId, userId]);
    return rows[0].count > 0;
  }

  /**
    * 統計使用者的日記數量
    * @param {string} userId - 使用者 ID
    * @returns {Promise<number>}
    */
  static async countByUserId(userId) {
    const hasStatus = await checkStatusColumn()
    const statusClause = hasStatus ? " AND status = 'published'" : ''

    const query = `
      SELECT COUNT(*) as count 
      FROM diaries 
      WHERE user_id = ?${statusClause}
    `;

    const [rows] = await db.execute(query, [userId]);
    return rows[0].count;
  }

  /**
    * 統計指定使用者的公開日記數量
    * @param {string} userId - 使用者 ID
    * @returns {Promise<number>} 公開日記數量
    */
  static async countPublicByUser(userId) {
    const hasStatus = await checkStatusColumn()
    const statusClause = hasStatus ? " AND status = 'published'" : ''

    const query = `
      SELECT COUNT(*) as count
      FROM diaries
      WHERE user_id = ? AND visibility = 'public'${statusClause}
    `;

    const [rows] = await db.execute(query, [userId]);
    return rows[0]?.count || 0;
  }

  /**
    * 新增日記標籤
    * @param {string} diaryId - 日記 ID
    * @param {string} tagType - 標籤類型 (emotion/weather/keyword)
    * @param {string} tagValue - 標籤值
    * @returns {Promise<string>} 標籤 ID
    */
  static async addTag(diaryId, tagType, tagValue) {
    const tagId = uuidv4();

    const query = `
      INSERT INTO diary_tags (tag_id, diary_id, tag_type, tag_value, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;

    await db.execute(query, [tagId, diaryId, tagType, tagValue]);
    return tagId;
  }

  /**
    * 取得日記的所有標籤
    * @param {string} diaryId - 日記 ID
    * @returns {Promise<Array>}
    */
  static async getTags(diaryId) {
    const query = `
      SELECT * FROM diary_tags 
      WHERE diary_id = ?
      ORDER BY created_at ASC
    `;

    const [rows] = await db.execute(query, [diaryId]);
    return rows;
  }

  /**
    * 刪除日記的所有標籤
    * @param {string} diaryId - 日記 ID
    * @returns {Promise<boolean>}
    */
  static async deleteTags(diaryId) {
    const query = `DELETE FROM diary_tags WHERE diary_id = ?`;
    const [result] = await db.execute(query, [diaryId]);
    return result.affectedRows >= 0;
  }

  /**
    * 新增日記附件
    * @param {string} diaryId - 日記 ID
    * @param {string} fileUrl - 檔案 URL
    * @param {string} fileType - 檔案類型
    * @param {number} fileSize - 檔案大小
    * @returns {Promise<string>} 附件 ID
    */
  static async addMedia(diaryId, fileUrl, fileType, fileSize) {
    const mediaId = uuidv4();

    const query = `
      INSERT INTO diary_media (media_id, diary_id, file_url, file_type, file_size, uploaded_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;

    await db.execute(query, [mediaId, diaryId, fileUrl, fileType, fileSize]);
    return mediaId;
  }

  /**
    * 取得日記的所有附件
    * @param {string} diaryId - 日記 ID
    * @returns {Promise<Array>}
    */
  static async getMedia(diaryId) {
    const query = `
      SELECT *
      FROM diary_media
      WHERE diary_id = ?
      ORDER BY uploaded_at ASC
    `;

    const [rows] = await db.execute(query, [diaryId]);
    return rows;
  }

  /**
    * 刪除單個附件
    * @param {string} mediaId - 附件 ID
    * @returns {Promise<boolean>}
    */
  static async deleteMedia(mediaId) {
    const query = `DELETE FROM diary_media WHERE media_id = ? `;
    const [result] = await db.execute(query, [mediaId]);
    return result.affectedRows > 0;
  }

  /**
    * 刪除日記的所有附件
    * @param {string} diaryId - 日記 ID
    * @returns {Promise<boolean>}
    */
  static async deleteAllMedia(diaryId) {
    const query = `DELETE FROM diary_media WHERE diary_id = ? `;
    const [result] = await db.execute(query, [diaryId]);
    return result.affectedRows >= 0;
  }

  /**
    * 搜尋公開日記
    * @param {Object} filters - 搜尋條件
    * @returns {Promise<Array>}
    */
  static async search(filters = {}) {
    const {
      keyword = null,
      emotion = null,
      weather = null,
      dateFrom = null,
      dateTo = null,
      sortBy = 'created_at', // created_at | like_count | comment_count
      limit = 20,
      offset = 0
    } = filters;

    const hasStatus = await checkStatusColumn()
    const statusClause = hasStatus ? " AND d.status = 'published'" : ''

    let query = `
      SELECT DISTINCT d.*, u.username, u.profile_image AS avatar_url
      FROM diaries d
      JOIN users u ON d.user_id = u.user_id
      LEFT JOIN diary_tags dt ON d.diary_id = dt.diary_id
      WHERE d.visibility = 'public'${statusClause}
    `;

    const params = [];

    // 關鍵字搜尋 (標題或內容)
    if (keyword) {
      query += ' AND (d.title LIKE ? OR d.content LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 情緒標籤篩選
    if (emotion) {
      query += ` AND EXISTS(
      SELECT 1 FROM diary_tags dt2 
        WHERE dt2.diary_id = d.diary_id 
        AND dt2.tag_type = 'emotion' 
        AND dt2.tag_value = ?
      )`;
      params.push(emotion);
    }

    // 天氣標籤篩選
    if (weather) {
      query += ` AND EXISTS(
        SELECT 1 FROM diary_tags dt3 
        WHERE dt3.diary_id = d.diary_id 
        AND dt3.tag_type = 'weather' 
        AND dt3.tag_value = ?
      )`;
      params.push(weather);
    }

    // 日期範圍篩選
    if (dateFrom) {
      query += ' AND d.created_at >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ' AND d.created_at <= ?';
      params.push(dateTo);
    }

    // 排序（允許特殊排序 like_count / comment_count，否則依白名單欄位排序）
    const safeLimit = Math.max(1, Math.min(100, toSafeInt(limit, 20)))
    const safeOffset = Math.max(0, toSafeInt(offset, 0))
    const safeSortBy = String(sortBy || 'created_at')

    if (safeSortBy === 'like_count') {
      query += ' ORDER BY (SELECT COUNT(*) FROM likes WHERE target_type = \'diary\' AND target_id = d.diary_id) DESC';
    } else if (safeSortBy === 'comment_count') {
      query += ' ORDER BY (SELECT COUNT(*) FROM comments WHERE diary_id = d.diary_id AND status = \'active\') DESC';
    } else {
      const safeOrderBy = sanitizeOrderBy('created_at')
      const safeOrderDir = 'DESC'
      query += ` ORDER BY d.${safeOrderBy} ${safeOrderDir}`;
    }

    // --- 修正點 (3) ---
    // 將 limit/offset 變數直接寫入 SQL 字串
    query += ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    // 不再將 limitNum, offsetNum 傳入 params
    // params.push(safeLimit, safeOffset); // <-- 移除

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
    * 取得指定使用者的公開日記
    * @param {string} userId - 使用者 ID
    * @param {number} limit - 限制數量
    * @param {number} offset - 偏移量
    * @returns {Promise<Array>}
    */
  static async findPublicByUser(userId, limit = 20, offset = 0) {
    const limitNum = Math.max(1, Math.min(100, toSafeInt(limit, 20)))
    const offsetNum = Math.max(0, toSafeInt(offset, 0))

    // (採用同學的 .catch() 版本，更安全)
    const hasStatus = await checkStatusColumn().catch(() => false)
    const statusClause = hasStatus ? " AND d.status = 'published'" : ''

    // --- 修正點 (4) ---
    // 將 limit/offset 變數直接寫入 SQL 字串
    const query = `
      SELECT d.*, u.username, u.profile_image AS avatar_url
      FROM diaries d
      JOIN users u ON d.user_id = u.user_id
      WHERE d.user_id = ? AND d.visibility = 'public'${statusClause}
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const normalizedUserId = typeof userId === 'number' ? userId : String(userId).trim();
    const [rows] = await db.execute(query, [normalizedUserId]);
    return rows;
  }
}

module.exports = Diary;