const db = require('../config/db')
const { v4: uuidv4 } = require('uuid')

// Return list of conversations for the current user with latest message and unread count
exports.getConversations = async (req, res) => {
  const userId = req.user.user_id
  try {
    // Get other participant ids and last message time
    const [rows] = await db.query(
      `SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id,
              MAX(created_at) AS last_time
       FROM messages
       WHERE sender_id = ? OR receiver_id = ?
       GROUP BY other_id
       ORDER BY last_time DESC`,
      [userId, userId, userId]
    )

    const conversations = []
    for (const r of rows) {
      const otherId = r.other_id

      // latest message for this conversation
      const [lastRows] = await db.query(
        `SELECT message_id, sender_id, receiver_id, message_type, content, is_read, read_at, created_at
         FROM messages
         WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1`,
        [userId, otherId, otherId, userId]
      )

      const latest = lastRows[0] || null

      // unread count where other is sender and current user is receiver
      const [unreadRows] = await db.query(
        `SELECT COUNT(*) AS unread_count FROM messages WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
        [otherId, userId]
      )
      const unread_count = (unreadRows && unreadRows[0] && unreadRows[0].unread_count) || 0

      conversations.push({ otherId, latest, unread_count })
    }

    res.json({ conversations })
  } catch (err) {
    console.error('getConversations error', err)
    res.status(500).json({ error: 'server_error' })
  }
}

// Get messages between current user and otherId (oldest-first). Mark unread -> read for current user.
exports.getMessagesWith = async (req, res) => {
  const userId = req.user.user_id
  const otherId = req.params.otherId
  try {
    const [rows] = await db.query(
      `SELECT message_id, sender_id, receiver_id, message_type, content, is_read, read_at, created_at
       FROM messages
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [userId, otherId, otherId, userId]
    )

    // mark messages sent to current user as read
    await db.execute(
      `UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE`,
      [userId, otherId]
    )

    res.json({ messages: rows })
  } catch (err) {
    console.error('getMessagesWith error', err)
    res.status(500).json({ error: 'server_error' })
  }
}

// Send message to otherId and persist to DB
exports.sendMessageTo = async (req, res) => {
  const from = req.user.user_id
  const to = req.params.otherId
  const { text } = req.body || {}
  if (!text || !text.trim()) return res.status(400).json({ error: 'text_required' })

  try {
    // Debug logs to help trace issues in environments where requests fail
    console.log('[sendMessageTo] user:', req.user ? { user_id: req.user.user_id, username: req.user.username } : null)
    console.log('[sendMessageTo] params.otherId:', to)
    console.log('[sendMessageTo] body:', { text })

    // Validate both users exist to provide clearer errors (prevents FK errors)
    const [fromRows] = await db.query('SELECT user_id FROM users WHERE user_id = ? LIMIT 1', [from])
    const [toRows] = await db.query('SELECT user_id FROM users WHERE user_id = ? LIMIT 1', [to])
    if (!fromRows || !fromRows.length) {
      console.warn('[sendMessageTo] sender not found in users table:', from)
      return res.status(400).json({ error: 'sender_not_found' })
    }
    if (!toRows || !toRows.length) {
      console.warn('[sendMessageTo] receiver not found in users table:', to)
      return res.status(400).json({ error: 'receiver_not_found' })
    }
    const messageId = uuidv4()
    const [result] = await db.execute(
      `INSERT INTO messages (message_id, sender_id, receiver_id, message_type, content, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, FALSE, NOW())`,
      [messageId, from, to, 'text', text.trim()]
    )

    const message = {
      message_id: messageId,
      sender_id: from,
      receiver_id: to,
      message_type: 'text',
      content: text.trim(),
      is_read: false,
      created_at: new Date().toISOString()
    }

    res.json({ message })
  } catch (err) {
    console.error('sendMessageTo error', err && err.message ? err.message : err)
    // include SQL error message when available for faster debugging
    if (err && err.sqlMessage) console.error('SQL Error:', err.sqlMessage)
    res.status(500).json({ error: 'server_error', details: err && err.message ? err.message : undefined })
  }
}
