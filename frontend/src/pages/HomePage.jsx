import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Share2, UserPlus, UserCheck, Users } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { diaryAPI, likeAPI, followAPI } from '../services/api'
import { useToast } from '../components/ui/Toast'
import './HomePage.css'

function HomePage() {
  const { user } = useAuthStore()
  const { addToast } = useToast()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [follows, setFollows] = useState([])
  const [mutualFollows, setMutualFollows] = useState(new Set()) // 儲存互相追蹤的用戶ID

  // 獲取公開日記
  useEffect(() => {
    fetchPublicDiaries()
    if (user) {
      fetchFollows()
    }
  }, [user])

  // 監聽首頁重整事件
  useEffect(() => {
    const handleRefresh = () => {
      fetchPublicDiaries()
    }
    window.addEventListener('homepageRefresh', handleRefresh)
    return () => window.removeEventListener('homepageRefresh', handleRefresh)
  }, [user])

  const fetchPublicDiaries = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching public diaries...')
      const data = await diaryAPI.explore({ page: 1, limit: user ? 20 : 6 })
      console.log('Received data:', data)
      
      // 隨機排序日記
      const diariesArray = data.diaries || []
      const shuffled = [...diariesArray].sort(() => Math.random() - 0.5)
      setPosts(shuffled)
    } catch (err) {
      console.error('Error fetching public diaries:', err)
      setError('無法載入日記')
    } finally {
      setLoading(false)
    }
  }

  const fetchFollows = async () => {
    try {
      const data = await followAPI.getAll()
      const list = data.following || data.friends || []
      console.log('=== 我追蹤的人 ===')
      console.log('當前用戶:', user?.username, user?.user_id)
      console.log('追蹤列表:', list)
      list.forEach(f => {
        console.log(`  → 我追蹤: ${f.username} (${f.friend_user_id || f.following_user_id})`)
      })
      setFollows(list)

      // 檢查每個好友是否互相追蹤
      const mutuals = new Set()
      for (const friend of list) {
        try {
          const targetId = friend.friend_user_id || friend.following_user_id
          const status = await followAPI.checkStatus(targetId)
          console.log(`檢查 ${friend.username}: isFriend=${status.isFriend}, followsYou=${status.followsYou}, isMutual=${status.isMutual}`)
          if (status.isMutual) {
            mutuals.add(targetId)
          }
        } catch (err) {
          console.error('Error checking mutual status:', err)
        }
      }
      console.log('互相追蹤的用戶:', Array.from(mutuals))
      setMutualFollows(mutuals)
    } catch (err) {
      console.error('Error fetching follows:', err)
    }
  }

  const isFriend = (userId) => {
    const result = follows.some(f => (f.friend_user_id || f.following_user_id) === userId)
    console.log(`Checking if ${userId} is friend:`, result, 'Follows:', follows)
    return result
  }

  const isMutual = (userId) => {
    return mutualFollows.has(userId)
  }

  const handleLike = async (diaryId) => {
    if (!user) {
      addToast('請先登入', 'warning')
      return
    }
    
    try {
      await likeAPI.toggle('diary', diaryId)
      // 更新本地狀態
      setPosts(posts.map(post => {
        if (post.diary_id === diaryId) {
          return {
            ...post,
            is_liked: !post.is_liked,
            like_count: post.is_liked ? post.like_count - 1 : post.like_count + 1
          }
        }
        return post
      }))
    } catch (err) {
      console.error('Error toggling like:', err)
      addToast('操作失敗', 'error')
    }
  }

  const handleFollow = async (userId) => {
    if (!user) {
      addToast('請先登入', 'warning')
      return
    }
    
    if (isFriend(userId)) {
      addToast('已經追蹤此用戶', 'info')
      return
    }
    
    try {
    console.log('Adding follow:', userId)
    const result = await followAPI.add(userId)
      
      // 如果是互相追蹤，顯示特別訊息
      if (result.is_mutual) {
        addToast('追蹤成功！你們現在互相追蹤了', 'success')
      } else {
        addToast('追蹤成功', 'success')
      }
      
  await fetchFollows() // 重新獲取追蹤列表和互相追蹤狀態
      console.log('Friends updated after adding')
    } catch (err) {
      console.error('Error adding friend:', err)
      const errorMsg = err.response?.data?.message || '追蹤失敗'
      addToast(errorMsg, 'error')
    }
  }

  const handleShare = (diaryId) => {
    const url = `${window.location.origin}/diaries/${diaryId}`
    navigator.clipboard.writeText(url)
    addToast('連結已複製', 'success')
  }

  // 顯示限制訪客提示
  const showGuestLimit = !user && posts.length >= 3

  if (loading) {
    return (
      <div className="home-page">
        <div className="loading-state">
          <p>載入中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="home-page">
        <div className="empty-state">
          <h3>{error}</h3>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="home-page">
        <div className="empty-state">
          <h3>此系統還未有任何日記</h3>
          <p>成為第一個分享生活的人吧！</p>
        </div>
      </div>
    )
  }

  return (
    <div className="home-page">
      <div className="posts-container">
        {posts.map(post => (
          <article key={post.diary_id} className="post-card">
            <div className="post-header">
              <div className="author-info">
                <div className="author-avatar" style={{ 
                  backgroundImage: post.avatar_url ? `url(${post.avatar_url})` : 'none',
                  backgroundColor: post.avatar_url ? 'transparent' : '#E0E0E0'
                }}></div>
                <div className="author-details">
                  <h3 className="author-name">{post.username || '匿名用戶'}</h3>
                  <span className="post-date">
                    {new Date(post.created_at).toLocaleDateString('zh-TW')}
                  </span>
                </div>
              </div>
              {user && user.user_id !== post.user_id && (
                <button 
                  className={`follow-btn ${
                    isMutual(post.user_id) ? 'is-mutual' : 
                    isFriend(post.user_id) ? 'is-friend' : ''
                  }`}
                  onClick={() => handleFollow(post.user_id)}
                  disabled={isFriend(post.user_id)}
                >
                  {isMutual(post.user_id) ? (
                    <>
                      <Users size={16} />
                      互相追蹤
                    </>
                  ) : isFriend(post.user_id) ? (
                    <>
                      <UserCheck size={16} />
                      已追蹤
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      追蹤
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="post-content">
              <Link 
                to={`/diaries/${post.diary_id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <h3 className="post-title">{post.title || '(未命名)'}</h3>
              </Link>
              
              {/* 標籤 */}
              {post.tags && post.tags.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '6px', 
                  marginBottom: '12px' 
                }}>
                  {post.tags.filter(t => t.tag_type === 'emotion').slice(0, 2).map((t, i) => (
                    <span 
                      key={i} 
                      style={{ 
                        padding: '3px 10px', 
                        background: 'var(--emotion-pink)', 
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'var(--dark-purple)'
                      }}
                    >
                      {t.tag_value}
                    </span>
                  ))}
                  {post.tags.find(t => t.tag_type === 'weather') && (
                    <span 
                      style={{ 
                        padding: '3px 10px', 
                        background: '#B2EBF2', 
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: '#006064'
                      }}
                    >
                      {post.tags.find(t => t.tag_type === 'weather').tag_value}
                    </span>
                  )}
                  {post.tags.filter(t => t.tag_type === 'keyword').slice(0, 3).map((t, i) => (
                    <span 
                      key={i} 
                      style={{ 
                        padding: '3px 10px', 
                        background: 'var(--gray-200)', 
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        color: 'var(--gray-700)'
                      }}
                    >
                      #{t.tag_value}
                    </span>
                  ))}
                </div>
              )}
              
              <p>{post.content}</p>
            </div>

            <div className="post-footer">
              <button 
                className={`post-action ${post.is_liked ? 'liked' : ''}`}
                onClick={() => handleLike(post.diary_id)}
              >
                <Heart size={20} fill={post.is_liked ? '#CD79D5' : 'none'} />
                <span>{post.like_count || 0}</span>
              </button>
              <Link to={`/diaries/${post.diary_id}`} className="post-action">
                <MessageCircle size={20} />
                <span>{post.comment_count || 0}</span>
              </Link>
              <button className="post-action share-btn" onClick={() => handleShare(post.diary_id)}>
                <Share2 size={20} />
                分享
              </button>
            </div>
          </article>
        ))}

        {/* 訪客限制提示 */}
        {showGuestLimit && (
          <div className="guest-limit-notice">
            <h3>想看更多精彩內容？</h3>
            <p>註冊成為會員，探索更多朋友的日記與故事</p>
            <div className="cta-buttons">
              <Link to="/register">
                <button className="register-btn">立即註冊</button>
              </Link>
              <Link to="/login">
                <button className="login-btn">登入帳號</button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage
