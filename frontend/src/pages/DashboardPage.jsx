import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { diaryAPI, friendAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Calendar, Heart, MessageCircle, TrendingUp, PenTool, Eye, Users } from 'lucide-react'
import './DashboardPage.css'

function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    totalDiaries: 0,
    totalLikes: 0,
    totalComments: 0,
    thisMonthCount: 0,
    publicCount: 0,
    privateCount: 0,
    friendsCount: 0
  })
  const [recentDiaries, setRecentDiaries] = useState([])
  const [emotionStats, setEmotionStats] = useState([])
  const [loading, setLoading] = useState(true)

  // 如果是管理員，重定向到管理員後台
  if (user && user.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        // 獲取所有日記（不限狀態）
        const data = await diaryAPI.getAll({ limit: 100 })
        const diaries = data?.diaries || []
        
        // 獲取好友列表
        let friendsCount = 0
        try {
          const friendsData = await friendAPI.getAll()
          friendsCount = friendsData?.friends?.length || 0
        } catch (err) {
          console.error('Error loading friends:', err)
        }
        
        // 計算統計數據
        const now = new Date()
        const thisMonth = diaries.filter(d => {
          const created = new Date(d.created_at || d.createdAt)
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
        })

        const totalLikes = diaries.reduce((sum, d) => sum + (d.like_count || 0), 0)
        const totalComments = diaries.reduce((sum, d) => sum + (d.comment_count || 0), 0)
        const publicCount = diaries.filter(d => d.visibility === 'public').length
        const privateCount = diaries.filter(d => d.visibility === 'private').length

        // 情緒統計
        const emotionMap = {}
        diaries.forEach(d => {
          if (d.tags) {
            d.tags.filter(t => t.tag_type === 'emotion').forEach(t => {
              emotionMap[t.tag_value] = (emotionMap[t.tag_value] || 0) + 1
            })
          }
        })
        const emotionData = Object.entries(emotionMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        setStats({
          totalDiaries: diaries.length,
          totalLikes,
          totalComments,
          thisMonthCount: thisMonth.length,
          publicCount,
          privateCount,
          friendsCount
        })

        setRecentDiaries(diaries.slice(0, 5))
        setEmotionStats(emotionData)
      } catch (e) {
        console.error('載入失敗', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: '100%', height: 400, borderRadius: 'var(--radius-lg)' }}></div>
      </div>
    )
  }

  const maxEmotionCount = Math.max(...emotionStats.map(e => e.count), 1)

  return (
    <div className="page dashboard-page fade-in" style={{ padding: 'var(--spacing-xl)', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h2 className="text-h2"> 我的儀表板</h2>
        <Link to="/diaries/new" style={{ textDecoration: 'none' }}>
          <Button variant="primary" size="large">
            <PenTool size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
            寫新日記
          </Button>
        </Link>
      </div>

      {/* 統計卡片 */}
      <div className="slide-up" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 'var(--spacing-lg)',
        marginBottom: 'var(--spacing-2xl)'
      }}>
        <Card hoverable style={{ 
          background: 'linear-gradient(135deg, var(--primary-purple) 0%, var(--dark-purple) 100%)',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ 
              width: 60, 
              height: 60, 
              borderRadius: '50%', 
              background: 'rgba(255,255,255,0.2)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <PenTool size={28} />
            </div>
            <div>
              <div className="text-tiny" style={{ opacity: 0.9 }}>總日記數</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 }}>{stats.totalDiaries}</div>
            </div>
          </div>
        </Card>

        <Card hoverable style={{ 
          background: 'linear-gradient(135deg, #FF6B9D 0%, #C44569 100%)',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ 
              width: 60, 
              height: 60, 
              borderRadius: '50%', 
              background: 'rgba(255,255,255,0.2)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <Heart size={28} />
            </div>
            <div>
              <div className="text-tiny" style={{ opacity: 0.9 }}>總獲讚數</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 }}>{stats.totalLikes}</div>
            </div>
          </div>
        </Card>

        <Card hoverable style={{ 
          background: 'linear-gradient(135deg, #5F72BD 0%, #9921E8 100%)',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ 
              width: 60, 
              height: 60, 
              borderRadius: '50%', 
              background: 'rgba(255,255,255,0.2)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <MessageCircle size={28} />
            </div>
            <div>
              <div className="text-tiny" style={{ opacity: 0.9 }}>總留言數</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 }}>{stats.totalComments}</div>
            </div>
          </div>
        </Card>

        <Card hoverable style={{ 
          background: 'linear-gradient(135deg, #20E3B2 0%, #29FFC6 100%)',
          color: '#1a1a1a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ 
              width: 60, 
              height: 60, 
              borderRadius: '50%', 
              background: 'rgba(0,0,0,0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <Calendar size={28} />
            </div>
            <div>
              <div className="text-tiny" style={{ opacity: 0.8 }}>本月新增</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 }}>{stats.thisMonthCount}</div>
            </div>
          </div>
        </Card>

        <Card hoverable style={{ 
          background: 'linear-gradient(135deg, #FA8BFF 0%, #2BD2FF 100%)',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ 
              width: 60, 
              height: 60, 
              borderRadius: '50%', 
              background: 'rgba(255,255,255,0.2)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <Users size={28} />
            </div>
            <div>
              <div className="text-tiny" style={{ opacity: 0.9 }}>好友數量</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 }}>{stats.friendsCount}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* 主要內容區 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--spacing-xl)' }}>
        {/* 情緒分析 */}
        <Card className="slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--primary-purple)' }}>
            <TrendingUp size={24} style={{ marginRight: 'var(--spacing-xs)', verticalAlign: 'middle' }} />
            情緒分析 Top 5
          </h3>
          {emotionStats.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {emotionStats.map((emotion, idx) => (
                <div key={emotion.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                    <span className="text-small" style={{ fontWeight: 600 }}>{emotion.name}</span>
                    <span className="text-small" style={{ color: 'var(--gray-600)' }}>{emotion.count} 次</span>
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: 8, 
                    background: 'var(--gray-200)', 
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(emotion.count / maxEmotionCount) * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, var(--primary-purple), var(--primary-pink))`,
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.5s ease',
                      animationDelay: `${idx * 0.1}s`
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--gray-500)' }}>
              還沒有情緒記錄
            </div>
          )}
        </Card>

        {/* 可見性統計 */}
        <Card className="slide-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--primary-purple)' }}>
            <Eye size={24} style={{ marginRight: 'var(--spacing-xs)', verticalAlign: 'middle' }} />
            可見性分布
          </h3>
          <div style={{ display: 'flex', gap: 'var(--spacing-xl)', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: 120, 
                height: 120, 
                borderRadius: '50%', 
                background: 'var(--primary-purple)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                margin: '0 auto var(--spacing-md)'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.publicCount}</div>
                <div className="text-tiny">公開</div>
              </div>
              <div className="text-small" style={{ color: 'var(--gray-600)' }}>
                {stats.totalDiaries > 0 ? Math.round((stats.publicCount / stats.totalDiaries) * 100) : 0}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: 120, 
                height: 120, 
                borderRadius: '50%', 
                background: 'var(--gray-400)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                margin: '0 auto var(--spacing-md)'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.privateCount}</div>
                <div className="text-tiny">私人</div>
              </div>
              <div className="text-small" style={{ color: 'var(--gray-600)' }}>
                {stats.totalDiaries > 0 ? Math.round((stats.privateCount / stats.totalDiaries) * 100) : 0}%
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 最近日記 */}
      <Card className="slide-up" style={{ marginTop: 'var(--spacing-xl)', animationDelay: '0.3s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h3 className="text-h3" style={{ color: 'var(--primary-purple)' }}> 最近日記</h3>
          <Link to="/diaries" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="small">查看全部</Button>
          </Link>
        </div>
        {recentDiaries.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {recentDiaries.map(diary => (
              <Link 
                key={diary.diary_id} 
                to={`/diaries/${diary.diary_id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: 'var(--spacing-md)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all var(--transition-base)',
                  display: 'block'
                }}
                className="hover-lift"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-xs)' }}>
                  <h4 className="text-h4" style={{ margin: 0 }}>{diary.title || '(未命名)'}</h4>
                  <span className="text-tiny" style={{ 
                    padding: '2px 8px', 
                    background: diary.visibility === 'public' ? '#E0F7FA' : 'var(--gray-100)', 
                    borderRadius: 'var(--radius-sm)',
                    whiteSpace: 'nowrap'
                  }}>
                    {diary.visibility === 'public' ? '公開' : '私人'}
                  </span>
                </div>
                <p className="text-small" style={{ 
                  color: 'var(--gray-600)', 
                  marginBottom: 'var(--spacing-sm)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {diary.content}
                </p>
                
                {/* Tags */}
                {diary.tags && diary.tags.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 'var(--spacing-xs)', 
                    marginBottom: 'var(--spacing-sm)' 
                  }}>
                    {diary.tags.filter(t => t.tag_type === 'emotion').slice(0, 2).map((t, i) => (
                      <span 
                        key={i} 
                        style={{ 
                          padding: '2px 8px', 
                          background: 'var(--emotion-pink)', 
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
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
                          padding: '2px 8px', 
                          background: '#B2EBF2', 
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
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
                          padding: '2px 8px', 
                          background: 'var(--gray-200)', 
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          color: 'var(--gray-700)'
                        }}
                      >
                        #{t.tag_value}
                      </span>
                    ))}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: 'var(--spacing-lg)', fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                  <span>{new Date(diary.created_at || diary.createdAt).toLocaleDateString()}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <Heart size={14} />
                    {diary.like_count || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <MessageCircle size={14} />
                    {diary.comment_count || 0}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: 'var(--spacing-2xl)', 
            color: 'var(--gray-500)' 
          }}>
            <p className="text-body">還沒有日記，開始記錄你的生活吧！</p>
            <Link to="/diaries/new" style={{ textDecoration: 'none', marginTop: 'var(--spacing-md)', display: 'inline-block' }}>
              <Button variant="primary">立即開始</Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  )
}

export default DashboardPage
