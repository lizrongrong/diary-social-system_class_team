// 測試 MySQL 連線（直接使用密碼）
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    console.log('🔍 測試 MySQL 連線...\n');
    
    // 以環境變數讀取密碼，避免把憑證硬編碼到程式碼中
    const dbPassword = process.env.DB_PASSWORD;
    if (!dbPassword) {
      console.error('❌ 未設定 DB_PASSWORD 環境變數。請在本機建立 backend/.env 並設定 DB_PASSWORD，或在執行時以環境變數傳入。');
      process.exit(1);
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: dbPassword
    });
    
    console.log('✅ MySQL 連線成功！\n');
    
    // 測試版本
    const [rows] = await connection.query('SELECT VERSION() as version');
    console.log(`📊 MySQL 版本: ${rows[0].version}`);
    
    await connection.end();
    console.log('\n✅ 測試完成！可以繼續建立資料庫。');
    
  } catch (error) {
    console.error('❌ 連線失敗:');
    console.error(`錯誤: ${error.message}`);
    console.error(`錯誤代碼: ${error.code}`);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 密碼可能不正確，請確認您的 MySQL root 密碼');
    }
  }
}

testConnection();
