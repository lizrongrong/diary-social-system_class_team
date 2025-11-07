import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { diaryAPI } from '../../services/api'
import useAuthStore from '../../store/authStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Heart, MessageCircle, Edit3, Trash2, Eye, EyeOff, PenTool } from 'lucide-react'

function DiariesList() {
  const { user } = useAuthStore()
  const [diaries, setDiaries] = useState([])
  const [followDiaries, setFollowDiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // all, public, private, draft, friends
  const navigate = useNavigate()

  useEffect(() => {
    loadDiaries()
    loadFriendDiaries()
  }, [])

  const loadDiaries = async () => {
    setLoading(true)
    try {
      // 獲取所有日記（不限狀態）
      const data = await diaryAPI.getAll({ limit: 100 })
      setDiaries(data?.items || data?.diaries || data || [])
    } catch (e) {
      setError(e.response?.data?.message || '無法取得日記列表')
    } finally {
      setLoading(false)
    }
  }

  const loadFriendDiaries = async () => {
    try {
      // 獲取好友的公開日記
      const data = await diaryAPI.explore({ limit: 100 })
      // 過濾掉自己的日記，只保留好友的
      setFollowDiaries((data?.diaries || []).filter(d => d.user_id !== user?.user_id))
    } catch (e) {
      // 臨時容錯：若後端發生 500，避免在 console 印出大型 Axios 物件並維持 UI 空狀態
      console.warn('無法取得好友日記:', e.message || e)
      setFollowDiaries([])
    }
  }

  const handleDelete = async (diaryId) => {
    if (!window.confirm('確定要刪除這篇日記嗎？')) return
    
    try {
      await diaryAPI.delete(diaryId)
      setDiaries(diaries.filter(d => (d.diary_id || d.id) !== diaryId))
    } catch (e) {
      alert('刪除失敗：' + (e.response?.data?.message || e.message))
    }
  }

  const filteredDiaries = filter === 'follows' 
    ? followDiaries 
    : diaries.filter(d => {
        if (filter === 'all') return true
        if (filter === 'public') return d.visibility === 'public'
        if (filter === 'private') return d.visibility === 'private'
        if (filter === 'draft') return d.status === 'draft'
        return true
      })

  if (loading) {
    return (
      <div className="page diaries-list-page fade-in" style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
        <div className="skeleton" style={{ width: '100%', height: 400, borderRadius: 'var(--radius-lg)' }}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page diaries-list-page" style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--error-color)' }}>
            <p className="text-body">{error}</p>
            <Button variant="primary" onClick={loadDiaries} style={{ marginTop: 'var(--spacing-md)' }}>
              重新載入
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="page diaries-list-page fade-in" style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 'var(--spacing-xl)',
        flexWrap: 'wrap',
        gap: 'var(--spacing-md)'
      }}>
        <div>
          <h2 className="text-h2" style={{ color: 'var(--primary-purple)' }}> 我的日記</h2>
          <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--spacing-xs)' }}>
            共 {diaries.length} 篇日記
          </p>
        </div>
        <Link to="/diaries/new" style={{ textDecoration: 'none' }}>
          <Button variant="primary" size="large">
            <PenTool size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
            寫新日記
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--spacing-sm)', 
        marginBottom: 'var(--spacing-xl)',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'all', label: '全部', count: diaries.length },
          { key: 'public', label: '公開', count: diaries.filter(d => d.visibility === 'public').length },
          { key: 'private', label: '私人', count: diaries.filter(d => d.visibility === 'private').length },
          { key: 'draft', label: '草稿', count: diaries.filter(d => d.status === 'draft').length },
          { key: 'follows', label: '好友', count: followDiaries.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: filter === tab.key ? 'var(--primary-purple)' : '#FFFFFF',
              color: filter === tab.key ? '#FFFFFF' : 'var(--gray-700)',
              border: `2px solid ${filter === tab.key ? 'var(--primary-purple)' : 'var(--gray-300)'}`,
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'all var(--transition-base)'
            }}
            onMouseEnter={(e) => {
              if (filter !== tab.key) {
                e.currentTarget.style.borderColor = 'var(--primary-purple)'
                e.currentTarget.style.background = 'var(--gray-50)'
              }
            }}
            onMouseLeave={(e) => {
              if (filter !== tab.key) {
                e.currentTarget.style.borderColor = 'var(--gray-300)'
                e.currentTarget.style.background = '#FFFFFF'
              }
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Diaries List */}
      {filteredDiaries.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>📝</div>
            <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-sm)' }}>
              {filter === 'all' && '還沒有日記'}
              {filter === 'public' && '沒有公開日記'}
              {filter === 'private' && '沒有私人日記'}
              {filter === 'draft' && '沒有草稿'}
              {filter === 'follows' && '好友還沒有分享日記'}
            </h3>
            <p className="text-body" style={{ color: 'var(--gray-600)', marginBottom: 'var(--spacing-lg)' }}>
              {filter === 'follows' ? '邀請好友開始寫日記吧！' : '開始記錄你的生活點滴吧！'}
            </p>
            {filter !== 'friends' && (
              <Link to="/diaries/new" style={{ textDecoration: 'none' }}>
                <Button variant="primary">寫第一篇日記</Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {filteredDiaries.map((diary, index) => (
            <Card 
              key={diary.diary_id || diary.id} 
              hoverable
              className="slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Header with status badges */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 'var(--spacing-md)',
                paddingBottom: 'var(--spacing-md)',
                borderBottom: '1px solid var(--gray-200)'
              }}>
                <div style={{ flex: 1 }}>
                  <Link 
                    to={`/diaries/${diary.diary_id || diary.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <h3 className="text-h3" style={{ 
                      color: 'var(--gray-900)',
                      marginBottom: 'var(--spacing-xs)'
                    }}>
                      {diary.title || '(未命名)'}
                    </h3>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    <span className="text-small" style={{ color: 'var(--gray-600)' }}>
                      {new Date(diary.created_at || diary.createdAt).toLocaleDateString('zh-TW', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    
                    {/* Status badges */}
                    {diary.status === 'draft' && (
                      <span style={{
                        padding: '2px 10px',
                        background: '#FFE4B5',
                        color: '#8B4513',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        草稿
                      </span>
                    )}
                    
                    <span style={{
                      padding: '2px 10px',
                      background: diary.visibility === 'public' ? '#E0F7FA' : 'var(--gray-200)',
                      color: diary.visibility === 'public' ? '#006064' : 'var(--gray-700)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {diary.visibility === 'public' ? <Eye size={12} /> : <EyeOff size={12} />}
                      {diary.visibility === 'public' ? '公開' : '私人'}
                    </span>
                  </div>
                </div>

                {/* Action buttons or Author info */}
                {filter === 'follows' ? (
                  // 顯示作者資訊
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary-purple), var(--primary-pink))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: '1rem',
                      fontWeight: 700
                    }}>
                      {(diary.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-small" style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                        {diary.username || '匿名用戶'}
                      </div>
                    </div>
                  </div>
                ) : (
                  // 顯示編輯/刪除按鈕
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                    <Link to={`/diaries/${diary.diary_id || diary.id}/edit`} style={{ textDecoration: 'none' }}>
                      <Button variant="ghost" size="small">
                        <Edit3 size={16} />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="small"
                      onClick={() => handleDelete(diary.diary_id || diary.id)}
                      style={{ color: 'var(--error-color)' }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Tags */}
              {diary.tags && diary.tags.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 'var(--spacing-xs)', 
                  marginBottom: 'var(--spacing-md)' 
                }}>
                  {diary.tags.filter(t => t.tag_type === 'emotion').map((t, i) => (
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

              {/* Content preview */}
              <Link 
                to={`/diaries/${diary.diary_id || diary.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <p className="text-body" style={{ 
                  color: 'var(--gray-700)',
                  lineHeight: 1.6,
                  marginBottom: 'var(--spacing-md)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {diary.content}
                </p>
              </Link>

              {/* Footer stats */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--spacing-lg)',
                paddingTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--gray-200)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  color: 'var(--gray-600)',
                  fontSize: '0.875rem'
                }}>
                  <Heart size={16} />
                  <span>{diary.like_count || 0} 個讚</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  color: 'var(--gray-600)',
                  fontSize: '0.875rem'
                }}>
                  <MessageCircle size={16} />
                  <span>{diary.comment_count || 0} 則留言</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default DiariesList
