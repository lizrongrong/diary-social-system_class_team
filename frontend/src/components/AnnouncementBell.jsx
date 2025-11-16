import { useState, useEffect, useRef, useCallback } from 'react'
import { Megaphone } from 'lucide-react'
import announcementAPI from '../services/announcementAPI'
import useAuthStore from '../store/authStore'
import './AnnouncementBell.css'

function AnnouncementBell({ iconColor = '#FFFFFF' }) {
  const { user } = useAuthStore()
  const [announcements, setAnnouncements] = useState([])
  const [count, setCount] = useState(0)
  const [readIds, setReadIds] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await announcementAPI.getActive(10, 0)
      const list = res.announcements || []
      setAnnouncements(list)
      // Prefer server-side read records for logged-in users; fallback to localStorage
      let existingReadIds = []
      const storageKey = storageKeyForResolved()
      // read localStorage first (may contain optimistic marks)
      let localStored = []
      try { localStored = JSON.parse(localStorage.getItem(storageKey) || '[]') } catch (e) { localStored = [] }

      if (user) {
        try {
          const resp = await announcementAPI.getReadsForUser()
          const serverIds = resp.read_ids || []
          // merge server ids with localStored to avoid wiping local optimistic marks
          const merged = Array.from(new Set([...(serverIds || []), ...(localStored || [])]))
          existingReadIds = merged
          // persist merged result
          try { localStorage.setItem(storageKey, JSON.stringify(merged)) } catch (e) {}
        } catch (e) {
          // fallback to localStorage if backend read API not available
          existingReadIds = localStored
        }
      } else {
        existingReadIds = localStored
      }

      const unread = list.filter(a => !existingReadIds.includes(a.announcement_id))
      setCount(unread.length)
      setReadIds(existingReadIds)
    } catch (e) {
      console.error('AnnouncementBell: failed to fetch', e)
    }
  }, [user])

  useEffect(() => {
    let mounted = true
    // initial fetch
    if (mounted) fetchAnnouncements()
    const iv = setInterval(fetchAnnouncements, 30000)
    return () => { mounted = false; clearInterval(iv) }
  }, [fetchAnnouncements])

  // listen for external events to refresh announcements (e.g., after publish)
  useEffect(() => {
    const handler = (e) => {
      try {
        const ids = e?.detail?.updatedIds || []
        const updatedAnnouncements = e?.detail?.updatedAnnouncements || []
        if (Array.isArray(updatedAnnouncements) && updatedAnnouncements.length > 0) {
          // immediately apply updated announcements into local state (replace or prepend)
          setAnnouncements(prev => {
            const map = new Map(prev.map(a => [a.announcement_id, a]))
            for (const u of updatedAnnouncements) {
              map.set(u.announcement_id, u)
            }
            // create array sorted similarly to server: by priority then published_at/created_at
            const arr = Array.from(map.values())
            arr.sort((x, y) => {
              const p = (a) => ({ 'high': 0, 'normal': 1, 'low': 2 })[a.priority || 'normal'] || 1
              const pa = p(x) - p(y)
              if (pa !== 0) return pa
              const ta = new Date(x.published_at || x.created_at).getTime()
              const tb = new Date(y.published_at || y.created_at).getTime()
              return tb - ta
            })
            return arr
          })
          // ensure these ids are removed from readIds
          if (Array.isArray(ids) && ids.length > 0) {
            setReadIds(prev => prev.filter(x => !ids.includes(x)))
          }
        }
        if (Array.isArray(ids) && ids.length > 0) {
          // clear local read marks for these ids across any ann_reads_v1 keys
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i)
              if (!k) continue
              if (k.startsWith('ann_reads_v1:')) {
                const raw = localStorage.getItem(k) || '[]'
                let arr = []
                try { arr = JSON.parse(raw) } catch (e) { arr = [] }
                const filtered = arr.filter(x => !ids.includes(x))
                localStorage.setItem(k, JSON.stringify(filtered))
              }
            }
          } catch (e) {
            // ignore storage errors
          }
        }
      } catch (e) {
        // ignore
      }
      // always refresh from server
      fetchAnnouncements()
    }
    window.addEventListener('announcements:updated', handler)
    return () => window.removeEventListener('announcements:updated', handler)
  }, [fetchAnnouncements])

  

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // When a user logs in, synchronize server-side read IDs with localStorage.
  // Also migrate any guest reads into the user's key to preserve marks made while not signed in.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const userKey = `ann_reads_v1:${user.user_id}`
        const guestKey = 'ann_reads_v1:guest'

        let guest = []
        try { guest = JSON.parse(localStorage.getItem(guestKey) || '[]') } catch (e) { guest = [] }
        let userLocal = []
        try { userLocal = JSON.parse(localStorage.getItem(userKey) || '[]') } catch (e) { userLocal = [] }

        // Fetch server-side reads; if successful, merge server + local + guest and persist under user key.
        try {
          const resp = await announcementAPI.getReadsForUser()
          const serverIds = resp.read_ids || []
          const merged = Array.from(new Set([...(serverIds || []), ...(userLocal || []), ...(guest || [])]))
          if (!cancelled) {
            if (merged.length > 0) {
              try { localStorage.setItem(userKey, JSON.stringify(merged)) } catch (e) {}
            }
            // remove guest key if we migrated anything
            if (guest && guest.length > 0) {
              try { localStorage.removeItem(guestKey) } catch (e) {}
            }
            setReadIds(merged)
            setCount(announcements.filter(a => !merged.includes(a.announcement_id)).length)
          }
        } catch (e) {
          // backend failed; at least merge guest + userLocal so reads made while guest are not lost
          const merged = Array.from(new Set([...(userLocal || []), ...(guest || [])]))
          if (!cancelled) {
            if (merged.length > 0) {
              try { localStorage.setItem(userKey, JSON.stringify(merged)) } catch (e) {}
            }
            setReadIds(merged)
            setCount(announcements.filter(a => !merged.includes(a.announcement_id)).length)
          }
        }
      } catch (err) {
        // ignore
      }
    })()
    return () => { cancelled = true }
  }, [user, announcements])

  // Try to resolve a stable storage key for read IDs.
  // Use auth store user_id when available; otherwise try to decode JWT token; fallback to 'guest'.
  const userIdFromToken = () => {
    try {
      const t = sessionStorage.getItem('token')
      if (!t) return null
      const parts = t.split('.')
      if (parts.length < 2) return null
      const payload = JSON.parse(atob(parts[1]))
      return payload.user_id || payload.id || null
    } catch (e) {
      return null
    }
  }

  const storageKeyForResolved = () => `ann_reads_v1:${user ? user.user_id : (userIdFromToken() || 'guest')}`

  const markReadLocal = (announcementId) => {
    try {
      const key = storageKeyForResolved()
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
        // refresh server read ids if possible
        try {
          const resp = await announcementAPI.getReadsForUser()
          const serverIds = resp.read_ids || []
          // merge server ids with local stored ids to avoid losing optimistic marks
          const key = storageKeyForResolved()
          let localStored = []
          try { localStored = JSON.parse(localStorage.getItem(key) || '[]') } catch (e) { localStored = [] }
          const merged = Array.from(new Set([...(serverIds || []), ...(localStored || []), announcementId]))
          try { localStorage.setItem(key, JSON.stringify(merged)) } catch (e) {}
          setReadIds(merged)
          const unread = announcements.filter(a => !merged.includes(a.announcement_id))
          setCount(unread.length)
        } catch (e) {
          // ignore
        }
      } else {
        // guest: update state from localStorage
        const key = storageKeyForResolved()
        const raw = localStorage.getItem(key) || '[]'
        let arr = []
        try { arr = JSON.parse(raw) } catch (e) { arr = [] }
        setReadIds(arr)
        const unread = announcements.filter(a => !arr.includes(a.announcement_id))
        setCount(unread.length)
      }
    } catch (e) {
      // backend may not have announcement_reads table; ignore failures
      console.warn('markRead: backend mark failed (fallback to local):', e?.message || e)
    }
  }

  const markAllRead = async () => {
    try {
      // optimistic local marks
      const ids = announcements.map(a => a.announcement_id)
      ids.forEach(id => markReadLocal(id))
      setCount(0)
      setReadIds(ids)
      // try backend marks (sequential to avoid overwhelming)
      if (user) {
        for (const a of announcements) {
          try {
            await announcementAPI.markAsRead(a.announcement_id)
          } catch (e) {
            // ignore individual failures
          }
        }
        // refresh server read ids
        try {
          const resp = await announcementAPI.getReadsForUser()
          const serverIds = resp.read_ids || []
          const key = storageKeyForResolved()
          let localStored = []
          try { localStored = JSON.parse(localStorage.getItem(key) || '[]') } catch (e) { localStored = [] }
          const merged = Array.from(new Set([...(serverIds || []), ...(localStored || [])]))
          try { localStorage.setItem(key, JSON.stringify(merged)) } catch (e) {}
          setReadIds(merged)
        } catch (e) {}
      }
    } catch (e) {
      console.warn('markAllRead failed', e)
    }
  }

  const handleMarkReadClick = async (announcementId) => {
    // mark locally and optimistically update UI
    markReadLocal(announcementId)
    setReadIds(prev => prev.includes(announcementId) ? prev : [...prev, announcementId])
    setCount(prev => Math.max(0, prev - 1))
    try {
      await markRead(announcementId)
    } catch (e) {
      // ignore backend errors
    }
  }

  return (
    <div ref={ref} className="header-icon-wrapper">
      <button
        onClick={() => {
          // Only toggle dropdown. Do NOT mark all as read on open.
          setOpen(s => !s)
        }}
        title="系統公告"
        aria-label="系統公告"
        className="header-icon-btn"
        style={{ color: iconColor }}
      >
        <Megaphone size={20} />
        {count > 0 && (
          <span title={`未讀 ${count} / 總共 ${announcements.length}`} aria-label={`未讀 ${count} 則，總共 ${announcements.length} 則`} style={{ position: 'absolute', top: -4, right: -4, background: '#757575', color: '#fff', borderRadius: '50%', minWidth: 18, height: 18, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, padding: '0 4px' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 360, maxHeight: 420, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', background: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 16 }}>系統公告</strong>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#999' }}>{announcements.length} 則（未讀 {count} 則）</span>
            </div>
          </div>
          {announcements.length === 0 ? (
            <div style={{ padding: 20, color: '#666' }}>目前沒有公告</div>
          ) : (
            <div>
                
              {/* Unread section */}
              {announcements.filter(a => !readIds.includes(a.announcement_id)).length > 0 && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', background: '#fff9f0' }}>
                  <strong>未讀</strong>
                </div>
              )}
              {announcements.filter(a => !readIds.includes(a.announcement_id)).map(a => (
                <div key={a.announcement_id} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }} onClick={() => handleMarkReadClick(a.announcement_id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 14 }}>{a.title}</strong>
                    {a.priority === 'high' && <span style={{ fontSize: 11, color: '#fff', background: '#e74c3c', padding: '2px 6px', borderRadius: 10 }}>重要</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 6, whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{a.content}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
                    {a.published_at ? new Date(a.published_at).toLocaleString() : new Date(a.created_at).toLocaleString()}
                    {(a.published_at && a.created_at && (new Date(a.published_at).getTime() !== new Date(a.created_at).getTime())) ? ' (已編輯)' : ''}
                  </div>
                </div>
              ))}

              {/* Read section */}
              {announcements.filter(a => readIds.includes(a.announcement_id)).length > 0 && (
                <div style={{ padding: '8px 12px', borderTop: '8px solid #f7f7f7', marginTop: 8, background: '#f0fff4' }}>
                  <strong>已讀</strong>
                </div>
              )}
              {announcements.filter(a => readIds.includes(a.announcement_id)).map(a => (
                <div key={a.announcement_id} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'default', background: '#f7fff8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 14, color: '#666' }}>{a.title}</strong>
                    {a.priority === 'high' && <span style={{ fontSize: 11, color: '#fff', background: '#e74c3c', padding: '2px 6px', borderRadius: 10 }}>重要</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 6, whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{a.content}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
                    {a.published_at ? new Date(a.published_at).toLocaleString() : new Date(a.created_at).toLocaleString()}
                    {(a.published_at && a.created_at && (new Date(a.published_at).getTime() !== new Date(a.created_at).getTime())) ? ' (已編輯)' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AnnouncementBell
