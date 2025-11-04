import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { userAPI, diaryAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { friendAPI } from '../services/api'
import { UserPlus, UserMinus, Calendar, Heart, MessageCircle, Eye, MessageSquare } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

function UserProfilePage() {
  const { userId } = useParams()
  const { user: currentUser } = useAuthStore()
  const [user, setUser] = useState(null)
  const [followStatus, setFollowStatus] = useState({ followerCount: 0, followingCount: 0, isFollowing: false })
  const [diaries, setDiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        // Load user profile
        const userResponse = await userAPI.getProfile(userId)
        setUser(userResponse.data)

        // Load follow status and counts via friends API
        const [status, counts] = await Promise.all([
          friendAPI.checkStatus(userId),
          friendAPI.getCounts(userId)
        ])
        setFollowStatus({
          followerCount: counts.followerCount,
          followingCount: counts.followingCount,
          isFollowing: !!status.isFriend
        })

        // Load user's public diaries
        const diariesResponse = await diaryAPI.getUserPublicDiaries(userId)
        setDiaries(diariesResponse.data.diaries || [])
      } catch (e) {
        setError(e.response?.data?.message || '無法載入用戶資料')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  const handleToggleFollow = async () => {
    if (!currentUser) return
    
    setToggling(true)
    try {
      if (followStatus.isFollowing) {
        await friendAPI.remove(userId)
      } else {
        await friendAPI.add(userId)
      }
      const counts = await friendAPI.getCounts(userId)
      setFollowStatus({
        followerCount: counts.followerCount,
        followingCount: counts.followingCount,
        isFollowing: !followStatus.isFollowing
      })
    } catch (e) {
      alert('操作失敗：' + (e.response?.data?.message || e.message))
    } finally {
      setToggling(false)
    }
  }

  if (loading) return (
    <div style={{ 
      padding: 'var(--spacing-2xl)', 
      textAlign: 'center',
      paddingTop: '100px'
    }}>
      <div className="text-h3" style={{ color: 'var(--gray-500)' }}>載入中...</div>
    </div>
  )
  
  if (error) return (
    <div style={{ 
      padding: 'var(--spacing-2xl)', 
      textAlign: 'center',
      paddingTop: '100px'
    }}>
      <div className="text-h3" style={{ color: 'var(--error-red)' }}>{error}</div>
    </div>
  )
  
  if (!user) return null

  const isOwnProfile = currentUser?.user_id === userId

  return (
    <div style={{ 
      padding: 'var(--spacing-xl)',
      paddingTop: '80px',
      maxWidth: 1000,
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      {/* Profile Card */}
      <Card className="slide-up" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            {/* Avatar */}
            <div style={{ 
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary-purple), var(--primary-pink))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 32,
              fontWeight: 700,
              boxShadow: 'var(--shadow-lg)'
            }}>
              {(user.display_name || user.username || 'U').charAt(0).toUpperCase()}
            </div>
            
            <div>
              <h2 className="text-h2" style={{ marginBottom: 'var(--spacing-xs)' }}>
                {user.display_name || user.username}
              </h2>
              <p className="text-body" style={{ color: 'var(--gray-600)' }}>
                @{user.username}
              </p>
            </div>
          </div>
          
          {/* Follow Button */}
          {!isOwnProfile && currentUser && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link to={`/messages/${userId}`} state={{ friend: user }} style={{ textDecoration: 'none' }}>
                <Button variant="outline">
                  <MessageSquare size={16} /> 聊天
                </Button>
              </Link>

              <Button
                variant={followStatus.isFollowing ? 'outline' : 'primary'}
                onClick={handleToggleFollow}
                disabled={toggling}
              >
                {followStatus.isFollowing ? (
                  <>
                    <UserMinus size={16} />
                    取消追蹤
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    追蹤
                  </>
                )}
              </Button>
            </div>
          )}

          {isOwnProfile && (
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <Button variant="primary">
                編輯個人資料
              </Button>
            </Link>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-body" style={{ 
            color: 'var(--gray-700)',
            marginBottom: 'var(--spacing-lg)',
            paddingTop: 'var(--spacing-md)',
            borderTop: '1px solid var(--gray-200)'
          }}>
            {user.bio}
          </p>
        )}

        {/* Stats */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--spacing-xl)',
          paddingTop: 'var(--spacing-md)',
          borderTop: '1px solid var(--gray-200)'
        }}>
          <div>
            <strong className="text-h3" style={{ color: 'var(--primary-purple)' }}>
              {followStatus.followerCount}
            </strong>
            <span className="text-body" style={{ marginLeft: 'var(--spacing-xs)', color: 'var(--gray-600)' }}>
              粉絲
            </span>
          </div>
          <div>
            <strong className="text-h3" style={{ color: 'var(--primary-purple)' }}>
              {followStatus.followingCount}
            </strong>
            <span className="text-body" style={{ marginLeft: 'var(--spacing-xs)', color: 'var(--gray-600)' }}>
              追蹤中
            </span>
          </div>
          <div>
            <strong className="text-h3" style={{ color: 'var(--primary-purple)' }}>
              {diaries.length}
            </strong>
            <span className="text-body" style={{ marginLeft: 'var(--spacing-xs)', color: 'var(--gray-600)' }}>
              公開日記
            </span>
          </div>
        </div>
      </Card>

      {/* Public Diaries */}
      <div>
        <h3 className="text-h3" style={{ 
          marginBottom: 'var(--spacing-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)'
        }}>
          <Eye size={24} style={{ color: 'var(--primary-purple)' }} />
          公開日記
        </h3>

        {diaries.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: 'var(--spacing-3xl)' }}>
            <Calendar size={64} style={{ color: 'var(--gray-300)', margin: '0 auto var(--spacing-lg)' }} />
            <h4 className="text-h4" style={{ color: 'var(--gray-600)', marginBottom: 'var(--spacing-sm)' }}>
              還沒有公開日記
            </h4>
            <p className="text-body" style={{ color: 'var(--gray-500)' }}>
              {isOwnProfile ? '開始寫下第一篇日記吧！' : '這位用戶還沒有公開的日記'}
            </p>
          </Card>
        ) : (
          <div style={{ 
            display: 'grid',
            gap: 'var(--spacing-lg)'
          }}>
            {diaries.map((diary, index) => (
              <Card 
                key={diary.diary_id}
                hoverable
                className="slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Link 
                  to={`/diaries/${diary.diary_id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <h4 className="text-h4" style={{ 
                      marginBottom: 'var(--spacing-xs)',
                      color: 'var(--dark-purple)'
                    }}>
                      {diary.title || '無標題'}
                    </h4>
                    <div className="text-small" style={{ 
                      color: 'var(--gray-500)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)'
                    }}>
                      <Calendar size={14} />
                      {new Date(diary.created_at).toLocaleDateString('zh-TW', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>

                  {/* Preview Content */}
                  {diary.content && (
                    <p className="text-body" style={{ 
                      color: 'var(--gray-700)',
                      marginBottom: 'var(--spacing-md)',
                      lineHeight: 1.6,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {diary.content}
                    </p>
                  )}

                  {/* Tags */}
                  {diary.tags && diary.tags.length > 0 && (
                    <div style={{ 
                      display: 'flex',
                      gap: 'var(--spacing-xs)',
                      flexWrap: 'wrap',
                      marginBottom: 'var(--spacing-md)'
                    }}>
                      {diary.tags.slice(0, 5).map((tag, i) => (
                        <span
                          key={i}
                          className="text-tiny"
                          style={{
                            background: tag.tag_type === 'emotion' ? 'var(--emotion-pink)' : 'var(--weather-blue)',
                            color: 'var(--dark-purple)',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontWeight: 500
                          }}
                        >
                          {tag.tag_value}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div style={{ 
                    display: 'flex',
                    gap: 'var(--spacing-lg)',
                    paddingTop: 'var(--spacing-md)',
                    borderTop: '1px solid var(--gray-200)',
                    color: 'var(--gray-500)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                      <Heart size={16} />
                      <span className="text-small">{diary.like_count || 0}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                      <MessageCircle size={16} />
                      <span className="text-small">{diary.comment_count || 0}</span>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default UserProfilePage
