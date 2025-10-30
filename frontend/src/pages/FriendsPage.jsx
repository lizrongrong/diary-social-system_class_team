import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { friendAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Users, UserMinus, Mail, Calendar } from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import './FriendsPage.css'

function FriendsPage() {
  const { user } = useAuthStore()
  const { addToast } = useToast()
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFriends()
  }, [])

  const loadFriends = async () => {
    try {
      setLoading(true)
      const data = await friendAPI.getAll()
      setFriends(data.friends || [])
    } catch (err) {
      console.error('Error loading friends:', err)
      addToast('載入好友列表失敗', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFriend = async (friendId) => {
    if (!confirm('確定要移除此好友嗎？')) return
    
    try {
      await friendAPI.remove(friendId)
      addToast('已移除好友', 'success')
      loadFriends()
    } catch (err) {
      console.error('Error removing friend:', err)
      addToast('移除好友失敗', 'error')
    }
  }

  if (loading) {
    return (
      <div className="page friends-page" style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
          <p>載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page friends-page" style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Users size={32} />
          好友管理
        </h2>
        <p className="text-small" style={{ color: 'var(--gray-600)', marginTop: 'var(--spacing-xs)' }}>
          共 {friends.length} 位好友
        </p>
      </div>

      {friends.length === 0 ? (
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
          {friends.map(friend => (
            <Card key={friend.friend_id} hoverable style={{ padding: 'var(--spacing-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: friend.avatar_url ? `url(${friend.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--primary-purple), var(--dark-purple))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '1.5rem',
                  fontWeight: 700
                }}>
                  {!friend.avatar_url && (friend.display_name || friend.username).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="text-h4" style={{ marginBottom: 'var(--spacing-xs)' }}>
                    {friend.display_name || friend.username}
                  </h3>
                  <p className="text-tiny" style={{ color: 'var(--gray-600)' }}>
                    @{friend.username}
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
                <span>成為好友：{new Date(friend.created_at).toLocaleDateString('zh-TW')}</span>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <Link to={`/user/${friend.friend_user_id}`} style={{ flex: 1 }}>
                  <Button variant="outline" size="small" style={{ width: '100%' }}>
                    查看資料
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="small"
                  onClick={() => handleRemoveFriend(friend.friend_user_id)}
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

export default FriendsPage
