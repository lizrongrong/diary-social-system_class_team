// 測試資料庫連線
const pool = require('./src/config/db');

async function testDatabase() {
  try {
    console.log('正在測試資料庫連線...\n');
    
    // 1. 測試連線
    const connection = await pool.getConnection();
    console.log('✅ 資料庫連線成功');
    
    // 2. 檢查資料庫版本
    const [versionRows] = await connection.query('SELECT VERSION() as version');
    console.log(`📊 MySQL 版本: ${versionRows[0].version}`);
    
    // 3. 檢查當前資料庫
    const [dbRows] = await connection.query('SELECT DATABASE() as db_name');
    console.log(`📂 當前資料庫: ${dbRows[0].db_name || '未選擇'}`);
    
    // 4. 如果資料庫存在，列出所有表格
    if (dbRows[0].db_name) {
      const [tables] = await connection.query('SHOW TABLES');
      console.log(`\n📋 資料表數量: ${tables.length}`);
      
      if (tables.length > 0) {
        console.log('資料表列表:');
        tables.forEach((table, index) => {
          const tableName = Object.values(table)[0];
          console.log(`   ${index + 1}. ${tableName}`);
        });
      } else {
        console.log('⚠️  資料庫中尚未建立任何資料表');
        console.log('\n💡 提示: 請執行 schema.sql 來建立資料表');
      }
    } else {
      console.log('\n⚠️  資料庫尚未建立');
      console.log('💡 提示: 請先建立資料庫');
    }
    
    connection.release();
    console.log('\n✅ 資料庫測試完成');
    
  } catch (error) {
    console.error('\n❌ 資料庫測試失敗:');
    console.error(`錯誤訊息: ${error.message}`);
    console.error(`錯誤代碼: ${error.code}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 解決方案:');
      console.error('   1. 確認 MySQL 服務正在運行');
      console.error('   2. 檢查 .env 中的 DB_HOST 和 DB_PORT');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 解決方案:');
      console.error('   1. 檢查 .env 中的 DB_USER 和 DB_PASSWORD');
      console.error('   2. 確認資料庫使用者權限');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 解決方案:');
      console.error('   1. 資料庫不存在，請先建立資料庫');
      console.error(`   2. 執行: CREATE DATABASE ${process.env.DB_NAME || 'resonote'};`);
    }
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testDatabase();
