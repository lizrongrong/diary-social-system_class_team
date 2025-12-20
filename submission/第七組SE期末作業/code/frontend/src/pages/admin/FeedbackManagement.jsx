import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import axios from 'axios'
import api from '../../services/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const API_URL = 'http://localhost:3000/api/v1'

function FeedbackManagement() {
  const { user } = useAuthStore()
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [openReplyFor, setOpenReplyFor] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadFeedbacks()
  }, [])

  const loadFeedbacks = async () => {
    setErrorMsg(null)
        try {
          setLoading(true)
          // Use centralized api client which automatically injects token
          try {
            const resp = await api.get('/admin/feedbacks')
            setFeedbacks(resp.data.feedbacks || resp.data || [])
            return
          } catch (adminErr) {
            // If admin route fails due to permission, try fetching current user's feedbacks
            console.warn('Admin route failed, trying user feedbacks:', adminErr?.response?.status, adminErr?.response?.data)
            if (adminErr?.response) {
              setErrorMsg(`Admin API returned ${adminErr.response.status}: ${adminErr.response.data?.message || adminErr.response.data?.error || JSON.stringify(adminErr.response.data)}`)
            }
        try {
          const resp2 = await api.get('/feedbacks')
          setFeedbacks(resp2.data.feedbacks || resp2.data || [])
        } catch (userErr) {
          console.error('Failed to fetch feedbacks (user route):', userErr)
              // try dev fallback route
              try {
                const devResp = await api.get('/dev/feedbacks')
                setFeedbacks(devResp.data.feedbacks || devResp.data || [])
                setErrorMsg(`Admin/user API failed, using dev fallback (dev/feedbacks). Original error: ${userErr.message}`)
              } catch (devErr) {
                console.error('Dev fallback failed:', devErr)
                setErrorMsg(`Failed to fetch feedbacks: ${userErr.response?.status || ''} ${userErr.response?.data?.message || userErr.message}`)
              }
        }
      }
    } catch (err) {
      console.error('Load feedbacks failed', err)
      setErrorMsg(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (user && user.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div style={{ padding: 'var(--spacing-xl)', paddingTop: 80, maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="text-h1">意見回饋管理</h1>
      {/* <p className="text-body" style={{ color: 'var(--gray-600)' }}>處理使用者回饋、回覆並標記為已處理（需後端支援管理員回覆 API）。</p> */}

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={loadFeedbacks}>重新整理</Button>
        </div>

        {loading ? (
          <Card>載入中...</Card>
        ) : errorMsg ? (
          <Card>載入失敗：{errorMsg}</Card>
        ) : feedbacks.length === 0 ? (
          <Card>目前沒有回饋。</Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {feedbacks.map((f) => (
              <Card key={f.id || f.feedback_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--primary-purple)', marginBottom: 4, fontWeight: 500 }}>
                      來自: {f.username ? `${f.username} (${f.user_id})` : (f.user_id || '未知使用者')}
                    </div>
                    <div style={{ fontWeight: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{f.subject || f.title || '使用者回饋'}</div>
                    <div className="text-tiny" style={{ color: 'var(--gray-500)', marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{f.message || f.body || f.description}</div>
                    {f.admin_reply && (
                      <div style={{ marginTop: 8, color: 'var(--gray-600)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        管理者回覆：{f.admin_reply}
                      </div>
                    )}
                    {/* reply panel */}
                    {openReplyFor === (f.id || f.feedback_id) && !f.admin_reply && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>回覆問題</div>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="請輸入回覆內容，將發送到使用者的系統通知"
                          style={{ minHeight: 100, padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid var(--gray-200)' }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button variant="primary" disabled={submitting || !replyText.trim()} onClick={async () => {
                            try {
                              setSubmitting(true)
                              const id = f.id || f.feedback_id
                                await api.put(`/admin/feedbacks/${id}/reply`, { admin_reply: replyText.trim(), status: 'resolved' })
                              // update local state
                              setFeedbacks(prev => prev.map(item => ( (item.id || item.feedback_id) === id ? { ...item, admin_reply: replyText.trim(), status: 'resolved' } : item )))
                              setOpenReplyFor(null)
                              setReplyText('')
                            } catch (err) {
                              console.error('Reply failed', err)
                              alert(err.response?.data?.message || '回覆失敗')
                                alert(err.response?.data?.message || err.response?.data?.error || '回覆失敗')
                            } finally {
                              setSubmitting(false)
                            }
                          }}>送出回覆</Button>
                          <Button variant="outline" onClick={() => { setOpenReplyFor(null); setReplyText('') }}>取消</Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {f.admin_reply ? (
                      <Button variant="secondary" disabled>已回覆</Button>
                    ) : (
                      <Button variant="primary" onClick={() => { const fid = f.id || f.feedback_id; if (openReplyFor === fid) { setOpenReplyFor(null); setReplyText('') } else { setOpenReplyFor(fid); setReplyText('') } }}>
                        回覆
                      </Button>
                    )}
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
