import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { diaryAPI } from '../services/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Heart, MessageCircle, Share2, User } from 'lucide-react'
import useAuthStore from '../store/authStore'
import GuestModal from '../components/ui/GuestModal'

function ExplorePage() {
  const [diaries, setDiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showGuestModal, setShowGuestModal] = useState(false)
  const { user } = useAuthStore()

  useEffect(() => {
    const load = async () => {
      try {
        const data = await diaryAPI.explore()
        setDiaries(data?.items || data?.diaries || data || [])
      } catch (e) {
        setError(e.response?.data?.message || '無法載入探索內容')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="page explore-page fade-in" style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
        <div className="skeleton" style={{ width: '100%', height: 400, borderRadius: 'var(--radius-lg)' }}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page explore-page" style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--error-color)' }}>
            <p className="text-body">{error}</p>
            <Button variant="primary" onClick={() => window.location.reload()} style={{ marginTop: 'var(--spacing-md)' }}>
              重新載入
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="page explore-page fade-in" style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h2 className="text-h2" style={{ color: 'var(--primary-purple)' }}> 探索公開日記</h2>
        <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--spacing-sm)' }}>
          發現其他人的精彩故事與心情分享
        </p>
      </div>

      {diaries.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}></div>
            <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-sm)' }}>暫無公開日記</h3>
            <p className="text-body" style={{ color: 'var(--gray-600)', marginBottom: 'var(--spacing-lg)' }}>
              目前還沒有人分享公開日記，成為第一個分享的人吧！
            </p>
            {user ? (
              <Link to="/diaries/new" style={{ textDecoration: 'none' }}>
                <Button variant="primary">寫我的第一篇</Button>
              </Link>
            ) : (
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <Button variant="primary">註冊開始寫作</Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {diaries.map((diary, index) => (
            <Card 
              key={diary.diary_id || diary.id} 
              hoverable 
              className="slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* 作者資訊 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: 'var(--spacing-md)',
                paddingBottom: 'var(--spacing-md)',
                borderBottom: '1px solid var(--gray-200)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <Link to={`/users/${diary.user_id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, var(--primary-purple), var(--primary-pink))`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      border: '2px solid var(--gray-200)'
                    }}>
                      {(diary.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  </Link>
                  <div>
                    <Link 
                      to={`/users/${diary.user_id}`} 
                      style={{ textDecoration: 'none', color: 'inherit' }}
                      className="hover-lift"
                    >
                      <div className="text-body" style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                        {diary.username || '匿名用戶'}
                      </div>
                    </Link>
                    <div className="text-small" style={{ color: 'var(--gray-600)' }}>
                      {new Date(diary.created_at || diary.createdAt).toLocaleDateString('zh-TW', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>

                {!user && (
                  <Button 
                    variant="outline" 
                    size="small"
                    onClick={() => setShowGuestModal(true)}
                  >
                    <User size={16} style={{ marginRight: 'var(--spacing-xs)' }} />
                    追蹤
                  </Button>
                )}
              </div>

              {/* 日記內容 */}
              <Link 
                to={`/diaries/${diary.diary_id || diary.id}`} 
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <h3 className="text-h3" style={{ 
                  marginBottom: 'var(--spacing-md)',
                  color: 'var(--gray-900)'
                }}>
                  {diary.title || '(未命名)'}
                </h3>

                {/* 標籤 */}
                {diary.tags && diary.tags.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 'var(--spacing-xs)', 
                    marginBottom: 'var(--spacing-md)' 
                  }}>
                    {diary.tags.filter(t => t.tag_type === 'emotion').slice(0, 3).map((t, i) => (
                      <span 
                        key={i} 
                        style={{ 
                          padding: '4px 12px', 
                          background: 'var(--emotion-pink)', 
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: 'var(--dark-purple)'
                        }}
                      >
                        {t.tag_value}
                      </span>
                    ))}
                    {diary.tags.find(t => t.tag_type === 'weather') && (
                      <span 
                        style={{ 
                          padding: '4px 12px', 
                          background: '#B2EBF2', 
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#006064'
                        }}
                      >
                        {diary.tags.find(t => t.tag_type === 'weather').tag_value}
                      </span>
                    )}
                    {diary.tags.filter(t => t.tag_type === 'keyword').slice(0, 3).map((t, i) => (
                      <span 
                        key={i} 
                        style={{ 
                          padding: '4px 12px', 
                          background: 'var(--gray-200)', 
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.875rem',
                          color: 'var(--gray-700)'
                        }}
                      >
                        #{t.tag_value}
                      </span>
                    ))}
                  </div>
                )}

                {/* 內容預覽 */}
                <p className="text-body" style={{ 
                  color: 'var(--gray-700)',
                  lineHeight: 1.6,
                  marginBottom: 'var(--spacing-md)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {diary.content}
                </p>
              </Link>

              {/* 互動區 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--spacing-lg)',
                paddingTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--gray-200)'
              }}>
                <button
                  onClick={() => !user && setShowGuestModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    cursor: 'pointer',
                    color: 'var(--gray-600)',
                    fontSize: '0.875rem',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all var(--transition-base)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--gray-100)'
                    e.currentTarget.style.color = 'var(--primary-purple)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--gray-600)'
                  }}
                >
                  <Heart size={18} />
                  <span>{diary.like_count || 0}</span>
                </button>

                <Link
                  to={`/diaries/${diary.diary_id || diary.id}`}
                  style={{
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    color: 'var(--gray-600)',
                    fontSize: '0.875rem',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all var(--transition-base)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--gray-100)'
                    e.currentTarget.style.color = 'var(--primary-purple)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--gray-600)'
                  }}
                >
                  <MessageCircle size={18} />
                  <span>{diary.comment_count || 0}</span>
                </Link>

                <button
                  onClick={() => !user && setShowGuestModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    cursor: 'pointer',
                    color: 'var(--gray-600)',
                    fontSize: '0.875rem',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all var(--transition-base)',
                    marginLeft: 'auto'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--gray-100)'
                    e.currentTarget.style.color = 'var(--primary-purple)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--gray-600)'
                  }}
                >
                  <Share2 size={18} />
                  <span>分享</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Guest Modal */}
      {showGuestModal && <GuestModal onClose={() => setShowGuestModal(false)} />}
    </div>
  )
}

export default ExplorePage
