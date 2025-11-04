/*
  Preview encoding fixes for notifications and announcements.
  Outputs JSON with: original, js_fixed, sql_fixed for latest 5 rows each.
  Run from repository root: node backend/scripts/preview_encoding_fix.js
*/
const db = require('../src/config/db');

const tryFixEncoding = (s) => {
  if (!s || typeof s !== 'string') return s
  if (/[\u4e00-\u9fff]/.test(s)) return s
  try {
    const fixed = decodeURIComponent(escape(s))
    if (/[\u4e00-\u9fff]/.test(fixed)) return fixed
  } catch (e) {}
  try {
    if (typeof TextDecoder !== 'undefined') {
      const bytes = new Uint8Array(Array.from(s, c => c.charCodeAt(0) & 0xff))
      const td = new TextDecoder('big5')
      const out = td.decode(bytes)
      if (/[\u4e00-\u9fff]/.test(out)) return out
    }
  } catch (e) {}
  return s
}

async function preview() {
  let conn
  try {
    conn = await db.getConnection()

    console.log('\n--- Notifications preview (latest 5) ---')
    const [origRows] = await conn.query('SELECT notification_id, type, title, content, created_at FROM notifications ORDER BY created_at DESC LIMIT 5')
    const [sqlRows] = await conn.query("SELECT notification_id, type, title, content, created_at, CONVERT(CAST(title AS BINARY) USING utf8mb4) AS sql_title, CONVERT(CAST(content AS BINARY) USING utf8mb4) AS sql_content FROM notifications ORDER BY created_at DESC LIMIT 5")

    const notes = origRows.map((r, i) => ({
      notification_id: r.notification_id,
      type: r.type,
      created_at: r.created_at,
      original_title: r.title,
      js_fixed_title: tryFixEncoding(r.title),
      sql_fixed_title: sqlRows[i] && sqlRows[i].sql_title,
      original_content: r.content,
      js_fixed_content: tryFixEncoding(r.content),
      sql_fixed_content: sqlRows[i] && sqlRows[i].sql_content
    }))

    console.log(JSON.stringify(notes, null, 2))

    console.log('\n--- Announcements preview (latest 5) ---')
    const [origAnn] = await conn.query('SELECT announcement_id, title, content, published_at, created_at FROM announcements ORDER BY COALESCE(published_at, created_at) DESC LIMIT 5')
    const [sqlAnn] = await conn.query("SELECT announcement_id, title, content, published_at, created_at, CONVERT(CAST(title AS BINARY) USING utf8mb4) AS sql_title, CONVERT(CAST(content AS BINARY) USING utf8mb4) AS sql_content FROM announcements ORDER BY COALESCE(published_at, created_at) DESC LIMIT 5")

    const anns = origAnn.map((a, i) => ({
      announcement_id: a.announcement_id,
      created_at: a.created_at,
      published_at: a.published_at,
      original_title: a.title,
      js_fixed_title: tryFixEncoding(a.title),
      sql_fixed_title: sqlAnn[i] && sqlAnn[i].sql_title,
      original_content: a.content,
      js_fixed_content: tryFixEncoding(a.content),
      sql_fixed_content: sqlAnn[i] && sqlAnn[i].sql_content
    }))

    console.log(JSON.stringify(anns, null, 2))

  } catch (e) {
    console.error('Preview error:', e)
  } finally {
    if (conn) conn.release()
    process.exit(0)
  }
}

preview()
