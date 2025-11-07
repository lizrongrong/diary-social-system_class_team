import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { followAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Users, UserMinus, Mail, Calendar } from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import './FollowPage.css'

function FollowPage() {
  const { user } = useAuthStore()
  const { addToast } = useToast()
  const [follows, setFollows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFollows()
  }, [])

  const loadFollows = async () => {
    try {
      setLoading(true)
      const data = await followAPI.getAll()
      // backend may return { following: [...] } or legacy { friends: [...] }
      setFollows(data.following || data.friends || [])
    } catch (err) {
      console.error('Error loading follows:', err)
      addToast('載入追蹤列表失敗', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFollow = async (targetUserId) => {
    if (!confirm('確定要取消追蹤嗎？')) return
    try {
      await followAPI.remove(targetUserId)
      addToast('已取消追蹤', 'success')
      loadFollows()
    } catch (err) {
      console.error('Error removing follow:', err)
      addToast('取消追蹤失敗', 'error')
    }
  }

  if (loading) {
    return (
      <div className="page follow-page" style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
          <p>載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page follow-page" style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Users size={32} />
          好友管理
        </h2>
        <p className="text-small" style={{ color: 'var(--gray-600)', marginTop: 'var(--spacing-xs)' }}>
          共 {follows.length} 位好友
        </p>
      </div>

      {follows.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
          <Users size={64} style={{ color: 'var(--gray-400)', margin: '0 auto var(--spacing-md)' }} />
          <h3 className="text-h3" style={{ color: 'var(--gray-700)' }}>還沒有好友</h3>
          <p className="text-small" style={{ color: 'var(--gray-600)', margin: 'var(--spacing-sm) 0' }}>
            到首頁探索更多日記，加入新朋友吧！
          </p>
          <Link to="/">
            <Button variant="primary" style={{ marginTop: 'var(--spacing-md)' }}>
              探索日記
            </Button>
          </Link>
        </Card>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--spacing-lg)'
        }}>
          {follows.map(follow => (
            <Card key={(follow.friend_id || follow.follow_id)} hoverable style={{ padding: 'var(--spacing-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: follow.avatar_url ? `url(${follow.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--primary-purple), var(--dark-purple))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '1.5rem',
                  fontWeight: 700
                }}>
                  {!follow.avatar_url && (follow.username || '').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="text-h4" style={{ marginBottom: 'var(--spacing-xs)' }}>
                    {follow.username}
                  </h3>
                  <p className="text-tiny" style={{ color: 'var(--gray-600)' }}>
                    @{follow.username}
                  </p>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--spacing-xs)',
                color: 'var(--gray-600)',
                fontSize: '0.75rem',
                marginBottom: 'var(--spacing-md)'
              }}>
                <Calendar size={14} />
                <span>成為好友：{new Date(follow.created_at).toLocaleDateString('zh-TW')}</span>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <Link to={`/user/${follow.friend_user_id || follow.following_user_id}`} style={{ flex: 1 }}>
                  <Button variant="outline" size="small" style={{ width: '100%' }}>
                    查看資料
                  </Button>
                </Link>

                <Link to={`/messages/${follow.friend_user_id || follow.following_user_id}`} state={{ follow }}>
                  <Button variant="outline" size="small">
                    <Mail size={16} />
                    聊天
                  </Button>
                </Link>

                <Button 
                  variant="outline" 
                  size="small"
                  onClick={() => handleRemoveFollow(follow.friend_user_id || follow.following_user_id)}
                  style={{ 
                    color: 'var(--danger-red)',
                    borderColor: 'var(--danger-red)'
                  }}
                >
                  <UserMinus size={16} />
                  移除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default FollowPage
