/* Fix notifications encoding with backup. */
const db = require('../src/config/db');

function tsName(){const d=new Date();const p=n=>n.toString().padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`}

(async()=>{
  const suffix=tsName();
  const backup=`notifications_backup_${suffix}`;
  let conn;
  try{
    conn=await db.getConnection();
    const [chk]=await conn.query('SHOW TABLES LIKE ?',[ 'notifications' ]);
    if(chk.length===0){console.error('❌ Table notifications not found');process.exit(2)}
    const [[{cnt}]] = await conn.query('SELECT COUNT(*) cnt FROM notifications');
    console.log('📊 notifications rows:',cnt);
    console.log('🛟 Creating backup table:',backup);
    await conn.query(`CREATE TABLE \`${backup}\` AS SELECT * FROM notifications`);
    console.log('✅ Backup created');
    console.log('🛠️ Applying utf8mb4 fix...');
    const [res]=await conn.query("UPDATE notifications SET title = CONVERT(CAST(title AS BINARY) USING utf8mb4), content = CONVERT(CAST(content AS BINARY) USING utf8mb4)");
    console.log('✅ Fix applied. Affected rows:',res.affectedRows);
    const [sample]=await conn.query('SELECT notification_id,type,title,LEFT(content,120) AS snippet,created_at FROM notifications ORDER BY created_at DESC LIMIT 5');
    console.log('🔎 sample after fix:\n',JSON.stringify(sample,null,2));
    process.exit(0);
  }catch(e){console.error('💥 Migration error:',e);process.exit(1)}
  finally{if(conn) conn.release()}
})()
