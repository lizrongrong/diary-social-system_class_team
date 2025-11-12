import React, { useEffect, useState } from 'react'
import useAuthStore from '../store/authStore'
import useChatStore from '../store/chatStore'
import { messageAPI } from '../services/api'

export default function MessageDropdown({ visible, onClose }) {
  const { user } = useAuthStore()
  const openChat = useChatStore(state => state.openConversation)
  const [recentChats, setRecentChats] = useState([])

  useEffect(() => {
    if (!visible) return
    if (!user) return
    const load = async () => {
      // Try backend conversations API first
      try {
        const data = await messageAPI.getConversations()
        const convs = data?.conversations || data || []
        const normalized = (Array.isArray(convs) ? convs : []).map(c => ({
          key: c.key || `chat_${c.otherId}`,
          otherId: c.otherId || c.user_id || (c.latest && (c.latest.from === user.user_id ? c.latest.to : c.latest.from)) || null,
          latest: c.latest || c.lastMessage || (c.messages && c.messages.length ? c.messages[c.messages.length - 1] : null),
          displayName: c.displayName || c.username || `${c.otherId}`,
          avatar: c.avatar || null,
          unread_count: c.unread_count || c.unread || 0
        })).filter(Boolean)

        normalized.sort((a, b) => new Date(b.latest?.created_at || b.latest?.createdAt || 0) - new Date(a.latest?.created_at || a.latest?.createdAt || 0))
        setRecentChats(normalized)
        // notify parent about total unread count so icon badges can update
        try {
          const total = normalized.reduce((s, x) => s + (x.unread_count || 0), 0)
          window.dispatchEvent(new CustomEvent('messageDropdownUnread', { detail: { total } }))
        } catch (e) {}
        return
      } catch (err) {
        // fallback to parsing localStorage if API fails
      }

      try {
        const chats = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (!key || !key.startsWith('chat_')) continue
          try {
            const arr = JSON.parse(localStorage.getItem(key)) || []
            if (!Array.isArray(arr) || arr.length === 0) continue
            const latest = arr.reduce((best, item) => {
              try { return new Date(best.created_at) > new Date(item.created_at) ? best : item } catch (e) { return best }
            }, arr[0])
            const ids = key.replace(/^chat_/, '').split('_').filter(Boolean)
            const currentId = String(user?.id || user?.user_id || '')
            let otherId = ids.find(id => id !== currentId) || ids[0]
            chats.push({ key, otherId, latest, displayName: `${otherId}`, avatar: null, unread_count: 0 })
          } catch (e) { /* ignore parse errors */ }
        }
        chats.sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at))
        setRecentChats(chats)
        try {
          const total = chats.reduce((s, x) => s + (x.unread_count || 0), 0)
          window.dispatchEvent(new CustomEvent('messageDropdownUnread', { detail: { total } }))
        } catch (e) {}
      } catch (e) {
        setRecentChats([])
      }
    }

    load()
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
            <div key={c.key} onClick={() => {
              openChat(c.otherId, { username: c.displayName })
              // dispatch event so parent components can update unread totals
              try { window.dispatchEvent(new CustomEvent('openConversation', { detail: { otherId: c.otherId, unread_count: c.unread_count || 0 } })) } catch (e) {}
              onClose()
            }} style={{ display: 'block', padding: '12px 16px', borderBottom: '1px solid #f5f5f5', color: '#333', textDecoration: 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: c.avatar ? `url(${c.avatar}) center/cover` : 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                    {!c.avatar && (c.displayName || `U`).charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, fontWeight: c.unread_count > 0 ? 700 : 600 }}>
                      {c.displayName || `${c.otherId}`}
                      {c.unread_count > 0 && (
                        <span style={{ marginLeft: 8, background: '#CD79D5', color: '#fff', borderRadius: 10, padding: '2px 6px', fontSize: 12, fontWeight: 700 }}>
                          {c.unread_count > 9 ? '9+' : c.unread_count}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                      {c.latest?.text || c.latest?.content || c.latest?.message || ''}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>{new Date(c.latest?.created_at || c.latest?.createdAt || 0).toLocaleString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
