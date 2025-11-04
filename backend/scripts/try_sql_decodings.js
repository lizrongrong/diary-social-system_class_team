/* Try multiple SQL conversion strategies for notifications with non-CJK titles
   Prints original and results of different CONVERT(...) attempts for recent rows.
*/
const db = require('../src/config/db');

async function run() {
  let conn
  try {
    conn = await db.getConnection()
    const [rows] = await conn.query("SELECT notification_id, title, content, created_at FROM notifications ORDER BY created_at DESC LIMIT 50")
    const suspects = rows.filter(r => !(/[\u4e00-\u9fff]/.test(r.title || '')))
    console.log('Found', suspects.length, 'suspect rows (no CJK in title)')
    for (const s of suspects.slice(0, 10)) {
      console.log('\n---', s.notification_id, s.created_at)
      console.log('original:', s.title)
      const [u] = await conn.query("SELECT CONVERT(CAST(title AS BINARY) USING utf8mb4) AS v FROM notifications WHERE notification_id = ?", [s.notification_id])
      const [b] = await conn.query("SELECT CONVERT(CAST(CONVERT(title USING big5) AS BINARY) USING utf8mb4) AS v FROM notifications WHERE notification_id = ?", [s.notification_id])
      const [l] = await conn.query("SELECT CONVERT(CAST(CONVERT(title USING latin1) AS BINARY) USING utf8mb4) AS v FROM notifications WHERE notification_id = ?", [s.notification_id])
      const [g] = await conn.query("SELECT CONVERT(CAST(CONVERT(title USING gbk) AS BINARY) USING utf8mb4) AS v FROM notifications WHERE notification_id = ?", [s.notification_id])
      console.log('sql_utf8mb4:', u[0] && u[0].v)
      console.log('sql_big5:', b[0] && b[0].v)
      console.log('sql_latin1:', l[0] && l[0].v)
      console.log('sql_gbk:', g[0] && g[0].v)
    }
  } catch (e) {
    console.error('error', e)
  } finally {
    if (conn) conn.release()
    process.exit(0)
  }
}

run()
