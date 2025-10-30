const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

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
   * @param {string} userData.username - 使用者 ID
   * @param {string} userData.display_name - 顯示名稱
   * @param {string} userData.gender - 性別 (male/female/other/prefer_not_to_say)
   * @param {string} userData.birth_date - 生日 (YYYY-MM-DD)
   * @returns {Promise<string>} 使用者 ID
   */
  static async create(userData) {
    const userId = uuidv4();
    
    const query = `
      INSERT INTO users (
        user_id, email, password_hash, username, display_name, 
        gender, birth_date, role, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'member', 'active', NOW())
    `;
    
    const values = [
      userId,
      userData.email,
      userData.password_hash,
      userData.username,
      userData.display_name,
      userData.gender,
      userData.birth_date,
    ];
    
    try {
      await db.execute(query, values);
      return userId;
    } catch (error) {
      // 檢查是否是重複鍵錯誤
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('email')) {
          throw new Error('EMAIL_EXISTS');
        }
        if (error.message.includes('username')) {
          throw new Error('USERNAME_EXISTS');
        }
      }
      throw error;
    }
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
        user_id, email, username, display_name, avatar_url,
        gender, birth_date, role, status, created_at, updated_at, last_login
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
    const query = `
      UPDATE users 
      SET last_login = NOW() 
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
    const allowedFields = ['display_name', 'avatar_url', 'gender'];
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
}

module.exports = User;
