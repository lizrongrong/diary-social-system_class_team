const db = require('../config/db');
const crypto = require('crypto');
const { generateAvatar } = require('../services/avatarGenerator');

/**
 * User 資料模型
 * 處理使用者相關的資料庫操作
 */
class User {
  /**
   * 建立新使用者
   * @param {Object} userData - 使用者資料
   * @param {string} userData.email - Email
   * @param {string} userData.password_hash - 加密後的密碼
   * @param {string} userData.username - 使用者名稱 (短 ID)
   * @param {string} userData.gender - 性別 (male/female/other/prefer_not_to_say)
   * @param {string} userData.birth_date - 生日 (YYYY-MM-DD)
   * @returns {Promise<string>} 使用者 ID
   */
  static async create(userData) {
    // 若前端有提供短 user_id，使用之；否則產生短 ID (10 個 hex 字元)
    const genShortId = () => crypto.randomBytes(5).toString('hex');

    let userId = null;
    if (userData.user_id) {
      // 允許英數與底線，長度 3~10
      const userIdRegex = /^[a-zA-Z0-9_]{3,10}$/;
      if (!userIdRegex.test(userData.user_id)) {
        throw new Error('INVALID_USER_ID');
      }
      userId = userData.user_id;
    } else {
      userId = genShortId();
    }
    const finalProfileImage = typeof userData.profile_image === 'string' && userData.profile_image.trim().length > 0
      ? userData.profile_image.trim()
      : generateAvatar(userData.username || userId);

    const query = `
      INSERT INTO users (
        user_id, email, password_hash, username, gender, birth_date, profile_image, role, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'member', 'active', NOW())
    `;

    const values = [
      userId,
      userData.email,
      userData.password_hash,
      userData.username,
      userData.gender,
      userData.birth_date,
      finalProfileImage,
    ];

    // 先檢查 email/username/user_id 是否已存在以提供即時錯誤
    if (await User.emailExists(userData.email)) {
      throw new Error('EMAIL_EXISTS');
    }
    if (await User.usernameExists(userData.username)) {
      throw new Error('USERNAME_EXISTS');
    }
    // 若 user_id 為前端提供，檢查是否存在
    if (userData.user_id && await User.userIdExists(userId)) {
      throw new Error('USERID_EXISTS');
    }

    // 嘗試插入，若 user_id 衝突且是系統生成的 id，則重試幾次
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await db.execute(query, values);
        return userId;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          // 針對 email/username 的重複回報友善錯誤
          if (error.message.includes('email')) {
            throw new Error('EMAIL_EXISTS');
          }
          if (error.message.includes('username')) {
            throw new Error('USERNAME_EXISTS');
          }
          // 如果是 user_id (PK) 衝突，且是系統生成的 id，重試
          if (!userData.user_id && (error.message.includes('user_id') || error.message.includes('PRIMARY'))) {
            if (attempt < maxAttempts) {
              userId = genShortId();
              continue; // 重試
            }
          }
        }
        throw error;
      }
    }
    throw new Error('Failed to create user after multiple attempts');
  }

  /**
   * 檢查 user_id 是否存在
   */
  static async userIdExists(userId) {
    const query = `SELECT COUNT(*) as count FROM users WHERE user_id = ? AND status != 'deleted'`;
    const [rows] = await db.execute(query, [userId]);
    return rows[0].count > 0;
  }

  /**
   * 根據 Email 查找使用者
   * @param {string} email - Email
   * @returns {Promise<Object|null>} 使用者物件或 null
   */
  static async findByEmail(email) {
    const query = `
      SELECT * FROM users 
      WHERE email = ? AND status != 'deleted'
    `;

    const [rows] = await db.query(query, [email]);
    return rows[0] || null;
  }

  /**
   * 根據 ID 查找使用者
   * @param {string} userId - 使用者 ID
   * @returns {Promise<Object|null>} 使用者物件或 null
   */
  static async findById(userId) {
    const query = `
      SELECT 
  user_id, email, username,
  gender, birth_date, role, status, profile_image, created_at, updated_at
      FROM users 
      WHERE user_id = ? AND status != 'deleted'
    `;

    const [rows] = await db.query(query, [userId]);
    return rows[0] || null;
  }

  /**
   * 根據 Username 查找使用者
   * @param {string} username - 使用者名稱
   * @returns {Promise<Object|null>} 使用者物件或 null
   */
  static async findByUsername(username) {
    const query = `
      SELECT * FROM users 
      WHERE username = ? AND status != 'deleted'
    `;

    const [rows] = await db.query(query, [username]);
    return rows[0] || null;
  }

  /**
   * 更新使用者最後登入時間
   * @param {string} userId - 使用者 ID
   * @returns {Promise<void>}
   */
  static async updateLastLogin(userId) {
    // schema does not include last_login; update updated_at instead
    const query = `
      UPDATE users 
      SET updated_at = NOW() 
      WHERE user_id = ?
    `;

    await db.execute(query, [userId]);
  }

  /**
   * 更新使用者資料
   * @param {string} userId - 使用者 ID
   * @param {Object} updates - 要更新的欄位
   * @returns {Promise<boolean>} 是否更新成功
   */
  static async update(userId, updates) {
    const allowedFields = ['username', 'gender', 'birth_date', 'profile_image'];
    const updateFields = [];
    const values = [];

    // 只允許更新特定欄位
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updateFields.length === 0) {
      return false;
    }

    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE user_id = ?
    `;

    const [result] = await db.execute(query, values);
    return result.affectedRows > 0;
  }

  /**
   * 更新使用者密碼
   * @param {string} userId - 使用者 ID
   * @param {string} passwordHash - 新密碼雜湊值
   * @returns {Promise<boolean>} 是否更新成功
   */
  static async updatePassword(userId, passwordHash) {
    const query = `
      UPDATE users 
      SET password_hash = ?, updated_at = NOW()
      WHERE user_id = ?
    `;

    const [result] = await db.execute(query, [passwordHash, userId]);
    return result.affectedRows > 0;
  }

  /**
   * 檢查 Email 是否已存在
   * @param {string} email - Email
   * @returns {Promise<boolean>} 是否存在
   */
  static async emailExists(email) {
    const query = `
      SELECT COUNT(*) as count FROM users 
      WHERE email = ? AND status != 'deleted'
    `;

    const [rows] = await db.execute(query, [email]);
    return rows[0].count > 0;
  }

  /**
   * 檢查 Username 是否已存在
   * @param {string} username - 使用者名稱
   * @returns {Promise<boolean>} 是否存在
   */
  static async usernameExists(username) {
    const query = `
      SELECT COUNT(*) as count FROM users 
      WHERE username = ? AND status != 'deleted'
    `;

    const [rows] = await db.execute(query, [username]);
    return rows[0].count > 0;
  }

  /**
   * 更新使用者角色
   * @param {string} userId - 使用者 ID
   * @param {string} role - 角色 (guest, member, admin)
   * @returns {Promise<boolean>}
   */
  static async updateRole(userId, role) {
    const query = `
      UPDATE users 
      SET role = ?, updated_at = NOW()
      WHERE user_id = ?
    `;

    const [result] = await db.execute(query, [role, userId]);
    return result.affectedRows > 0;
  }

  /**
   * 搜尋使用者（依 user_id 或 username 模糊匹配）
   * @param {string} keyword - 搜尋關鍵字
   * @param {Object} options - 搜尋選項
   * @param {string} [options.excludeUserId] - 排除的使用者 ID
   * @param {number} [options.limit=10] - 回傳筆數上限
   * @returns {Promise<Array>} 使用者列表
   */
  static async search(keyword, options = {}) {
    if (!keyword) {
      return [];
    }

    const searchTerm = `%${keyword}%`;
    const params = [searchTerm, searchTerm];
    let query = `
      SELECT user_id, username
      FROM users
      WHERE status != 'deleted'
        AND (username LIKE ? OR user_id LIKE ?)
    `;

    if (options.excludeUserId) {
      query += ' AND user_id != ?';
      params.push(options.excludeUserId);
    }

    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 10, 1), 50);
    query += ' ORDER BY username ASC LIMIT ?';
    params.push(limit);

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * 統計追蹤該使用者的人數
   * @param {string} userId - 使用者 ID
   * @returns {Promise<number>} 粉絲數量
   */
  static async countFollowers(userId) {
    const query = `
      SELECT COUNT(*) AS count
      FROM followers
      WHERE following_id = ? AND status = 'active'
    `;

    const [rows] = await db.query(query, [userId]);
    return rows[0]?.count || 0;
  }
}

module.exports = User;
