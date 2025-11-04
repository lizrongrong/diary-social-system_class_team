const db = require('../src/config/db');

async function run() {
  const ids = process.argv.slice(2);
  if (!ids || ids.length === 0) {
    console.error('Usage: node delete_notifications_by_id.js <id1> [id2 ...]');
    process.exit(2);
  }

  let conn;
  try {
    conn = await db.getConnection();

    // Show the rows to be deleted
    const [rows] = await conn.query(`SELECT notification_id, type, title, LEFT(content,200) AS content, created_at FROM notifications WHERE notification_id IN (${ids.map(()=>'?').join(',')})`, ids);
    console.log('Rows to delete:');
    console.log(JSON.stringify(rows, null, 2));

    if (rows.length === 0) {
      console.log('No matching rows found. Exiting.');
      process.exit(0);
    }

    const [res] = await conn.query(`DELETE FROM notifications WHERE notification_id IN (${ids.map(()=>'?').join(',')})`, ids);
    console.log('Delete result:', res.affectedRows, 'rows deleted');

  } catch (e) {
    console.error('Delete error:', e);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

run();
