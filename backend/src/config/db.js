// Database Configuration (UTF-8)
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'your_password',  // 暫時使用預設密碼
  port: process.env.DB_PORT || 3306,  //檢查這裡
  database: process.env.DB_DATABASE || 'diary_app',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Initialize followers table if not exists (符合短 user_id VARCHAR(10))
const initializeFollowersTable = async () => {
  try {
    const connection = await pool.getConnection();
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
    connection.release();
  } catch (error) {
    console.error('❌ Failed to initialize followers table:', error.message);
  }
};

// Test connection on startup
pool
  .getConnection()
  .then(async (conn) => {
    console.log('✅ Database pool ready');
    conn.release();
    // Initialize followers table (短 ID schema)
    await initializeFollowersTable();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = pool;
