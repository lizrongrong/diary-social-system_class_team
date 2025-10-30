/* Attempt a Big5->utf8mb4 repair for older like/comment notifications. */
const db = require('../src/config/db');

(async()=>{
  let conn;
  try{
    conn = await db.getConnection();
    console.log('🛠️ Applying Big5 repair for like/comment before 2025-10-28...');
    const [res] = await conn.query(
      "UPDATE notifications SET title = COALESCE(CONVERT(CAST(CONVERT(title USING big5) AS BINARY) USING utf8mb4), title), content = COALESCE(CONVERT(CAST(CONVERT(content USING big5) AS BINARY) USING utf8mb4), content) WHERE type IN ('like','comment') AND created_at < '2025-10-28'"
    );
    console.log('✅ Big5 repair affected rows:', res.affectedRows);
    const [sample]=await conn.query("SELECT notification_id,type,title,LEFT(content,120) AS snippet,created_at FROM notifications WHERE type IN ('like','comment') ORDER BY created_at DESC LIMIT 5");
    console.log('🔎 sample after Big5 pass:\n',JSON.stringify(sample,null,2));
    process.exit(0);
  }catch(e){
    console.error('💥 Big5 repair error:', e);
    process.exit(1);
  }finally{ if(conn) conn.release(); }
})();
