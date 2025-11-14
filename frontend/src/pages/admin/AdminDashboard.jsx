import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Users, FileText, MessageSquare, Heart, TrendingUp, AlertCircle, Shield, Activity } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import useAuthStore from '../../store/authStore'
import axios from 'axios'

const API_URL = 'http://localhost:3000/api/v1'

function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuthStore()
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
  // 預設切到最近新增，讓管理員一進來就看到最新三筆資料
  const [activeTab, setActiveTab] = useState('recent') // 'stats' | 'recent' | 'analytics'
  const [errorMessage, setErrorMessage] = useState(null)

  // Load admin data only after we know the current user and they are admin
  useEffect(() => {
    if (user && user.role === 'admin') {
      setLoading(true)
      setErrorMessage(null)
      loadAdminData()
    }
  }, [user])

  const loadAdminData = async () => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      console.warn('No auth token found in sessionStorage')
      setErrorMessage('尚未登入或逾時，請先登入管理員帳號。')
      setRecentUsers([])
      setRecentDiaries([])
      setLoading(false)
      return
    }
    const config = { headers: { Authorization: `Bearer ${token}` } }

    // Load stats, users, diaries independently and fail gracefully per-call
    try {
      const statsResponse = await axios.get(`${API_URL}/admin/stats`, config)
      setStats(statsResponse.data.stats || {})
    } catch (err) {
      console.error('Failed to load admin stats:', err)
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        setErrorMessage('您無管理員權限或認證已失效，請重新登入。')
      }
    }

    try {
      // fetch latest 3 users for the "最近新增" tab
      const usersResponse = await axios.get(`${API_URL}/admin/users?limit=3`, config)
      setRecentUsers(usersResponse.data.users || [])
    } catch (err) {
      console.error('Failed to load recent users:', err)
      setRecentUsers([])
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        setErrorMessage('您無管理員權限或認證已失效，請重新登入。')
      }
    }

    try {
      // fetch latest 3 diaries for the "最近新增" tab
      const diariesResponse = await axios.get(`${API_URL}/admin/diaries?limit=3`, config)
      setRecentDiaries(diariesResponse.data.diaries || [])
    } catch (err) {
      console.error('Failed to load recent diaries:', err)
      setRecentDiaries([])
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        setErrorMessage('您無管理員權限或認證已失效，請重新登入。')
      }
    }

    setLoading(false)
  }

  // 檢查是否為管理員
  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  // If auth store is still loading user info, show loading
  if (authLoading) {
    return (
      <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', paddingTop: '100px' }}>
        <div className="text-h3" style={{ color: 'var(--gray-500)' }}>載入使用者資訊...</div>
      </div>
    )
  }

  // If no user after loading, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />
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
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
          <button
            onClick={() => setActiveTab('stats')}
            style={{
              padding: '8px 14px',
              background: activeTab === 'stats' ? 'var(--primary-purple)' : 'transparent',
              color: activeTab === 'stats' ? '#fff' : 'var(--gray-700)',
              border: '1px solid var(--gray-200)',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            統計資訊
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            style={{
              padding: '8px 14px',
              background: activeTab === 'recent' ? 'var(--primary-purple)' : 'transparent',
              color: activeTab === 'recent' ? '#fff' : 'var(--gray-700)',
              border: '1px solid var(--gray-200)',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            最近新增
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '8px 14px',
              background: activeTab === 'analytics' ? 'var(--primary-purple)' : 'transparent',
              color: activeTab === 'analytics' ? '#fff' : 'var(--gray-700)',
              border: '1px solid var(--gray-200)',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            分析圖表
          </button>
        </div>

        {/* Tab panels */}
        {activeTab === 'stats' && (
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--spacing-lg)'
          }}>
            {/* show up to three important stats */}
            <Card hoverable className="slide-up" style={{ animationDelay: '0s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #667EEA, #764BA2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                  <Users size={28} />
                </div>
                <div>
                  <div className="text-tiny" style={{ color: 'var(--gray-600)', marginBottom: 4 }}>總用戶數</div>
                  <div className="text-h2" style={{ fontWeight: 700 }}>{stats.totalUsers}</div>
                </div>
              </div>
            </Card>

            <Card hoverable className="slide-up" style={{ animationDelay: '0.05s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #F093FB, #F5576C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                  <FileText size={28} />
                </div>
                <div>
                  <div className="text-tiny" style={{ color: 'var(--gray-600)', marginBottom: 4 }}>總日記數</div>
                  <div className="text-h2" style={{ fontWeight: 700 }}>{stats.totalDiaries}</div>
                </div>
              </div>
            </Card>

            <Card hoverable className="slide-up" style={{ animationDelay: '0.1s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #4FACFE, #00F2FE)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                  <MessageSquare size={28} />
                </div>
                <div>
                  <div className="text-tiny" style={{ color: 'var(--gray-600)', marginBottom: 4 }}>總留言數</div>
                  <div className="text-h2" style={{ fontWeight: 700 }}>{stats.totalComments}</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'recent' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 'var(--spacing-xl)' }}>
            {/* Recent Users */}
            <Card className="slide-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <Users size={24} style={{ color: 'var(--primary-purple)' }} />
                最新用戶
              </h3>
              {recentUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--gray-500)' }}>暫無數據</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {recentUsers.map((u, index) => (
                    <Link
                      key={u.user_id}
                      to={`/users/${u.user_id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-sm)', background: index % 2 === 0 ? 'var(--gray-50)' : 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-purple), var(--primary-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 14, fontWeight: 600 }}>{(u.username || 'U').charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="text-body" style={{ fontWeight: 500 }}>{u.username}</div>
                            <div className="text-tiny" style={{ color: 'var(--gray-500)' }}>@{u.username}</div>
                          </div>
                        </div>
                        <div className="text-small" style={{ color: 'var(--gray-500)' }}>{new Date(u.created_at).toLocaleDateString('zh-TW')}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Diaries */}
            <Card className="slide-up" style={{ animationDelay: '0.25s' }}>
              <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <FileText size={24} style={{ color: 'var(--primary-purple)' }} />
                最新日記
              </h3>
              {recentDiaries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--gray-500)' }}>暫無數據</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {recentDiaries.map((d, index) => (
                    <div key={d.diary_id} style={{ padding: 'var(--spacing-sm)', background: index % 2 === 0 ? 'var(--gray-50)' : 'transparent', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xs)' }}>
                        <div className="text-body" style={{ fontWeight: 500, flex: 1, lineHeight: 1.4 }}>{d.title || '無標題'}</div>
                        <span className="text-tiny" style={{ background: d.visibility === 'public' ? 'var(--success-green)' : 'var(--gray-400)', color: '#FFFFFF', padding: '2px 8px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap', marginLeft: 'var(--spacing-sm)' }}>{d.visibility === 'public' ? '公開' : '私人'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* show username as plain text only (non-clickable) */}
                        <div className="text-small" style={{ color: 'var(--gray-500)' }}>@{d.username}</div>
                        <div className="text-tiny" style={{ color: 'var(--gray-400)' }}>{new Date(d.created_at).toLocaleDateString('zh-TW')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)' }}>
            <Card>
              <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-lg)' }}>會員數分析 (目前資料來源：系統統計)</h3>
              <div className="text-small" style={{ color: 'var(--gray-600)', marginBottom: 'var(--spacing-md)' }}>四個族群：原有男會員 / 原有女會員 / 新增男會員 / 新增女會員</div>
              <div style={{ color: 'var(--gray-500)' }}>
                後端尚未提供性別/新增分群的即時計數。如需真實圖表，請提供包含 gender 與 created_at 的聚合 API（例如 /admin/stats/members?group=gender,period=month）。目前只展示總覽數字。
              </div>
              <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                <div style={{ width: 160, height: 160, borderRadius: 9999, background: 'conic-gradient(#667EEA 0% 40%, #F093FB 40% 60%, #4FACFE 60% 80%, #F5576C 80% 100%)' }} />
                <div>
                  <div className="text-body">示意：原有男 40% / 原有女 20% / 新增男 20% / 新增女 20%</div>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-lg)' }}>日記 & 卡牌統計</h3>
              <div className="text-small" style={{ color: 'var(--gray-600)', marginBottom: 'var(--spacing-md)' }}>日記總數 (長條圖示意)、卡牌總數 (有抽/沒抽 圓餅示意)。</div>
              <div style={{ height: 140, background: 'linear-gradient(90deg, rgba(102,126,234,0.12) 0%, rgba(240,147,251,0.08) 100%)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>示意長條圖/圓餅圖</div>
            </Card>
          </div>
        )}
      </div>

      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: 'var(--spacing-xl)'
      }}>
      </div>
    </div>
  )
}

export default AdminDashboard