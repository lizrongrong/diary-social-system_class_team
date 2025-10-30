/* Rebuild garbled like/comment notifications into clean Chinese texts for old rows. */
const db = require('../src/config/db');

(async()=>{
  let conn;
  try{
    conn = await db.getConnection();
    console.log('🧹 Rebuilding old like/comment notifications before 2025-10-28...');
    const [res] = await conn.query(`
      UPDATE notifications n
      JOIN users u ON u.user_id = n.source_user_id
      SET 
        n.title = CASE n.type 
          WHEN 'like' THEN '新的按讚' 
          WHEN 'comment' THEN '新的留言' 
          ELSE n.title END,
        n.content = CASE n.type 
          WHEN 'like' THEN CONCAT(u.username, ' 對你的日記按了讚')
          WHEN 'comment' THEN CONCAT(u.username, ' 留言了，點此查看')
          ELSE n.content END
      WHERE n.type IN ('like','comment')
        AND n.created_at < '2025-10-28';
    `);
    console.log('✅ Rebuilt rows:', res.affectedRows);
    const [sample]=await conn.query("SELECT notification_id,type,title,LEFT(content,120) AS snippet,created_at FROM notifications WHERE created_at < '2025-10-28' ORDER BY created_at DESC LIMIT 5");
    console.log('🔎 sample after rebuild:\n',JSON.stringify(sample,null,2));
    process.exit(0);
  }catch(e){
    console.error('💥 Rebuild error:', e);
    process.exit(1);
  }finally{ if(conn) conn.release(); }
})();
