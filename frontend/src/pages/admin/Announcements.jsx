import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
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
        const resp = await axios.get(`${API_URL}/admin/announcements`)
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

  // 非 admin 也可以看到公告頁（只顯示公開公告），所以不導向
  // 但如果你想限定管理介面只有 admin 使用，可用其他頁面區分

  return (
    <div style={{ padding: 'var(--spacing-xl)', paddingTop: 80, maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="text-h1">系統公告</h1>
      <p className="text-body" style={{ color: 'var(--gray-600)' }}>列表與發佈介面（管理員可建立/刪除公告）。</p>

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-md)' }}>
          {user && user.role === 'admin' && (
            <Button variant="primary">建立公告（需後端 API）</Button>
          )}
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
                    <div className="text-tiny" style={{ color: 'var(--gray-500)', marginTop: 6 }}>{a.content}</div>
                    <div className="text-tiny" style={{ color: 'var(--gray-400)', marginTop: 8 }}>
                      發布者: {a.admin_username || a.admin_id} • {a.published_at ? new Date(a.published_at).toLocaleString('zh-TW') : new Date(a.created_at).toLocaleString('zh-TW')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {user && user.role === 'admin' ? (
                      <>
                        <Button variant="outline">編輯</Button>
                        <Button variant="danger">刪除</Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Announcements
