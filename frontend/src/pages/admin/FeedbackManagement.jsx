import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import axios from 'axios'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const API_URL = 'http://localhost:3000/api/v1'

function FeedbackManagement() {
  const { user } = useAuthStore()
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeedbacks()
  }, [])

  const loadFeedbacks = async () => {
    try {
      setLoading(true)
      const token = sessionStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }
      // 先嘗試 admin route，若沒有再退回公共 route
      try {
        const resp = await axios.get(`${API_URL}/admin/feedbacks`, config)
        setFeedbacks(resp.data.feedbacks || resp.data || [])
      } catch (err) {
        const resp2 = await axios.get(`${API_URL}/feedbacks`, config)
        setFeedbacks(resp2.data.feedbacks || resp2.data || [])
      }
    } catch (err) {
      console.error('Load feedbacks failed', err)
    } finally {
      setLoading(false)
    }
  }

  if (user && user.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div style={{ padding: 'var(--spacing-xl)', paddingTop: 80, maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="text-h1">意見回饋管理</h1>
      <p className="text-body" style={{ color: 'var(--gray-600)' }}>處理使用者回饋、回覆並標記為已處理（需後端支援管理員回覆 API）。</p>

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <Button variant="outline" onClick={loadFeedbacks}>重新整理</Button>
        </div>

        {loading ? (
          <Card>載入中...</Card>
        ) : feedbacks.length === 0 ? (
          <Card>目前沒有回饋。</Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {feedbacks.map((f) => (
              <Card key={f.id || f.feedback_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{f.subject || f.title || '使用者回饋'}</div>
                    <div className="text-tiny" style={{ color: 'var(--gray-500)' }}>{f.message || f.body}</div>
                    {f.admin_reply && (
                      <div style={{ marginTop: 8, color: 'var(--gray-600)' }}>
                        管理者回覆：{f.admin_reply}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Button variant="outline">查看</Button>
                    <Button variant="primary">回覆（需 API）</Button>
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

export default FeedbackManagement
