import { useState, useEffect, useRef } from 'react'
import { Megaphone } from 'lucide-react'
import announcementAPI from '../services/announcementAPI'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import './AnnouncementBell.css'

function AnnouncementBell({ iconColor = '#FFFFFF' }) {
  const { user } = useAuthStore()
  const [announcements, setAnnouncements] = useState([])
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    const fetch = async () => {
      try {
        const res = await announcementAPI.getActive(10, 0)
        if (!mounted) return
        const list = res.announcements || []
        setAnnouncements(list)
        // compute unread via localStorage per-user fallback
        const key = `ann_reads_v1:${user ? user.user_id : 'guest'}`
        const raw = localStorage.getItem(key) || '[]'
        let readIds = []
        try { readIds = JSON.parse(raw) } catch (e) { readIds = [] }
        const unread = list.filter(a => !readIds.includes(a.announcement_id))
        setCount(unread.length)
      } catch (e) {
        console.error('AnnouncementBell: failed to fetch', e)
      }
    }
    fetch()
    const iv = setInterval(fetch, 30000)
    return () => { mounted = false; clearInterval(iv) }
  }, [])

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const storageKeyFor = () => `ann_reads_v1:${user ? user.user_id : 'guest'}`

  const markReadLocal = (announcementId) => {
    try {
      const key = storageKeyFor()
      const raw = localStorage.getItem(key) || '[]'
      const arr = JSON.parse(raw)
      if (!arr.includes(announcementId)) {
        arr.push(announcementId)
        localStorage.setItem(key, JSON.stringify(arr))
      }
    } catch (e) {
      // ignore storage errors
    }
  }

  const markRead = async (announcementId) => {
    // optimistic local mark
    markReadLocal(announcementId)
    try {
      if (user) {
        await announcementAPI.markAsRead(announcementId)
      }
    } catch (e) {
      // backend may not have announcement_reads table; ignore failures
      console.warn('markRead: backend mark failed (fallback to local):', e?.message || e)
    }
  }

  return (
    <div ref={ref} className="header-icon-wrapper">
      <button
        onClick={() => setOpen(s => !s)}
        title="系統公告"
        aria-label="系統公告"
        className="header-icon-btn"
        style={{ color: iconColor }}
      >
        <Megaphone size={20} />
        {count > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#757575', color: '#fff', borderRadius: '50%', minWidth: 18, height: 18, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, padding: '0 4px' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 360, maxHeight: 420, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', background: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 16 }}>系統公告</strong>
            <span style={{ fontSize: 12, color: '#999' }}>{count} 則</span>
          </div>
          {announcements.length === 0 ? (
            <div style={{ padding: 20, color: '#666' }}>目前沒有公告</div>
          ) : (
            announcements.map(a => (
              <div key={a.announcement_id} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }} onClick={async () => { setOpen(false); await markRead(a.announcement_id); navigate(`/announcements/${a.announcement_id}`) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 14 }}>{a.title}</strong>
                  {a.priority === 'high' && <span style={{ fontSize: 11, color: '#fff', background: '#e74c3c', padding: '2px 6px', borderRadius: 10 }}>重要</span>}
                </div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.content}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>{a.published_at ? new Date(a.published_at).toLocaleString() : new Date(a.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default AnnouncementBell
