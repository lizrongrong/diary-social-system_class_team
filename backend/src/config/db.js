// Database Configuration (UTF-8)
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Emma0612@',  // 暫時使用預設密碼
  port: process.env.DB_PORT || 3306,  //檢查這裡
  database: process.env.DB_DATABASE || 'dary_app',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Initialize followers table if not exists (符合短 user_id VARCHAR(10))
const initializeFollowersTable = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS followers (
        follow_id CHAR(36) NOT NULL COMMENT 'UUID',
        follower_id VARCHAR(10) NOT NULL COMMENT '追蹤者 ID (users.user_id)',
        following_id VARCHAR(10) NOT NULL COMMENT '被追蹤者 ID (users.user_id)',
        status ENUM('active', 'blocked') NOT NULL DEFAULT 'active' COMMENT '追蹤狀態',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
        PRIMARY KEY (follow_id),
        UNIQUE KEY uk_follower_following (follower_id, following_id),
        KEY idx_follower (follower_id),
        KEY idx_following (following_id),
        KEY idx_status (status),
        CONSTRAINT fk_followers_follower FOREIGN KEY (follower_id) REFERENCES users (user_id) ON DELETE CASCADE,
        CONSTRAINT fk_followers_following FOREIGN KEY (following_id) REFERENCES users (user_id) ON DELETE CASCADE,
        CONSTRAINT chk_no_self_follow CHECK (follower_id != following_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='追蹤關係表'
    `);

    console.log('✅ Followers table initialized');
  } catch (error) {
    console.error('❌ Failed to initialize followers table:', error.message);
  } finally {
    if (connection) connection.release();
  }
};

const initializeCardDrawsTable = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_card_draws (
        draw_id CHAR(36) NOT NULL COMMENT 'UUID',
        user_id VARCHAR(10) NOT NULL COMMENT '使用者 ID (users.user_id)',
        fortune_id INT NOT NULL COMMENT '對應 fortunes.js 的 ID',
        fortune_title VARCHAR(120) NOT NULL COMMENT '簽文標題',
        fortune_text TEXT NOT NULL COMMENT '簽文內容',
        card_slot TINYINT UNSIGNED NULL COMMENT '抽取的位置 (1-4)',
        draw_date DATE NOT NULL COMMENT '抽卡日期',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
        PRIMARY KEY (draw_id),
        UNIQUE KEY uk_user_draw_date (user_id, draw_date),
        KEY idx_user_date (user_id, draw_date),
        CONSTRAINT fk_card_draw_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='幸運小卡抽卡紀錄'
    `);

    console.log('✅ Card draws table initialized');
  } catch (error) {
    console.error('❌ Failed to initialize card draws table:', error.message);
  } finally {
    if (connection) connection.release();
  }
};

// Test connection on startup
pool
  .getConnection()
  .then(async (conn) => {
    console.log('✅ Database pool ready');
    conn.release();
    // Initialize required tables
    await initializeFollowersTable();
    await initializeCardDrawsTable();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = pool;
