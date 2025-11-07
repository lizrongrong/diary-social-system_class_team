import { useState, useEffect, useRef } from 'react'
import { Bell, MessageSquare, UserPlus } from 'lucide-react'
import notificationAPI from '../services/notificationAPI'
import announcementAPI from '../services/announcementAPI'
import { followAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { Link } from 'react-router-dom'
import { useToast } from './ui/Toast'

function NotificationBell() {
  const { user } = useAuthStore()
  const { addToast } = useToast()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false) // 訊息（通知）
  const [showAnnDropdown, setShowAnnDropdown] = useState(false) // 系統公告
  const [loading, setLoading] = useState(false)
  const [followingUsers, setFollowingUsers] = useState(new Set())
  const dropdownRef = useRef(null)
  const [announcements, setAnnouncements] = useState([])
  const [annCount, setAnnCount] = useState(0)
  const [recentChats, setRecentChats] = useState([])
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
    const fetchAnnouncements = async () => {
      try {
        const data = await announcementAPI.getActive(10, 0)
        setAnnouncements(data.announcements || [])
        setAnnCount((data.announcements || []).length)
      } catch (e) {
        console.error('Failed to fetch announcements:', e)
      }
    }
    fetchAnnouncements()
    const interval = setInterval(() => {
      fetchNotifications()
      fetchFollowing()
      fetchAnnouncements()
    }, 30000) // Poll every 30s

    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
        setShowAnnDropdown(false)
      }
    }

    if (showDropdown || showAnnDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {}
  }, [showDropdown, showAnnDropdown])

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
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* 鈴鐺：系統公告 */}
      <button
        onClick={() => { setShowAnnDropdown(!showAnnDropdown); if (!showAnnDropdown) setShowDropdown(false) }}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          display: 'flex',
          alignItems: 'center'
        }}
        title="系統公告"
      >
        <Bell size={20} color="#666" />
        {(annCount + unreadCount) > 0 && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            background: '#757575',
            color: '#fff',
            borderRadius: '50%',
            width: 18,
            height: 18,
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600
          }}>
            {(annCount + unreadCount) > 9 ? '9+' : (annCount + unreadCount)}
          </span>
        )}
      </button>

      {/* 訊息按鈕（聊天） - 顯示最近對話清單（從 localStorage 讀取 chat_*） */}
      <button
        onClick={() => { setShowDropdown(!showDropdown); if (!showDropdown) setShowAnnDropdown(false) }}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          display: 'flex',
          alignItems: 'center',
          marginLeft: 4
        }}
        title="訊息"
      >
        <MessageSquare size={20} color="#666" />
      </button>

      {showDropdown && (
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
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid #eee',
            background: '#f9f9f9'
          }}>
            <strong style={{ fontSize: 16 }}>訊息</strong>
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {recentChats.length === 0 ? (
              <div style={{ padding: 20, color: '#666', fontSize: 14 }}>尚無對話，或請先在好友頁打開對話。</div>
            ) : (
              recentChats.map(c => (
                <Link
                  key={c.key}
                  to={`/messages/${c.otherId}`}
                  state={{}}
                  onClick={() => setShowDropdown(false)}
                  style={{ display: 'block', padding: '12px 16px', borderBottom: '1px solid #f5f5f5', color: '#333', textDecoration: 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {c.latest && c.latest.from === user.id ? '我' : `使用者 ${c.otherId}`}
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>{new Date(c.latest.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.latest.text}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {/* 系統公告 Dropdown（包含公告 + 系統通知） */}
      {showAnnDropdown && (
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
            <strong style={{ fontSize: 16 }}>系統公告</strong>
            <span style={{ fontSize: 12, color: '#999' }}>{annCount} 則公告</span>
          </div>
          <div style={{ maxHeight: 540, overflowY: 'auto' }}>
            {announcements.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                目前沒有公告
              </div>
            ) : (
                  announcements.map(a => (
                    <div key={a.announcement_id} style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 14, color: '#333' }}>{tryFixEncoding(a.title)}</strong>
                        {a.priority === 'high' && (
                          <span style={{ fontSize: 11, color: '#fff', background: '#e74c3c', padding: '2px 6px', borderRadius: 10 }}>重要</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#555', marginTop: 6, whiteSpace: 'pre-wrap' }}>{renderMaybeFixed(a.announcement_id, a.content, tryFixEncoding(a.content))}</div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
                        {a.published_at ? new Date(a.published_at).toLocaleString() : new Date(a.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
            )}
            {/* 系統通知區塊 */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #eee', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 15 }}>系統通知</strong>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#CD79D5',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  全部標為已讀
                </button>
              )}
            </div>
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
                                ? `url(${n.avatar_url}) center/cover` 
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
                          onClick={() => setShowAnnDropdown(false)}
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
