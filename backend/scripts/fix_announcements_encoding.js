/*
  Fix announcements encoding by converting mis-stored bytes to utf8mb4.
  Steps:
  1) Create backup table announcements_backup_YYYYMMDDHHMM
  2) Apply UPDATE using CONVERT(CAST(col AS BINARY) USING utf8mb4)
  3) Print sample rows
*/

const db = require('../src/config/db');

function tsName() {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  return `${y}${M}${D}${h}${m}`;
}

(async () => {
  const suffix = tsName();
  const backupTable = `announcements_backup_${suffix}`;
  let conn;
  try {
    conn = await db.getConnection();

    const [chk] = await conn.query('SHOW TABLES LIKE ?',[ 'announcements' ]);
    if (chk.length === 0) {
      console.error('❌ Table announcements not found');
      process.exit(2);
    }

    const [[{ cnt }]] = await conn.query('SELECT COUNT(*) cnt FROM announcements');
    console.log('📊 announcements rows:', cnt);

    console.log('🛟 Creating backup table:', backupTable);
    await conn.query(`CREATE TABLE \`${backupTable}\` AS SELECT * FROM announcements`);
    console.log('✅ Backup created');

    console.log('🛠️ Applying utf8mb4 fix...');
    const [res] = await conn.query(
      "UPDATE announcements SET title = CONVERT(CAST(title AS BINARY) USING utf8mb4), content = CONVERT(CAST(content AS BINARY) USING utf8mb4)"
    );
    console.log('✅ Fix applied. Affected rows:', res.affectedRows);

    const [sample] = await conn.query(
      'SELECT announcement_id, title, LEFT(content, 120) AS snippet FROM announcements ORDER BY COALESCE(published_at, created_at) DESC LIMIT 5'
    );
    console.log('🔎 Sample after fix:\n', JSON.stringify(sample, null, 2));

    process.exit(0);
  } catch (e) {
    console.error('💥 Migration error:', e);
    process.exit(1);
  } finally {
    if (conn) conn.release();
  }
})();
