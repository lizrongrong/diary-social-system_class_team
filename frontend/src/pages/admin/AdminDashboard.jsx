import { useEffect, useState } from 'react'
import { Users, FileText, MessageSquare, Heart, TrendingUp, AlertCircle, Shield, Activity } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import useAuthStore from '../../store/authStore'
import { Navigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = 'http://localhost:3000/api/v1'

function AdminDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDiaries: 0,
    totalComments: 0,
    totalLikes: 0,
    newUsersToday: 0,
    newDiariesToday: 0,
    activeUsers: 0,
    reportedContent: 0
  })
  const [recentUsers, setRecentUsers] = useState([])
  const [recentDiaries, setRecentDiaries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }

      // 載入統計數據
      const statsResponse = await axios.get(`${API_URL}/admin/stats`, config)
      setStats(statsResponse.data.stats || {})

      // 載入最近用戶
      const usersResponse = await axios.get(`${API_URL}/admin/users?limit=5`, config)
      setRecentUsers(usersResponse.data.users || [])

      // 載入最近日記
      const diariesResponse = await axios.get(`${API_URL}/admin/diaries?limit=5`, config)
      setRecentDiaries(diariesResponse.data.diaries || [])

      setLoading(false)
    } catch (error) {
      console.error('Load admin data error:', error)
      setLoading(false)
    }
  }

  // 檢查是否為管理員
  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return (
      <div style={{ 
        padding: 'var(--spacing-2xl)', 
        textAlign: 'center',
        paddingTop: '100px'
      }}>
        <div className="text-h3" style={{ color: 'var(--gray-500)' }}>載入中...</div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: 'var(--spacing-xl)',
      paddingTop: '80px',
      maxWidth: 1400,
      margin: '0 auto',
      background: 'var(--gray-50)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--spacing-2xl)'
      }}>
        <div>
          <h1 className="text-h1" style={{ 
            marginBottom: 'var(--spacing-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)'
          }}>
            <Shield size={36} style={{ color: 'var(--primary-purple)' }} />
            後臺管理
          </h1>
          <p className="text-body" style={{ color: 'var(--gray-600)' }}>
            系統總覽與內容管理
          </p>
        </div>
        <Button variant="primary">
          <Activity size={18} />
          系統狀態
        </Button>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 'var(--spacing-lg)',
        marginBottom: 'var(--spacing-2xl)'
      }}>
        {/* Total Users */}
        <Card hoverable className="slide-up" style={{ animationDelay: '0s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ 
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #667EEA, #764BA2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <Users size={28} />
            </div>
            <div>
              <div className="text-tiny" style={{ color: 'var(--gray-600)', marginBottom: 4 }}>
                總用戶數
              </div>
              <div className="text-h2" style={{ fontWeight: 700 }}>
                {stats.totalUsers}
              </div>
            </div>
          </div>
          <div style={{ 
            marginTop: 'var(--spacing-md)',
            paddingTop: 'var(--spacing-sm)',
            borderTop: '1px solid var(--gray-200)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)'
          }}>
            <TrendingUp size={14} style={{ color: 'var(--success-green)' }} />
            <span className="text-small" style={{ color: 'var(--success-green)' }}>
              +{stats.newUsersToday} 今日新增
            </span>
          </div>
        </Card>

        {/* Total Diaries */}
        <Card hoverable className="slide-up" style={{ animationDelay: '0.05s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ 
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #F093FB, #F5576C)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <FileText size={28} />
            </div>
            <div>
              <div className="text-tiny" style={{ color: 'var(--gray-600)', marginBottom: 4 }}>
                總日記數
              </div>
              <div className="text-h2" style={{ fontWeight: 700 }}>
                {stats.totalDiaries}
              </div>
            </div>
          </div>
          <div style={{ 
            marginTop: 'var(--spacing-md)',
            paddingTop: 'var(--spacing-sm)',
            borderTop: '1px solid var(--gray-200)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)'
          }}>
            <TrendingUp size={14} style={{ color: 'var(--success-green)' }} />
            <span className="text-small" style={{ color: 'var(--success-green)' }}>
              +{stats.newDiariesToday} 今日新增
            </span>
          </div>
        </Card>

        {/* Total Comments */}
        <Card hoverable className="slide-up" style={{ animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ 
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #4FACFE, #00F2FE)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <MessageSquare size={28} />
            </div>
            <div>
              <div className="text-tiny" style={{ color: 'var(--gray-600)', marginBottom: 4 }}>
                總留言數
              </div>
              <div className="text-h2" style={{ fontWeight: 700 }}>
                {stats.totalComments}
              </div>
            </div>
          </div>
          <div style={{ 
            marginTop: 'var(--spacing-md)',
            paddingTop: 'var(--spacing-sm)',
            borderTop: '1px solid var(--gray-200)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)'
          }}>
            <Activity size={14} style={{ color: 'var(--primary-purple)' }} />
            <span className="text-small" style={{ color: 'var(--gray-600)' }}>
              {stats.activeUsers} 活躍用戶
            </span>
          </div>
        </Card>

        {/* Total Likes */}
        <Card hoverable className="slide-up" style={{ animationDelay: '0.15s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ 
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #FA709A, #FEE140)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <Heart size={28} />
            </div>
            <div>
              <div className="text-tiny" style={{ color: 'var(--gray-600)', marginBottom: 4 }}>
                總按讚數
              </div>
              <div className="text-h2" style={{ fontWeight: 700 }}>
                {stats.totalLikes}
              </div>
            </div>
          </div>
          {stats.reportedContent > 0 && (
            <div style={{ 
              marginTop: 'var(--spacing-md)',
              paddingTop: 'var(--spacing-sm)',
              borderTop: '1px solid var(--gray-200)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)'
            }}>
              <AlertCircle size={14} style={{ color: 'var(--warning-yellow)' }} />
              <span className="text-small" style={{ color: 'var(--warning-yellow)' }}>
                {stats.reportedContent} 待審核內容
              </span>
            </div>
          )}
        </Card>
      </div>

      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: 'var(--spacing-xl)'
      }}>
        {/* Recent Users */}
        <Card className="slide-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-h3" style={{ 
            marginBottom: 'var(--spacing-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)'
          }}>
            <Users size={24} style={{ color: 'var(--primary-purple)' }} />
            最新用戶
          </h3>
          
          {recentUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--gray-500)' }}>
              暫無數據
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {recentUsers.map((u, index) => (
                <div 
                  key={u.user_id}
                  style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--spacing-sm)',
                    background: index % 2 === 0 ? 'var(--gray-50)' : 'transparent',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <div style={{ 
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary-purple), var(--primary-pink))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 600
                    }}>
                      {(u.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-body" style={{ fontWeight: 500 }}>
                        {u.display_name || u.username}
                      </div>
                      <div className="text-tiny" style={{ color: 'var(--gray-500)' }}>
                        @{u.username}
                      </div>
                    </div>
                  </div>
                  <div className="text-small" style={{ color: 'var(--gray-500)' }}>
                    {new Date(u.created_at).toLocaleDateString('zh-TW')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Diaries */}
        <Card className="slide-up" style={{ animationDelay: '0.25s' }}>
          <h3 className="text-h3" style={{ 
            marginBottom: 'var(--spacing-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)'
          }}>
            <FileText size={24} style={{ color: 'var(--primary-purple)' }} />
            最新日記
          </h3>
          
          {recentDiaries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--gray-500)' }}>
              暫無數據
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {recentDiaries.map((d, index) => (
                <div 
                  key={d.diary_id}
                  style={{ 
                    padding: 'var(--spacing-sm)',
                    background: index % 2 === 0 ? 'var(--gray-50)' : 'transparent',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    <div className="text-body" style={{ 
                      fontWeight: 500,
                      flex: 1,
                      lineHeight: 1.4
                    }}>
                      {d.title || '無標題'}
                    </div>
                    <span 
                      className="text-tiny"
                      style={{ 
                        background: d.visibility === 'public' ? 'var(--success-green)' : 'var(--gray-400)',
                        color: '#FFFFFF',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        whiteSpace: 'nowrap',
                        marginLeft: 'var(--spacing-sm)'
                      }}
                    >
                      {d.visibility === 'public' ? '公開' : '私人'}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div className="text-small" style={{ color: 'var(--gray-500)' }}>
                      @{d.username}
                    </div>
                    <div className="text-tiny" style={{ color: 'var(--gray-400)' }}>
                      {new Date(d.created_at).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="slide-up" style={{ 
        marginTop: 'var(--spacing-2xl)',
        animationDelay: '0.3s'
      }}>
        <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-lg)' }}>
          快速操作
        </h3>
        <div style={{ 
          display: 'flex',
          gap: 'var(--spacing-md)',
          flexWrap: 'wrap'
        }}>
          <Button variant="outline">
            <Users size={18} />
            用戶管理
          </Button>
          <Button variant="outline">
            <FileText size={18} />
            內容審核
          </Button>
          <Button variant="outline">
            <AlertCircle size={18} />
            舉報處理
          </Button>
          <Button variant="outline">
            <Activity size={18} />
            系統日誌
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default AdminDashboard