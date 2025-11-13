import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { diaryAPI, followAPI, userAPI, ensureAbsoluteUrl } from '../services/api'
import useAuthStore from '../store/authStore'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Calendar, Heart, MessageCircle, TrendingUp, PenTool, Eye, Users } from 'lucide-react'
import './DashboardPage.css'
import { Bar, Pie } from 'react-chartjs-2'
import 'chart.js/auto'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// 新的「個人資訊及分析」頁面 scaffold
function DashboardPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [diaries, setDiaries] = useState([])
  const [userDiaries, setUserDiaries] = useState([])
  const [friendsCount, setFriendsCount] = useState(0)
  const [activeTab, setActiveTab] = useState('stats')
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [chartType, setChartType] = useState('diary_count')
  const [chartData, setChartData] = useState(null)
  const chartRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // 主要抓取：使用者自己的公開日記（個人頁面與儀表板的資料來源）
        if (user && user.user_id) {
          const res = await diaryAPI.getUserPublicDiaries(user.user_id, { limit: 500 })
          setUserDiaries(res?.diaries || [])
        } else {
          setUserDiaries([])
        }

        // 一般探索 / 快速摘要（可擴充）
        const all = await diaryAPI.getAll({ limit: 200 })
        setDiaries(all?.diaries || [])

        // 好友數（追蹤）
        try {
          const f = await followAPI.getAll()
          const list = f?.following || f?.friends || []
          setFriendsCount(list.length || 0)
        } catch (err) {
          console.warn('無法取得好友數', err)
        }
      } catch (e) {
        console.error('載入日記資料失敗:', e)
        setDiaries([])
        setUserDiaries([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  if (user && user.role === 'admin') return <Navigate to="/admin" replace />

  const years = useMemo(() => {
    const y = new Date().getFullYear()
    const arr = []
    for (let i = y; i >= y - 5; i--) arr.push(i)
    return arr
  }, [])

  const parseTags = (diary) => {
    const raw = diary?.tags
    let tags = []
    if (Array.isArray(raw)) tags = raw
    else if (typeof raw === 'string') {
      try { tags = JSON.parse(raw || '[]') } catch (e) { tags = [] }
    } else tags = []

    return tags.map(t => ({
      ...t,
      tag_type: t?.tag_type || t?.type,
      tag_value: t?.tag_value || t?.value || t?.name || t?.tag || ''
    }))
  }

  // 前端聚合：以使用者日記 (userDiaries) 為主，並保留全站 diaries 作為補充
  const visibilityCounts = useMemo(() => {
    const map = { public: 0, private: 0 }
    userDiaries.forEach(d => { map[d.visibility || 'private'] = (map[d.visibility || 'private'] || 0) + 1 })
    return map
  }, [userDiaries])

  const emotionTop5 = useMemo(() => {
    const map = {}
    userDiaries.forEach(d => {
      const tags = parseTags(d)
      tags.filter(t => t.tag_type === 'emotion').forEach(t => {
        const v = t.tag_value || ''
        if (!v) return
        map[v] = (map[v] || 0) + 1
      })
    })
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a,b)=>b.count-a.count).slice(0,5)
  }, [userDiaries])

  const weatherTop5 = useMemo(() => {
    const map = {}
    userDiaries.forEach(d => {
      const tags = parseTags(d)
      const w = tags.find(t => t.tag_type === 'weather')
      if (w && w.tag_value) map[w.tag_value] = (map[w.tag_value] || 0) + 1
    })
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a,b)=>b.count-a.count).slice(0,5)
  }, [userDiaries])

  const handleAnalyze = () => {
    // 依照選擇在前端聚合資料並設定 chartData
    const target = userDiaries.filter(d => {
      const created = new Date(d.created_at || d.createdAt)
      return created.getFullYear() === Number(year) && (month ? (created.getMonth()+1) === Number(month) : true)
    })

    if (chartType === 'diary_count') {
      // group by day
      const days = {}
      target.forEach(d => {
        const dt = new Date(d.created_at || d.createdAt)
        const day = dt.getDate()
        days[day] = (days[day] || 0) + 1
      })
      const labels = Object.keys(days).sort((a,b)=>a-b).map(x=>`${x}日`)
      const data = labels.map(l => days[Number(l.replace('日',''))] || 0)
      setChartData({ type: 'bar', data: { labels, datasets: [{ label: '日記數', data, backgroundColor: 'rgba(54,162,235,0.6)' }] } })
    } else if (chartType === 'weather_pie') {
      const map = {}
      target.forEach(d => { const w = (d.tags||[]).find(t=>t.tag_type==='weather'); if (w) map[w.tag_value] = (map[w.tag_value]||0)+1 })
      const labels = Object.keys(map)
      const data = labels.map(l=>map[l])
      setChartData({ type: 'pie', data: { labels, datasets: [{ data, backgroundColor: ['#FF6384','#36A2EB','#FFCE56','#8E44AD','#2ECC71'] }] } })
    } else if (chartType === 'mood_pie') {
      const map = {}
      target.forEach(d => (d.tags||[]).filter(t => t.tag_type === 'emotion').forEach(t => map[t.tag_value] = (map[t.tag_value]||0)+1))
      const labels = Object.keys(map)
      const data = labels.map(l=>map[l])
      setChartData({ type: 'pie', data: { labels, datasets: [{ data, backgroundColor: ['#FF9AA2','#FFB7B2','#FFDAC1','#E2F0CB','#B5EAD7'] }] } })
    }
  }

  const exportPdf = async () => {
    if (!chartRef.current) return
    const element = chartRef.current
    try {
      const canvas = await html2canvas(element, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape' })
      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`diary-analysis-${year}-${month}.pdf`)
    } catch (err) {
      console.error('PDF 匯出失敗', err)
      alert('PDF 匯出失敗，請稍後再試')
    }
  }

  const totalDiaries = userDiaries.length
  const totalLikes = userDiaries.reduce((s,d)=>s+(d.like_count||0),0)
  const totalComments = userDiaries.reduce((s,d)=>s+(d.comment_count||0),0)
  const thisMonthCount = userDiaries.filter(d => {
    const created = new Date(d.created_at || d.createdAt)
    const now = new Date()
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  }).length

  const renderTabs = () => (
    <div className="dashboard-tabs" style={{ marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
      {/* 個人首頁標籤已移除 */}
      <Button className={`dashboard-tab ${activeTab === 'stats' ? 'primary' : ''}`} variant={activeTab === 'stats' ? 'primary' : 'ghost'} onClick={()=>setActiveTab('stats')}>統計資訊</Button>
      <Button className={`dashboard-tab ${activeTab === 'diary' ? 'primary' : ''}`} variant={activeTab === 'diary' ? 'primary' : 'ghost'} onClick={()=>setActiveTab('diary')}>日記資訊</Button>
      <Button className={`dashboard-tab ${activeTab === 'monthly' ? 'primary' : ''}`} variant={activeTab === 'monthly' ? 'primary' : 'ghost'} onClick={()=>setActiveTab('monthly')}>每月回顧</Button>
    </div>
  )

  

  const StatsPanel = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        {/* <h3 className="text-h2">統計摘要</h3> */}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-2xl)' }}>
        <Card hoverable style={{ background: 'linear-gradient(135deg, var(--primary-purple) 0%, var(--dark-purple) 100%)', color: '#FFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width:54,height:54,borderRadius:12,background:'rgba(255,255,255,0.12)',display:'flex',alignItems:'center',justifyContent:'center' }}><PenTool size={20} /></div>
            <div>
              <div className="text-tiny">總日記數</div>
              <div style={{ fontSize: '1.6rem', fontWeight:700 }}>{totalDiaries}</div>
            </div>
          </div>
        </Card>

        <Card hoverable style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #C44569 100%)', color: '#FFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width:54,height:54,borderRadius:12,background:'rgba(255,255,255,0.12)',display:'flex',alignItems:'center',justifyContent:'center' }}><Heart size={20} /></div>
            <div>
              <div className="text-tiny">總獲讚數</div>
              <div style={{ fontSize: '1.6rem', fontWeight:700 }}>{totalLikes}</div>
            </div>
          </div>
        </Card>

        <Card hoverable style={{ background: 'linear-gradient(135deg, #5F72BD 0%, #9921E8 100%)', color: '#FFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width:54,height:54,borderRadius:12,background:'rgba(255,255,255,0.12)',display:'flex',alignItems:'center',justifyContent:'center' }}><MessageCircle size={20} /></div>
            <div>
              <div className="text-tiny">總留言數</div>
              <div style={{ fontSize: '1.6rem', fontWeight:700 }}>{totalComments}</div>
            </div>
          </div>
        </Card>

        <Card hoverable style={{ background: 'linear-gradient(135deg, #20E3B2 0%, #29FFC6 100%)', color: '#111' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width:54,height:54,borderRadius:12,background:'rgba(0,0,0,0.06)',display:'flex',alignItems:'center',justifyContent:'center' }}><Calendar size={20} /></div>
            <div>
              <div className="text-tiny">本月新增</div>
              <div style={{ fontSize: '1.6rem', fontWeight:700 }}>{thisMonthCount}</div>
            </div>
          </div>
        </Card>

        <Card hoverable style={{ background: 'linear-gradient(135deg, #FA8BFF 0%, #2BD2FF 100%)', color: '#FFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width:54,height:54,borderRadius:12,background:'rgba(255,255,255,0.12)',display:'flex',alignItems:'center',justifyContent:'center' }}><Users size={20} /></div>
            <div>
              <div className="text-tiny">好友數量</div>
              <div style={{ fontSize: '1.6rem', fontWeight:700 }}>{friendsCount}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )

  const DiaryPanel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <h3 style={{ marginBottom: 12, textAlign: 'left' }}><Eye size={18} style={{ marginRight:8, verticalAlign:'middle' }} />可見性分布</h3>
        <div style={{ display:'flex', gap:24, alignItems:'center', justifyContent: 'center', padding: '12px 0' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ width:96,height:96,borderRadius:999,background:'var(--primary-purple)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px' }}>
              <div style={{ fontSize:20,fontWeight:700 }}>{visibilityCounts.public}</div>
            </div>
            <div style={{ color:'#666' }}>公開</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ width:96,height:96,borderRadius:999,background:'#bbb',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px' }}>
              <div style={{ fontSize:20,fontWeight:700 }}>{visibilityCounts.private}</div>
            </div>
            <div style={{ color:'#666' }}>私人</div>
          </div>
        </div>
      </Card>

      <div className="top5-row">
        <Card style={{ marginBottom: 0 }}>
          <h3 style={{ marginBottom: 12 }}><TrendingUp size={18} style={{ marginRight:8, verticalAlign:'middle' }} />情緒分析 Top 5</h3>
          {emotionTop5.length > 0 ? (
            <div className="top5-list">
              {(() => {
                const maxEmotionCount = Math.max(...emotionTop5.map(x => x.count), 1)
                return emotionTop5.map((e, idx) => (
                  <div className="top5-item" key={e.name}>
                    <div className="top5-row">
                      <div className="top5-label">{e.name}</div>
                      <div className="top5-count">{e.count} 次</div>
                    </div>
                    <div className="top5-bar-outer">
                      <div className="top5-bar-inner" style={{ width: `${(e.count / maxEmotionCount) * 100}%` }} />
                    </div>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <div style={{ color:'#666' }}>還沒有情緒記錄</div>
          )}
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <h3 style={{ marginBottom: 12 }}><Calendar size={18} style={{ marginRight:8, verticalAlign:'middle' }} />天氣 Top 5</h3>
          {weatherTop5.length > 0 ? (
            <div className="top5-list">
              {(() => {
                const maxCount = Math.max(...weatherTop5.map(x => x.count), 1)
                return weatherTop5.map(w => (
                  <div className="top5-item" key={w.name}>
                    <div className="top5-row">
                      <div className="top5-label">{w.name}</div>
                      <div className="top5-count">{w.count} 次</div>
                    </div>
                    <div className="top5-bar-outer">
                      <div className="top5-bar-inner" style={{ width: `${(w.count / maxCount) * 100}%`, background: '#36A2EB' }} />
                    </div>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <div style={{ color:'#666' }}>還沒有天氣標記</div>
          )}
        </Card>
      </div>

      <div>
        <div className="section-header">
          <div className="icon"><Calendar size={16} /></div>
          <h3 style={{ margin: 0 }}>最近日記</h3>
        </div>
        <Card className="recent-diaries">
          {userDiaries.length === 0 && <div style={{ color:'#666' }}>還沒有日記</div>}
          <div className="user-profile-diary-list">
            {userDiaries.slice(0,8).map((diary, index) => {
            const diaryAvatar = ensureAbsoluteUrl(diary.avatar_url || diary.profile_image || diary.avatar || diary.user_avatar || '')
            const diaryDate = new Date(diary.created_at || diary.createdAt)
            const tags = Array.isArray(diary.tags) ? diary.tags : (typeof diary.tags === 'string' ? JSON.parse(diary.tags || '[]') : [])
            const getTagValue = (t) => t?.tag_value || t?.value || t?.name || t?.tag || ''
            const emotionTags = tags.filter((tag) => (tag.tag_type === 'emotion' || tag.type === 'emotion')).map(t => ({ ...t, _value: getTagValue(t) }))
            const weatherTag = tags.find((tag) => (tag.tag_type === 'weather' || tag.type === 'weather'))
            const keywordTags = tags.filter((tag) => (tag.tag_type === 'keyword' || tag.type === 'keyword')).map(t => ({ ...t, _value: getTagValue(t) }))
            const likeCount = diary.like_count ?? diary.likes ?? 0
            const commentCount = diary.comment_count ?? diary.comments ?? 0

            return (
              <article key={diary.diary_id} className={`user-profile-diary-card ${index === 0 ? 'is-featured' : ''}`}>
                <header className="diary-card-header">
                  <div className="diary-author">
                    <div className="diary-author-avatar">
                      {diaryAvatar ? (
                        <img src={diaryAvatar} alt="avatar" />
                      ) : (
                        <span>{(diary.username || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="diary-author-details">
                      <h3 className="diary-author-name">{diary.username || diary.display_name || ''}</h3>
                      <span className="diary-post-date">{diaryDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                </header>

                <div className="diary-card-body">
                  <Link to={`/diaries/${diary.diary_id}`} className="diary-card-title">{diary.title || '未命名日記'}</Link>

                  {(emotionTags.length > 0 || weatherTag || keywordTags.length > 0) && (
                    <div className="diary-card-tags">
                      {emotionTags.slice(0, 3).map((tag, i) => (
                        <span key={`e-${i}`} className="diary-tag diary-tag--emotion">{tag._value || tag.tag_value}</span>
                      ))}
                      {weatherTag && <span className="diary-tag diary-tag--weather">{getTagValue(weatherTag)}</span>}
                      {keywordTags.slice(0, 3).map((tag, i) => (
                        <span key={`k-${i}`} className="diary-tag diary-tag--keyword">#{tag._value || tag.tag_value}</span>
                      ))}
                    </div>
                  )}

                  {diary.content && <p className="diary-card-content">{diary.content}</p>}
                </div>

                <footer className="diary-card-footer">
                  <div className="diary-card-action"><Heart size={18} /> <span>{likeCount}</span></div>
                  <Link to={`/diaries/${diary.diary_id}`} className="diary-card-action"><MessageCircle size={18} /> <span>{commentCount}</span></Link>
                </footer>
              </article>
            )
          })}
            </div>
        </Card>
      </div>
    </div>
  )

  const MonthlyPanel = () => (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
        <Card>
          <h3>圖表與分析結果</h3>
          <div ref={chartRef} style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color:'#888' }}>
            {!chartData && <div>按「分析」以產生圖表</div>}
            {chartData && chartData.type === 'bar' && (
              <div style={{ width: '100%' }}>
                <Bar data={chartData.data} />
              </div>
            )}
            {chartData && chartData.type === 'pie' && (
              <div style={{ width: 400 }}>
                <Pie data={chartData.data} />
              </div>
            )}
          </div>
          {chartData && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button variant="primary" onClick={exportPdf}>下載 PDF</Button>
            </div>
          )}
        </Card>

        <Card>
          <h3>統計控制面板</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <label>選擇年</label>
            <select value={year} onChange={e=>setYear(Number(e.target.value))}>
              {years.map(y=> <option key={y} value={y}>{y}</option>)}
            </select>

            <label>選擇月</label>
            <select value={month} onChange={e=>setMonth(Number(e.target.value))}>
              {[...Array(12)].map((_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
            </select>

            <label>圖表類型</label>
            <select value={chartType} onChange={e=>setChartType(e.target.value)}>
              <option value="diary_count">日記數量（長條圖）</option>
              <option value="weather_pie">天氣統計（圓餅圖）</option>
              <option value="mood_pie">心情統計（圓餅圖）</option>
            </select>

            <Button variant="primary" onClick={handleAnalyze}>分析</Button>
            <Button variant="ghost" onClick={exportPdf}>下載 PDF（若已產生圖表）</Button>
          </div>
        </Card>
      </div>
    </div>
  )

  if (loading) return <div style={{ padding: 40 }}>載入中...</div>

  return (
    <div className="page dashboard-page" style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="page-title">回顧與分析</h2>
      </div>

      {renderTabs()}

      {/* 各標籤面板 */}
      <div style={{ marginTop: 16 }}>
        {/* 個人首頁已移除 */}
        {activeTab === 'stats' && <StatsPanel />}
        {activeTab === 'diary' && <DiaryPanel />}
        {activeTab === 'monthly' && <MonthlyPanel />}
      </div>
    </div>
  )
}

export default DashboardPage
