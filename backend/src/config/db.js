// Database Configuration (UTF-8)
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'your_password',  // 暫時使用預設密碼
  port: process.env.DB_PORT || 3306,  //檢查這裡
  database: process.env.DB_DATABASE || 'dary_app',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Initialize friends table if not exists
const initializeFriendsTable = async () => {
  try {
    const connection = await pool.getConnection();

    await connection.query(`
      CREATE TABLE IF NOT EXISTS friends (
        friend_id CHAR(36) NOT NULL COMMENT 'UUID',
        user_id CHAR(36) NOT NULL COMMENT '用戶ID',
        friend_user_id CHAR(36) NOT NULL COMMENT '好友用戶ID',
        status ENUM('pending', 'accepted', 'blocked') NOT NULL DEFAULT 'accepted' COMMENT '好友狀態',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
        PRIMARY KEY (friend_id),
        KEY idx_user_id (user_id),
        KEY idx_friend_user_id (friend_user_id),
        UNIQUE KEY uk_user_friend (user_id, friend_user_id),
        CONSTRAINT fk_friends_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        CONSTRAINT fk_friends_friend FOREIGN KEY (friend_user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        CONSTRAINT chk_no_self_friend CHECK (user_id != friend_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='好友關係表'
    `);

    console.log('✅ Friends table initialized');
    connection.release();
  } catch (error) {
    console.error('❌ Failed to initialize friends table:', error.message);
  }
};

// Test connection on startup
pool
  .getConnection()
  .then(async (conn) => {
    console.log('✅ Database pool ready');
    conn.release();
    // Initialize friends table
    await initializeFriendsTable();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = pool;
