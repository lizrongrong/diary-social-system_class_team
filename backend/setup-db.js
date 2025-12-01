// 建立資料庫並匯入 Schema
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 設定資料庫配置
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database_name: process.env.DB_NAME || 'diary_app'
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔧 MySQL 資料庫設定工具\n');
    
    // 步驟 1: 連接到 MySQL (不指定資料庫)
    console.log('步驟 1: 連接到 MySQL 伺服器...');
    connection = await mysql.createConnection({
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      multipleStatements: true
    });
    console.log('✅ 成功連接到 MySQL\n');
    
    // 步驟 2: 建立資料庫
    const dbName = DB_CONFIG.database_name;
    console.log(`步驟 2: 建立資料庫 "${dbName}"...`);
    
    await connection.query(`DROP DATABASE IF EXISTS ${dbName}`);
    await connection.query(`CREATE DATABASE ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 資料庫 "${dbName}" 建立成功\n`);
    
    // 步驟 3: 選擇資料庫
    await connection.query(`USE ${dbName}`);
    
    // 步驟 4: 讀取並執行 Schema
    console.log('步驟 3: 匯入資料庫結構...');
    const schemaPath = path.join(__dirname, '..', 'docs', 'database', 'schema_utf8.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`找不到 schema_utf8.sql 檔案: ${schemaPath}`);
    }
    
    // 讀取 SQL 檔案並移除 BOM
    let schema = fs.readFileSync(schemaPath, 'utf8');
    // 移除 UTF-8 BOM 如果存在
    schema = schema.replace(/^\uFEFF/, '');
    
    // MySQL 9.5 不支援 CHECK 約束中使用 CURDATE()，暫時移除
    // 年齡檢查將在應用層處理
    schema = schema.replace(/,\s*CONSTRAINT\s+`chk_age`\s+CHECK\s+\(TIMESTAMPDIFF\(YEAR,\s*`birth_date`,\s*CURDATE\(\)\)\s*>=\s*13\)/gi, '');
    
    await connection.query(schema);
    console.log('✅ 資料庫結構匯入成功\n');
    
    // 步驟 5: 驗證資料表
    console.log('步驟 4: 驗證資料表...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`✅ 成功建立 ${tables.length} 個資料表:\n`);
    
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${tableName}`);
    });
    
    console.log('\n🎉 資料庫設定完成！\n');
    console.log('下一步:');
    console.log('  1. 執行: node test-db.js (測試連線)');
    console.log('  2. 執行: npm run dev (啟動伺服器)\n');
    
  } catch (error) {
    console.error('\n❌ 設定失敗:');
    console.error(`錯誤: ${error.message}\n`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 解決方案:');
      console.error('   MySQL 服務未運行，請先啟動 MySQL 服務');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 解決方案:');
      console.error('   密碼錯誤，請檢查腳本中的密碼設定');
    } else if (error.code === 'ENOENT') {
      console.error('💡 解決方案:');
      console.error('   找不到 schema.sql 檔案');
      console.error('   請確認專案結構完整');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
