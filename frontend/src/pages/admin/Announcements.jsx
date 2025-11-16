import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import axios from 'axios'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const API_URL = 'http://localhost:3000/api/v1'

function Announcements() {
  const { user } = useAuthStore()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnnouncements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      if (user && user.role === 'admin') {
        // admin view -> admin list
        const token = sessionStorage.getItem('token')
        const resp = await axios.get(`${API_URL}/admin/announcements`, { headers: { Authorization: `Bearer ${token}` } })
        setAnnouncements(resp.data.announcements || [])
      } else {
        // public view -> active announcements
        const resp = await axios.get(`${API_URL}/announcements/active`)
        // backend returns { announcements: [...] }
        setAnnouncements(resp.data.announcements || [])
      }
    } catch (err) {
      console.error('Load announcements failed', err)
    } finally {
      setLoading(false)
    }
  }

  const navigate = useNavigate()

  const handleDelete = async (id) => {
    if (!window.confirm('確定要刪除此公告？此操作無法復原。')) return
    try {
      const token = sessionStorage.getItem('token')
      await axios.delete(`${API_URL}/admin/announcements/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      // reload
      await loadAnnouncements()
      try { window.dispatchEvent(new Event('announcements:updated')) } catch (e) {}
    } catch (err) {
      console.error('Delete announcement failed', err)
      alert('刪除失敗，請稍後再試')
    }
  }

  const goCreate = () => {
    navigate('/admin/announcements/new')
  }

  // 非 admin 也可以看到公告頁（只顯示公開公告），所以不導向
  // 但如果你想限定管理介面只有 admin 使用，可用其他頁面區分

  return (
    <div style={{ padding: 'var(--spacing-xl)', paddingTop: 80, maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="text-h1">系統公告</h1>
      {/* <p className="text-body" style={{ color: 'var(--gray-600)' }}>列表與發佈介面（管理員可建立/刪除公告）。</p> */}

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-md)' }}>
          <Button variant="outline" onClick={loadAnnouncements}>重新整理</Button>
        </div>

        {loading ? (
          <Card>載入中...</Card>
        ) : announcements.length === 0 ? (
          <Card>目前沒有公告。</Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {announcements.map((a) => (
              <Card key={a.announcement_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ maxWidth: '75%' }}>
                    <div className="text-body" style={{ fontWeight: 600 }}>{a.title}</div>
                    <div className="text-tiny" style={{ color: 'var(--gray-500)', marginTop: 6, whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{a.content}</div>
                    <div className="text-tiny" style={{ color: 'var(--gray-400)', marginTop: 8 }}>
                      發布者: {a.admin_username || a.admin_id} • {a.published_at ? new Date(a.published_at).toLocaleString('zh-TW') : new Date(a.created_at).toLocaleString('zh-TW')}{(a.published_at && a.created_at && (new Date(a.published_at).getTime() !== new Date(a.created_at).getTime())) ? ' (已編輯)' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {user && user.role === 'admin' ? (
                      <>
                        <Button variant="outline" onClick={() => navigate(`/admin/announcements/${a.announcement_id}/edit`)}>編輯</Button>
                        <Button variant="danger" onClick={() => handleDelete(a.announcement_id)}>刪除</Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating create button for admins */}
      {user && user.role === 'admin' && (
        <button
          onClick={goCreate}
          aria-label="新增公告"
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            background: 'var(--primary-purple)',
            color: 'white',
            border: 'none',
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
            fontSize: 28,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            lineHeight: '1'
          }}
        >
          <span style={{ display: 'inline-block', transform: 'translateY(-1px)' }}>+</span>
        </button>
      )}
    </div>
  )
}

export default Announcements
