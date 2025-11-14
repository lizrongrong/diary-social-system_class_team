const db = require('../src/config/db')

async function run() {
  try {
    const sql = `ALTER TABLE messages
      ADD INDEX idx_receiver_is_read_created (receiver_id, is_read, created_at)`
    const [result] = await db.query(sql)
    console.log('Index add result:', result)
    process.exit(0)
  } catch (err) {
    console.error('Failed to add index:', err.message || err)
    process.exit(1)
  }
}

run()
