import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import axios from 'axios'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

const API_URL = 'http://localhost:3000/api/v1'

function AnnouncementForm() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const { id } = useParams()
  const isEdit = !!id

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return
      try {
        const token = sessionStorage.getItem('token')
        const resp = await axios.get(`${API_URL}/admin/announcements/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        const ann = resp.data.announcement
        if (ann) {
          setTitle(ann.title || '')
          setContent(ann.content || '')
        }
      } catch (e) {
        console.error('Load announcement for edit failed', e)
        alert('載入公告失敗')
        navigate('/admin/announcements')
      }
    }
    load()
  }, [id, isEdit, navigate])

  if (!user || user.role !== 'admin') {
    return <Card>未授權</Card>
  }

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      alert('請填寫標題與內容')
      return
    }
    setIsPublishing(true)
    try {
      const token = sessionStorage.getItem('token')
      let updatedAnnouncement = null
      if (isEdit) {
        const r = await axios.put(`${API_URL}/admin/announcements/${id}`, { title, content }, { headers: { Authorization: `Bearer ${token}` } })
        updatedAnnouncement = r.data?.announcement || null
        // clear local read marks for this announcement across any ann_reads_v1 keys
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (!k) continue
            if (k.startsWith('ann_reads_v1:')) {
              const raw = localStorage.getItem(k) || '[]'
              let arr = []
              try { arr = JSON.parse(raw) } catch (e) { arr = [] }
              const filtered = arr.filter(x => x !== id)
              localStorage.setItem(k, JSON.stringify(filtered))
            }
          }
        } catch (e) {
          // ignore storage errors
        }
      } else {
        const r = await axios.post(`${API_URL}/admin/announcements`, { title, content }, { headers: { Authorization: `Bearer ${token}` } })
        updatedAnnouncement = r.data?.announcement || null
      }
      // dispatch an event so header bell refreshes immediately
      try {
        // include updated id and the updated announcement so listeners can immediately apply changes
        const ev = new CustomEvent('announcements:updated', { detail: { updatedIds: isEdit ? [id] : [], updatedAnnouncements: updatedAnnouncement ? [updatedAnnouncement] : [] } })
        window.dispatchEvent(ev)
      } catch (e) {
        // ignore
      }
      alert(isEdit ? '公告已更新' : '公告已發布')
      navigate('/admin/announcements')
    } catch (err) {
      console.error('Publish announcement failed', err)
      alert(err.response?.data?.message || '發布/更新失敗')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div style={{ padding: 'var(--spacing-xl)', paddingTop: 80, maxWidth: 800, margin: '0 auto' }}>
      <h1 className="text-h1">{isEdit ? '編輯系統公告' : '新增系統公告'}</h1>
      {/* <p className="text-body" style={{ color: 'var(--gray-600)' }}>輸入公告標題與內容，按下發布後公告會儲存並顯示於系統公告區。</p> */}

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <label className="text-tiny" style={{ fontSize: 16, fontWeight: 600 }}>公告標題</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="請輸入標題" style={{ padding: 12, fontSize: 20, borderRadius: 8, border: '1px solid #ddd' }} />

            <label className="text-tiny" style={{ fontSize: 16, fontWeight: 600 }}>公告內容</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="請輸入公告內容" rows={8} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: '1px solid #ddd', resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => navigate('/admin/announcements')}>取消</Button>
              <Button variant="primary" onClick={handlePublish} disabled={isPublishing}>{isPublishing ? (isEdit ? '更新中...' : '發布中...') : (isEdit ? '更新' : '發布')}</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default AnnouncementForm
