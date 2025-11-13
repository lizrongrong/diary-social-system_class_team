import { useState, useEffect, useRef } from 'react'
import { Bell, MessageSquare, UserPlus } from 'lucide-react'
import notificationAPI from '../services/notificationAPI'
import { ensureAbsoluteUrl, followAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { Link } from 'react-router-dom'
import { useToast } from './ui/Toast'
import MessageDropdown from './MessageDropdown'

function NotificationBell({ iconColor = '#FFFFFF' }) {
  const { user } = useAuthStore()
  const { addToast } = useToast()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false) // 訊息（聊天）
  const [showNotif, setShowNotif] = useState(false) // 系統通知（Bell）
  const [loading, setLoading] = useState(false)
  const [followingUsers, setFollowingUsers] = useState(new Set())
  const dropdownRef = useRef(null)
  // announcements removed: announcements are handled by AnnouncementBell component
  const [recentChats, setRecentChats] = useState([])
  const [messageUnread, setMessageUnread] = useState(0)
  const [showOriginalFor, setShowOriginalFor] = useState(new Set())

  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      try {
        const data = await notificationAPI.getNotifications(10, 0)
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      } catch (e) {
        console.error('Failed to fetch notifications:', e)
      }
    }

    const fetchFollowing = async () => {
      try {
        const data = await followAPI.getAll()
        // backend may return { following: [...] } or legacy { friends: [...] }
        const list = data.following || data.friends || []
        const following = new Set(list.map(f => f.friend_user_id || f.following_user_id))
        setFollowingUsers(following)
      } catch (e) {
        console.error('Failed to fetch following:', e)
      }
    }

    fetchNotifications()
    fetchFollowing()
    // preload recent chats from localStorage
    const loadRecentChats = () => {
      try {
        const chats = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (!key || !key.startsWith('chat_')) continue
          try {
            const arr = JSON.parse(localStorage.getItem(key)) || []
            if (!Array.isArray(arr) || arr.length === 0) continue
            // messages may be stored newest-first; pick the first as latest
            const latest = arr[0] || arr[arr.length - 1]
            const ids = key.replace(/^chat_/, '').split('_')
            // other participant id (not current user)
            const otherId = ids.find(id => id !== String(user.id)) || ids[0]
            chats.push({ key, otherId, latest })
          } catch (e) {
            // ignore parse errors
          }
        }
        // sort by latest message time desc
        chats.sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at))
        setRecentChats(chats)
      } catch (e) {
        setRecentChats([])
      }
    }
    loadRecentChats()
    const interval = setInterval(() => {
      fetchNotifications()
      fetchFollowing()
    }, 30000) // Poll every 30s

    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
        setShowNotif(false)
      }
    }

    if (showDropdown || showNotif) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => { }
  }, [showDropdown, showNotif])

  // listen for unread counts emitted by MessageDropdown (or other message loader)
  useEffect(() => {
    const onMessageUnread = (e) => {
      try {
        const total = (e?.detail && Number(e.detail.total)) || 0
        setMessageUnread(Number.isFinite(total) ? total : 0)
      } catch (err) {
        setMessageUnread(0)
      }
    }
    window.addEventListener('messageDropdownUnread', onMessageUnread)
    return () => window.removeEventListener('messageDropdownUnread', onMessageUnread)
  }, [])

  // Try to repair common mojibake/encoding issues in incoming strings.
  const tryFixEncoding = (s) => {
    if (!s || typeof s !== 'string') return s
    // quick check: if s already contains CJK characters, return as-is
    if (/[\u4e00-\u9fff]/.test(s)) return s

    // 1) classic latin1->utf8 fix
    try {
      const fixed = decodeURIComponent(escape(s))
      if (/[\u4e00-\u9fff]/.test(fixed)) return fixed
    } catch (e) {
      // ignore
    }

    // 2) try TextDecoder with big5 (some browsers support it)
    try {
      if (typeof TextDecoder !== 'undefined') {
        const bytes = new Uint8Array(Array.from(s, c => c.charCodeAt(0) & 0xff))
        const td = new TextDecoder('big5')
        const out = td.decode(bytes)
        if (/[\u4e00-\u9fff]/.test(out)) return out
      }
    } catch (e) {
      // ignore
    }

    return s
  }

  const isDifferentAndHasCJK = (orig, fixed) => {
    if (!fixed || fixed === orig) return false
    return /[\u4e00-\u9fff]/.test(fixed)
  }

  const toggleShowOriginal = (id) => {
    setShowOriginalFor(prev => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  const renderMaybeFixed = (id, orig, fixed) => {
    const showOrig = showOriginalFor.has(id)
    // If fixed seems better (has CJK) default to fixed, else show original
    const defaultPreferFixed = isDifferentAndHasCJK(orig, fixed)
    const display = showOrig ? orig : (defaultPreferFixed ? fixed : orig)

    return (
      <div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{display}</div>
        {isDifferentAndHasCJK(orig, fixed) && (
          <button
            onClick={() => toggleShowOriginal(id)}
            style={{ marginTop: 6, background: 'none', border: 'none', color: '#CD79D5', cursor: 'pointer', padding: 0, fontSize: 12 }}
          >
            {showOrig ? '顯示修復' : '顯示原文'}
          </button>
        )}
      </div>
    )
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId)
      setNotifications(notifications.map(n =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      ))
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (e) {
      console.error('Failed to mark as read:', e)
    }
  }

  const handleMarkAllAsRead = async () => {
    setLoading(true)
    try {
      await notificationAPI.markAllAsRead()
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (e) {
      console.error('Failed to mark all as read:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleFollowBack = async (sourceUserId) => {
    try {
      await followAPI.add(sourceUserId)
      setFollowingUsers(new Set([...followingUsers, sourceUserId]))
      addToast('追蹤成功', 'success')
    } catch (e) {
      console.error('Failed to follow back:', e)
      addToast(e.response?.data?.message || '追蹤失敗', 'error')
    }
  }

  if (!user) return null

  return (
    <div ref={dropdownRef} className="header-icon-wrapper header-icon-multi">
      {/* 鈴鐺：系統通知（只顯示通知） */}
      <button
        onClick={() => { setShowNotif(s => !s); if (!showNotif) setShowDropdown(false) }}
        className="header-icon-btn"
        style={{ color: iconColor }}
        title="系統通知"
        aria-label="系統通知"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: '#757575',
            color: '#fff',
            borderRadius: '50%',
            minWidth: 18,
            height: 18,
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            padding: '0 4px'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 訊息按鈕（聊天） - 下拉被拆到 MessageDropdown component */}
      <button
        onClick={() => { setShowDropdown(!showDropdown); if (!showDropdown) setShowNotif(false) }}
        className="header-icon-btn"
        style={{ color: iconColor }}
        title="訊息"
        aria-label="訊息"
      >
        <MessageSquare size={20} />
        {messageUnread > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: '#CD79D5',
            color: '#fff',
            borderRadius: '50%',
            minWidth: 18,
            height: 18,
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            padding: '0 4px'
          }}>
            {messageUnread > 9 ? '9+' : messageUnread}
          </span>
        )}
      </button>
      <MessageDropdown visible={showDropdown} onClose={() => setShowDropdown(false)} />

      {/* 訊息下拉已移到 <MessageDropdown />，上方元件管理顯示 */}

      {/* 系統公告 Dropdown（包含公告 + 系統通知） */}
      {showNotif && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 8,
          width: 360,
          maxHeight: 600,
          background: '#FFFFFF',
          border: '1px solid #DDDDDD',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #eee',
            background: '#f9f9f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <strong style={{ fontSize: 16 }}>系統通知</strong>
            <span style={{ fontSize: 12, color: '#999' }}>{unreadCount} 則未讀</span>
          </div>
          <div style={{ maxHeight: 540, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>沒有新的通知</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.notification_id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    background: n.is_read ? '#fff' : '#FFF9FC',
                    transition: 'background 0.2s'
                  }}
                >
                  {n.type === 'follow' && n.source_user_id ? (
                    <div>
                      <div
                        onClick={() => !n.is_read && handleMarkAsRead(n.notification_id)}
                        style={{ cursor: n.is_read ? 'default' : 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              background: n.avatar_url
                                ? `url(${ensureAbsoluteUrl(n.avatar_url)}) center/cover`
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              border: '2px solid #CD79D5',
                              flexShrink: 0
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>
                                  {n.username || '未知用戶'}
                                </div>
                                <div style={{ fontSize: 12, color: '#999' }}>
                                  @{n.username}
                                </div>
                              </div>
                              {!n.is_read && (
                                <div style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: '#CD79D5',
                                  flexShrink: 0
                                }} />
                              )}
                            </div>
                            <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>
                              {renderMaybeFixed(n.notification_id, n.content, tryFixEncoding(n.content))}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#999', marginLeft: 52 }}>
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!followingUsers.has(n.source_user_id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFollowBack(n.source_user_id)
                          }}
                          style={{
                            marginTop: 8,
                            marginLeft: 52,
                            padding: '6px 14px',
                            background: '#CD79D5',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 20,
                            fontSize: 13,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontWeight: 600,
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#B665C5'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#CD79D5'}
                        >
                          <UserPlus size={14} />
                          追蹤回去
                        </button>
                      )}
                      {followingUsers.has(n.source_user_id) && (
                        <div style={{
                          marginTop: 8,
                          marginLeft: 52,
                          fontSize: 12,
                          color: '#CD79D5',
                          fontWeight: 600
                        }}>
                          ✓ 已互相追蹤
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div
                        onClick={() => !n.is_read && handleMarkAsRead(n.notification_id)}
                        style={{ cursor: n.is_read ? 'default' : 'pointer' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <strong style={{ fontSize: 14, color: n.is_read ? '#666' : '#333' }}>
                            {tryFixEncoding(n.title)}
                          </strong>
                          {!n.is_read && (
                            <div style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: '#CD79D5',
                              flexShrink: 0,
                              marginTop: 4
                            }} />
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
                          {renderMaybeFixed(n.notification_id, n.content, tryFixEncoding(n.content))}
                        </div>
                        <div style={{ fontSize: 11, color: '#999' }}>
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                      {n.related_diary_id && (
                        <Link
                          to={`/diaries/${n.related_diary_id}`}
                          onClick={() => setShowNotif(false)}
                          style={{ fontSize: 12, color: '#CD79D5', marginTop: 6, display: 'inline-block' }}
                        >
                          查看日記 →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
