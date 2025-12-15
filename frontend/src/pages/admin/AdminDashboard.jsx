import { useEffect, useState, useRef } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Users, FileText, MessageSquare, Heart, TrendingUp, AlertCircle, Shield, Activity } from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js'
import { Pie, Bar, Line } from 'react-chartjs-2'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import useAuthStore from '../../store/authStore'
import api from '../../services/api'

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
  // analytics state
  const [chartType, setChartType] = useState('members') // 'members' | 'diaries' | 'cards'
  const [period, setPeriod] = useState('month')
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const chartRef = useRef(null)
    const membersRef = useRef(null)
    const diariesRef = useRef(null)
    const cardsRef = useRef(null)

  // Load admin data only after we know the current user and they are admin
  useEffect(() => {
    if (user && user.role === 'admin') {
      setLoading(true)
      setErrorMessage(null)
      loadAdminData()
    }
    // register charts once
    ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement)
  }, [user])

  const loadAdminData = async () => {
    // Load stats, users, diaries independently and fail gracefully per-call
    try {
      const statsResponse = await api.get('/admin/stats')
      setStats(statsResponse.data.stats || {})
    } catch (err) {
      console.error('Failed to load admin stats:', err)
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        setErrorMessage('您無管理員權限或認證已失效，請重新登入。')
      }
    }

    try {
      // fetch latest 3 users for the "最近新增" tab
      const usersResponse = await api.get('/admin/users?limit=3')
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
      const diariesResponse = await api.get('/admin/diaries?limit=3')
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
          {/* <p className="text-body" style={{ color: 'var(--gray-600)' }}>
            系統總覽與內容管理
          </p> */}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-xl)' }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <div>
                  <h3 className="text-h3" style={{ marginBottom: '6px' }}>分析圖表</h3>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                  <select value={chartType} onChange={(e) => { setChartType(e.target.value); setAnalyticsData(null); }} style={{ padding: '6px 10px', borderRadius: 6 }}>
                    <option value="members">新增會員數分析</option>
                    <option value="diaries">日記新增分析</option>
                    <option value="cards">抽卡比例分析</option>
                  </select>
                  
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '6px', borderRadius: 6 }} />
                    <span className="text-small" style={{ color: 'var(--gray-500)' }}>~</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '6px', borderRadius: 6 }} />
                  </div>
                  <Button onClick={async () => {
                    setAnalyticsLoading(true);
                    try {
                      const token = sessionStorage.getItem('token');
                      const cfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                      let resp = null;
                      const qs = new URLSearchParams({ period });
                      if (startDate) qs.append('start', startDate);
                      if (endDate) qs.append('end', endDate);
                      if (chartType === 'members') resp = await axios.get(`${API_URL}/admin/analytics/members?${qs.toString()}`, cfg);
                      else if (chartType === 'diaries') resp = await axios.get(`${API_URL}/admin/analytics/diaries?${qs.toString()}`, cfg);
                      else resp = await axios.get(`${API_URL}/admin/analytics/cards?${qs.toString()}`, cfg);
                      // Normalize response data to ensure charts receive numbers and matching lengths
                      const raw = resp.data || {};
                      const normalized = { ...raw };
                      // diaries: ensure labels and data are arrays of same length, numbers
                      if (Array.isArray(raw.labels) && Array.isArray(raw.data)) {
                        normalized.labels = raw.labels.map(String);
                        normalized.data = raw.data.map((v) => Number(v) || 0);
                        // if labels longer than data, pad data with zeros
                        if (normalized.labels.length > normalized.data.length) {
                          const diff = normalized.labels.length - normalized.data.length;
                          normalized.data = normalized.data.concat(Array(diff).fill(0));
                        }
                      }
                      // cards: coerce drawnData / notDrawnData to numeric arrays and align with labels
                      const getArray = (obj, keys) => {
                        for (const k of keys) {
                          if (Array.isArray(obj[k])) return obj[k];
                        }
                        return null;
                      };
                      const drawnArr = getArray(raw, ['drawnData', 'drawn', 'drawn_values', 'drawn_data']);
                      const notDrawnArr = getArray(raw, ['notDrawnData', 'not_drawn', 'notDrawn', 'not_drawn_data']);
                      if (Array.isArray(raw.labels)) {
                        normalized.labels = raw.labels.map(String);
                        if (drawnArr) {
                          normalized.drawnData = normalized.labels.map((_, i) => Number(drawnArr[i]) || 0);
                        }
                        if (notDrawnArr) {
                          normalized.notDrawnData = normalized.labels.map((_, i) => Number(notDrawnArr[i]) || 0);
                        }
                        // if drawnData missing but server returned rows-like object, try to build from rows
                        if (!normalized.drawnData && Array.isArray(raw.rows) && raw.rows.length) {
                          const map = new Map();
                          raw.rows.forEach(r => {
                            // try to extract a YYYY-MM-DD key from multiple possible fields
                            const candidate = r.draw_date || r.label || r.date || r.d || r[Object.keys(r)[0]];
                            const str = String(candidate || '');
                            const m = str.match(/\d{4}-\d{2}-\d{2}/);
                            const key = m ? m[0] : str.slice(0,10);
                            const val = Number(r.drawn || r.count || r.c || r.value || r.v || 0) || 0;
                            map.set(key, val);
                          });
                          normalized.drawnData = normalized.labels.map(l => {
                            // try exact match first, then date-substring tolerant match
                            if (map.has(l)) return map.get(l) || 0;
                            const short = (String(l).match(/\d{4}-\d{2}-\d{2}/) || [String(l).slice(0,10)])[0];
                            return map.get(short) || 0;
                          });
                        }
                        // ensure arrays exist
                        normalized.drawnData = Array.isArray(normalized.drawnData) ? normalized.drawnData : normalized.labels.map(() => 0);
                        normalized.notDrawnData = Array.isArray(normalized.notDrawnData) ? normalized.notDrawnData : normalized.drawnData.map(v => Math.max(0, (raw.totalUsers || 0) - v));
                      }
                      // debug output for developer troubleshooting
                      try {
                        console.debug('admin analytics raw response:', raw);
                        console.debug('admin analytics normalized data:', normalized);
                      } catch (e) {}
                      setAnalyticsData(normalized);
                    } catch (err) {
                      console.error('Fetch analytics error:', err);
                      setErrorMessage('取得分析資料失敗，請檢查後端 API 或權限');
                    } finally {
                      setAnalyticsLoading(false);
                    }
                  }}>載入資料</Button>
                  {/* Download PDF button will appear when cards analytics loaded */}
                </div>
              </div>

              <div style={{ marginTop: 'var(--spacing-md)' }}>
                {analyticsLoading && <div className="text-body" style={{ color: 'var(--gray-600)' }}>載入中...</div>}
                {!analyticsLoading && analyticsData && chartType === 'members' && (() => {
                  const male = Number(analyticsData.new_male || 0);
                  const female = Number(analyticsData.new_female || 0);
                  const total = male + female;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                      <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div ref={membersRef} style={{ padding: 12, background: '#fff', borderRadius: 8, width: '100%' }}>
                            <div style={{ marginBottom: 8 }}>
                              <div className="text-h4">新增會員數分析</div>
                              {(analyticsData.start || analyticsData.end) && (
                                <div className="text-body" style={{ color: 'var(--gray-600)' }}>{analyticsData.start || startDate || 'auto'} ~ {analyticsData.end || endDate || 'auto'}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ maxWidth: '100%' }}>
                                  <Pie data={{
                                    labels: ['新增男會員','新增女會員'],
                                    datasets: [{ data: [male, female], backgroundColor: ['#4FACFE', '#FF4D4F'] }]
                                  }} />
                                </div>
                              </div>
                              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ padding: 12, background: '#fff', borderRadius: 8, width: '80%', margin: '0 auto', textAlign: 'left' }}>
                                  <div className="text-body" style={{ marginBottom: '8px' }}>總新增會員：{total}</div>
                                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    <li>新增男會員：{male} ({total ? Math.round((male/total)*100) : 0}%)</li>
                                    <li>新增女會員：{female} ({total ? Math.round((female/total)*100) : 0}%)</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={async () => {
                          if (!membersRef.current) return;
                          try {
                            const canvas = await html2canvas(membersRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                            const imgData = canvas.toDataURL('image/png');
                            const pdf = new jsPDF({ orientation: 'landscape' });
                            const imgProps = pdf.getImageProperties(imgData);
                            const pdfWidth = pdf.internal.pageSize.getWidth();
                            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                            pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
                            pdf.save(`members-analytics-${startDate || 'auto'}-${endDate || 'auto'}.pdf`);
                          } catch (e) {
                            console.error('Failed to generate PDF:', e);
                            setErrorMessage('產生 PDF 失敗');
                          }
                        }}>下載 PDF</Button>
                      </div>
                    </div>
                  );
                })()}

                {!analyticsLoading && analyticsData && chartType === 'diaries' && (
                  <div>
                    <div style={{ position: 'relative', padding: 12, background: '#fff', borderRadius: 8 }}>
                      <div ref={diariesRef}>
                        <div style={{ marginBottom: 8 }}>
                          <div className="text-h4">日記新增分析</div>
                          {(analyticsData.start || analyticsData.end) && (
                            <div className="text-body" style={{ color: 'var(--gray-600)' }}>{analyticsData.start || startDate || 'auto'} ~ {analyticsData.end || endDate || 'auto'}</div>
                          )}
                        </div>
                        <Line
                          data={{ labels: analyticsData.labels || [], datasets: [{ label: '日記數', data: analyticsData.data || [], borderColor: '#667EEA', backgroundColor: '#667EEA', fill: false, tension: 0.2, pointRadius: 3 }] }}
                          options={{
                            responsive: true,
                            plugins: { legend: { display: false } },
                            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, precision: 0, suggestedMax: (function(){ try { const arr = (analyticsData && analyticsData.data) ? analyticsData.data.map(v => Number(v) || 0) : []; const max = arr.length ? Math.max(...arr) : 0; return max + 5; } catch(e){ return undefined; } })() } }
                          }}
                        />
                      </div>
                      <div style={{ marginTop: 12, color: 'var(--gray-600)' }}>
                        {/* any additional summary can stay here if needed */}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <Button onClick={async () => {
                        if (!diariesRef.current) return;
                        try {
                          const canvas = await html2canvas(diariesRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                          const imgData = canvas.toDataURL('image/png');
                          const pdf = new jsPDF({ orientation: 'landscape' });
                          const imgProps = pdf.getImageProperties(imgData);
                          const pdfWidth = pdf.internal.pageSize.getWidth();
                          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                          pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
                          pdf.save(`diaries-analytics-${startDate || 'auto'}-${endDate || 'auto'}.pdf`);
                        } catch (e) {
                          console.error('Failed to generate PDF:', e);
                          setErrorMessage('產生 PDF 失敗');
                        }
                      }}>下載 PDF</Button>
                    </div>
                  </div>
                )}

                {!analyticsLoading && analyticsData && chartType === 'cards' && (
                  <div>
                    {/* chart and summary - keep the ref only on the area to capture */}
                    <div style={{ position: 'relative', padding: 12, background: '#fff', borderRadius: 8 }}>
                      <div ref={cardsRef}>
                        <div style={{ marginBottom: 8 }}>
                          <div className="text-h4">抽卡比例分析</div>
                          {(analyticsData.start || analyticsData.end) && (
                            <div className="text-body" style={{ color: 'var(--gray-600)' }}>{analyticsData.start || startDate || 'auto'} ~ {analyticsData.end || endDate || 'auto'}</div>
                          )}
                        </div>
                        <Bar
                          data={{
                            labels: analyticsData.labels || [],
                            datasets: [
                              { label: '有抽', data: analyticsData.drawnData || analyticsData.drawn || analyticsData.drawn_values || [], backgroundColor: '#4FACFE' },
                              { label: '沒抽', data: analyticsData.notDrawnData || analyticsData.not_drawn || analyticsData.notDrawn || [], backgroundColor: '#F093FB' }
                            ]
                          }}
                          options={{
                            responsive: true,
                            plugins: { legend: { position: 'top' } },
                            scales: {
                              x: { stacked: false },
                              y: { beginAtZero: true, ticks: { stepSize: 1 } }
                            }
                          }}
                        />
                        <div style={{ marginTop: 8, color: 'var(--gray-600)' }}>
                          <div>總使用者：{analyticsData.totalUsers}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <Button onClick={async () => {
                        if (!cardsRef.current) return;
                        try {
                          const canvas = await html2canvas(cardsRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                          const imgData = canvas.toDataURL('image/png');
                          const pdf = new jsPDF({ orientation: 'landscape' });
                          const imgProps = pdf.getImageProperties(imgData);
                          const pdfWidth = pdf.internal.pageSize.getWidth();
                          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                          pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
                          pdf.save(`cards-analytics-${startDate || 'auto'}-${endDate || 'auto'}.pdf`);
                        } catch (e) {
                          console.error('Failed to generate PDF:', e);
                          setErrorMessage('產生 PDF 失敗');
                        }
                      }}>下載 PDF</Button>
                    </div>
                  </div>
                )}

                {!analyticsLoading && !analyticsData && (
                  <div style={{ color: 'var(--gray-500)' }}>尚未載入資料，請選擇區間後點選「載入資料」。</div>
                )}
              </div>
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