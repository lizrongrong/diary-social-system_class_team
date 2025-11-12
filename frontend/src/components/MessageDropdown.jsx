import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function MessageDropdown({ visible, onClose }) {
  const { user } = useAuthStore()
  const [recentChats, setRecentChats] = useState([])

  useEffect(() => {
    if (!visible) return
    if (!user) return
    try {
      const chats = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith('chat_')) continue
        try {
          const arr = JSON.parse(localStorage.getItem(key)) || []
          if (!Array.isArray(arr) || arr.length === 0) continue
          const latest = arr[0] || arr[arr.length - 1]
          const ids = key.replace(/^chat_/, '').split('_')
          const otherId = ids.find(id => id !== String(user.id)) || ids[0]
          chats.push({ key, otherId, latest })
        } catch (e) { /* ignore parse errors */ }
      }
      chats.sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at))
      setRecentChats(chats)
    } catch (e) {
      setRecentChats([])
    }
  }, [visible, user])

  if (!visible) return null
  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 8,
      width: 320,
      maxHeight: 420,
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eee', background: '#f9f9f9' }}>
        <strong style={{ fontSize: 16 }}>訊息</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}>關閉</button>
      </div>

      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {recentChats.length === 0 ? (
          <div style={{ padding: 20, color: '#666', fontSize: 14 }}>尚無對話</div>
        ) : (
          recentChats.map(c => (
            <Link key={c.key} to={`/messages/${c.otherId}`} onClick={onClose} style={{ display: 'block', padding: '12px 16px', borderBottom: '1px solid #f5f5f5', color: '#333', textDecoration: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.latest && c.latest.from === user.id ? '我' : `使用者 ${c.otherId}`}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{new Date(c.latest.created_at).toLocaleString()}</div>
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.latest.text}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
