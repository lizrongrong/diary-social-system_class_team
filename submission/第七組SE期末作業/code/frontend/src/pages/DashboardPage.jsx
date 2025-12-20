import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { diaryAPI, followAPI, userAPI, ensureAbsoluteUrl, likeAPI } from '../services/api'
import { buildTagStyle, getEmotionPalette, getWeatherPalette } from '../utils/tagPalettes'
import { useToast } from '../components/ui/Toast'
import useAuthStore from '../store/authStore'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Calendar, Heart, MessageCircle, Share2, PencilLine, Trash2, PenTool, Eye, Users, TrendingUp, Settings, ChevronDown, BarChart2 } from 'lucide-react'
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
        // 主要抓取：使用者自己的所有日記（個人頁面與儀表板的資料來源）
        if (user && user.user_id) {
          // 改用 getAll 取得自己的所有日記 (包含 private)
          const res = await diaryAPI.getAll({ limit: 500 })
          const raw = res?.diaries || []
          const normalized = (Array.isArray(raw) ? raw : []).map(d => ({
            ...d,
            like_count: Number(d.like_count ?? d.likes ?? d.likeCount ?? 0) || 0,
            comment_count: Number(d.comment_count ?? d.comments ?? d.commentCount ?? 0) || 0,
            is_liked: Boolean(d.is_liked ?? d.liked ?? false),
            avatar_url: d.avatar_url ?? d.profile_image ?? d.avatar ?? d.user_avatar ?? ''
          }))
          setUserDiaries(normalized)
        } else {
          setUserDiaries([])
        }

        // 一般探索 / 快速摘要（可擴充）
        const all = await diaryAPI.getAll({ limit: 200 })
        const rawAll = all?.diaries || []
        const normalizedAll = (Array.isArray(rawAll) ? rawAll : []).map(d => ({
          ...d,
          like_count: Number(d.like_count ?? d.likes ?? d.likeCount ?? 0) || 0,
          comment_count: Number(d.comment_count ?? d.comments ?? d.commentCount ?? 0) || 0,
          is_liked: Boolean(d.is_liked ?? d.liked ?? false),
          avatar_url: d.avatar_url ?? d.profile_image ?? d.avatar ?? d.user_avatar ?? ''
        }))
        setDiaries(normalizedAll)

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

  const navigate = useNavigate()

  const handleCardClick = (event, diaryId) => {
    if (!diaryId) return
    const interactive = event.target.closest('button, a, input, textarea, select, label')
    if (interactive) return

    const targetUrl = `/diaries/${diaryId}`
    if (event.metaKey || event.ctrlKey) {
      window.open(`${window.location.origin}${targetUrl}`, '_blank', 'noopener')
      return
    }

    navigate(targetUrl)
  }

  const handleCardKeyDown = (event, diaryId) => {
    if (!diaryId) return
    const interactive = event.target.closest('button, a, input, textarea, select, label')
    if (interactive) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      navigate(`/diaries/${diaryId}`)
    }
  }

  const { addToast } = useToast()

  const [likePendingIds, setLikePendingIds] = useState(() => new Set())
  const isLikePending = (diaryId) => likePendingIds.has(diaryId)

  const syncLikeState = (diaryId, liked, count) => {
    setUserDiaries(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev
      return prev.map(item => {
        const id = item.diary_id || item.id || null
        if (String(id) !== String(diaryId)) return item
        const base = Number(item.like_count ?? item.likes ?? 0) || 0
        let nextCount = base
        if (typeof count === 'number' && Number.isFinite(count)) {
          nextCount = count
        } else if (liked !== undefined) {
          if (liked && !item.is_liked) nextCount = base + 1
          else if (!liked && item.is_liked) nextCount = Math.max(0, base - 1)
        }
        return {
          ...item,
          is_liked: !!liked,
          like_count: nextCount,
          likes: nextCount
        }
      })
    })
  }

  // Listen for global like/comment updates so Dashboard stays in sync with other pages
  useEffect(() => {
    const likeHandler = (e) => {
      try {
        const { diaryId, liked, count } = e.detail || {}
        if (!diaryId) return
        // update userDiaries (used for recent list)
        syncLikeState(diaryId, liked, count)
        // also update general diaries list if present
        setDiaries(prev => {
          if (!Array.isArray(prev) || prev.length === 0) return prev
          return prev.map(item => {
            const id = item.diary_id || item.id || item.diaryId || null
            if (String(id) !== String(diaryId)) return item
            const base = Number(item.like_count ?? item.likes ?? 0) || 0
            let nextCount = base
            if (typeof count === 'number' && Number.isFinite(count)) nextCount = count
            else if (liked !== undefined) {
              if (liked && !item.is_liked) nextCount = base + 1
              else if (!liked && item.is_liked) nextCount = Math.max(0, base - 1)
            }
            return { ...item, is_liked: !!liked, like_count: nextCount, likes: nextCount }
          })
        })
      } catch (err) { console.debug('Dashboard diaryLikeUpdated handler error', err) }
    }

    const commentHandler = (e) => {
      try {
        const { diaryId, count } = e.detail || {}
        if (!diaryId) return
        setUserDiaries(prev => {
          if (!Array.isArray(prev) || prev.length === 0) return prev
          return prev.map(entry => {
            const entryId = entry.diary_id || entry.id || entry.diaryId
            if (String(entryId) !== String(diaryId)) return entry
            return { ...entry, comment_count: Number(count ?? entry.comment_count ?? 0), comments: Number(count ?? entry.comments ?? 0) }
          })
        })
        setDiaries(prev => {
          if (!Array.isArray(prev) || prev.length === 0) return prev
          return prev.map(entry => {
            const entryId = entry.diary_id || entry.id || entry.diaryId
            if (String(entryId) !== String(diaryId)) return entry
            return { ...entry, comment_count: Number(count ?? entry.comment_count ?? 0), comments: Number(count ?? entry.comments ?? 0) }
          })
        })
      } catch (err) { console.debug('Dashboard diaryCommentUpdated handler error', err) }
    }

    window.addEventListener('diaryLikeUpdated', likeHandler)
    window.addEventListener('diaryCommentUpdated', commentHandler)
    return () => {
      window.removeEventListener('diaryLikeUpdated', likeHandler)
      window.removeEventListener('diaryCommentUpdated', commentHandler)
    }
  }, [syncLikeState])

  const handleLike = async (event, diaryId) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (!user) {
      addToast('請先登入', 'warning')
      return
    }
    if (!diaryId || isLikePending(diaryId)) return

    const current = Array.isArray(userDiaries) ? userDiaries.find(d => String(d.diary_id || d.id) === String(diaryId)) : null
    if (!current) return

    const prevLiked = Boolean(current.is_liked)
    const prevCount = Number(current.like_count ?? current.likes ?? 0) || 0

    setLikePendingIds(prev => { const next = new Set(prev); next.add(diaryId); return next })
    // optimistic
    syncLikeState(diaryId, !prevLiked, NaN)

    try {
      const resp = await likeAPI.toggle('diary', diaryId)
      const serverLiked = Boolean(resp?.liked)
      const rawCount = Number(resp?.count)
      const serverCount = Number.isFinite(rawCount) ? rawCount : NaN
      syncLikeState(diaryId, serverLiked, serverCount)
      try { window.dispatchEvent(new CustomEvent('diaryLikeUpdated', { detail: { diaryId, liked: serverLiked, count: serverCount } })) } catch (e) { console.debug('dispatch diaryLikeUpdated failed', e) }
    } catch (err) {
      console.error('toggle like failed', err)
      addToast(err?.response?.data?.message || '按讚失敗', 'error')
      syncLikeState(diaryId, prevLiked, prevCount)
    } finally {
      setLikePendingIds(prev => { const next = new Set(prev); next.delete(diaryId); return next })
    }
  }

  const handleShare = async (diaryId) => {
    const url = `${window.location.origin}/diaries/${diaryId}`
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        addToast('連結已複製', 'success')
      } else {
        window.prompt('請複製連結', url)
      }
    } catch (err) {
      console.error('分享複製失敗', err)
      addToast('複製連結失敗', 'error')
    }
  }

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, diaryId: null, diaryTitle: '' })
  const [deletePending, setDeletePending] = useState(false)

  const openDeleteConfirm = (diary) => {
    const title = diary?.title && diary.title.trim() ? diary.title : '(未命名)'
    setDeleteConfirm({ open: true, diaryId: diary.diary_id, diaryTitle: title })
  }

  const handleCancelDelete = () => {
    if (deletePending) return
    setDeleteConfirm({ open: false, diaryId: null, diaryTitle: '' })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.diaryId) return
    setDeletePending(true)
    try {
      await diaryAPI.delete(deleteConfirm.diaryId)
      addToast('日記已刪除', 'success')
      setUserDiaries(prev => Array.isArray(prev) ? prev.filter(d => String(d.diary_id) !== String(deleteConfirm.diaryId)) : [])
      setDeleteConfirm({ open: false, diaryId: null, diaryTitle: '' })
    } catch (err) {
      console.error('刪除日記失敗', err)
      addToast(err?.response?.data?.message || '刪除失敗', 'error')
    } finally {
      setDeletePending(false)
    }
  }

  

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
            {userDiaries.slice(0,3).map((diary, index) => {
            const diaryAvatar = ensureAbsoluteUrl(diary.avatar_url || diary.profile_image || diary.avatar || diary.user_avatar || '')
            const diaryDate = new Date(diary.created_at || diary.createdAt)
            const tags = Array.isArray(diary.tags) ? diary.tags : (typeof diary.tags === 'string' ? JSON.parse(diary.tags || '[]') : [])
            const getTagValue = (t) => t?.tag_value || t?.value || t?.name || t?.tag || ''
            const emotionTags = tags.filter((tag) => (tag.tag_type === 'emotion' || tag.type === 'emotion')).map(t => ({ ...t, _value: getTagValue(t) }))
            const weatherTag = tags.find((tag) => (tag.tag_type === 'weather' || tag.type === 'weather'))
            const keywordTags = tags.filter((tag) => (tag.tag_type === 'keyword' || tag.type === 'keyword')).map(t => ({ ...t, _value: getTagValue(t) }))
            // Prefer authoritative counts from the global `diaries` list (keeps parity with HomePage)
            const authoritative = (Array.isArray(diaries) ? diaries.find(d => String(d.diary_id || d.id) === String(diary.diary_id || diary.id)) : null) || diary
            const likeCount = Number(authoritative.like_count ?? authoritative.likes ?? authoritative.likeCount ?? diary.like_count ?? diary.likes ?? 0) || 0
            const commentCount = Number(authoritative.comment_count ?? authoritative.comments ?? authoritative.commentCount ?? diary.comment_count ?? diary.comments ?? 0) || 0
            const isLiked = Boolean(authoritative.is_liked ?? authoritative.liked ?? diary.is_liked ?? diary.liked ?? false)

            return (
              <article
                key={diary.diary_id}
                className={`user-profile-diary-card ${index === 0 ? 'is-featured' : ''}`}
                role="link"
                tabIndex={0}
                aria-label={`開啟 ${diary.title || '日記'} 詳細內容`}
                onClick={(event) => handleCardClick(event, diary.diary_id)}
                onKeyDown={(event) => handleCardKeyDown(event, diary.diary_id)}
              >
                <header className="diary-card-header">
                  <div className="author-info">
                    <Link
                      to={diary.user_id ? `/users/${diary.user_id}` : (user?.user_id ? `/users/${user.user_id}` : '#')}
                      className="author-avatar"
                      style={{
                        backgroundImage: diaryAvatar ? `url(${diaryAvatar})` : 'none',
                        backgroundColor: diaryAvatar ? 'transparent' : '#E0E0E0',
                        textDecoration: 'none'
                      }}
                      onClick={(e) => { if (!diary.user_id && !user?.user_id) e.preventDefault(); e.stopPropagation() }}
                    >
                      {/* avatar container uses background-image; fallback handled by CSS */}
                    </Link>
                    <div className="author-details">
                      <Link to={diary.user_id ? `/users/${diary.user_id}` : (user?.user_id ? `/users/${user.user_id}` : '#')} className="author-name-link" style={{ textDecoration: 'none', color: 'inherit' }} onClick={(e) => { if (!diary.user_id && !user?.user_id) e.preventDefault(); e.stopPropagation() }}>
                        <h3 className="author-name">{diary.username || diary.display_name || ''}</h3>
                      </Link>
                      <span className="post-date">{diaryDate.toLocaleDateString('zh-TW')}</span>
                    </div>
                  </div>
                  {user && String(user.user_id) === String(diary.user_id || user.user_id) && (
                    <div className="post-owner-actions">
                      <button type="button" className="owner-action-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/diaries/${diary.diary_id}/edit`) }} aria-label="編輯日記"><PencilLine size={18} /></button>
                      <button type="button" className="owner-action-btn owner-action-delete" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteConfirm(diary) }} aria-label="刪除日記"><Trash2 size={18} /></button>
                    </div>
                  )}
                </header>

                  <div className="post-content" role="presentation">
                  <Link to={`/diaries/${diary.diary_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3 className="post-title">{diary.title || '(未命名)'}</h3>
                  </Link>

                  {(emotionTags.length > 0 || weatherTag || keywordTags.length > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {emotionTags.slice(0, 3).map((tag, i) => (
                        <span key={`e-${i}`} style={{ ...buildTagStyle(getEmotionPalette(tag._value || tag.tag_value)), padding: '2px 8px', color: '#FFFFFF', borderRadius: '999px', fontSize: '0.8125rem' }}>{tag._value || tag.tag_value}</span>
                      ))}
                      {weatherTag && (
                        <span style={{ ...buildTagStyle(getWeatherPalette(getTagValue(weatherTag))), padding: '2px 8px', color: '#FFFFFF', borderRadius: '999px', fontSize: '0.8125rem' }}>{getTagValue(weatherTag)}</span>
                      )}
                      {keywordTags.slice(0, 3).map((tag, i) => (
                        <span key={`k-${i}`} style={{ padding: '2px 8px', background: 'var(--gray-200)', borderRadius: '999px', fontSize: '0.8125rem', color: 'var(--gray-700)' }}>#{tag._value || tag.tag_value}</span>
                      ))}
                    </div>
                  )}

                  {diary.content && <p>{diary.content}</p>}
                </div>

                <div className="post-footer" role="presentation" onClick={(event) => { event.stopPropagation() }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') event.stopPropagation() }}>
                  <button
                    type="button"
                    className={`post-action ${isLiked ? 'liked' : ''}`}
                    onClick={(e) => handleLike(e, diary.diary_id)}
                    disabled={isLikePending(diary.diary_id)}
                    aria-pressed={isLiked}
                    aria-busy={isLikePending(diary.diary_id)}
                  >
                    <Heart size={20} color={isLiked ? '#CD79D5' : undefined} fill={isLiked ? '#CD79D5' : 'none'} />
                    <span>{likeCount} 個讚</span>
                  </button>
                  <Link to={`/diaries/${diary.diary_id}`} className="post-action">
                    <MessageCircle size={20} />
                    <span>{commentCount} 則留言</span>
                  </Link>
                  <button type="button" className="post-action" onClick={() => handleShare(diary.diary_id)}>
                    <Share2 size={20} />
                    <span>日記分享</span>
                  </button>
                </div>
              </article>
            )
          })}
            </div>
        </Card>
      </div>
    </div>
  )

  const MonthlyPanel = () => (
    <div className="monthly-panel">
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 'var(--spacing-lg)' }}>
        <Card className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} />
              圖表與分析結果
            </h3>
            {chartData && (
              <Button variant="outline" size="small" onClick={exportPdf} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Share2 size={16} />
                匯出 PDF
              </Button>
            )}
          </div>
          
          <div ref={chartRef} style={{ 
            minHeight: 400, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'var(--gray-50)', 
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-lg)',
            border: '1px dashed var(--gray-200)'
          }}>
            {!chartData ? (
              <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
                <BarChart2 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>請選擇條件並點擊「開始分析」以產生圖表</p>
              </div>
            ) : (
              <>
                {chartData.type === 'bar' && (
                  <div style={{ width: '100%', height: '100%' }}>
                    <Bar data={chartData.data} options={{ maintainAspectRatio: false, responsive: true }} />
                  </div>
                )}
                {chartData.type === 'pie' && (
                  <div style={{ width: '100%', maxWidth: 400 }}>
                    <Pie data={chartData.data} />
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        <Card className="controls-card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} />
            分析設定
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500, color: 'var(--gray-700)' }}>年份</label>
              <div style={{ position: 'relative' }}>
                <select 
                  value={year} 
                  onChange={e => setYear(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--gray-200)',
                    backgroundColor: '#fff',
                    fontSize: '1rem',
                    appearance: 'none'
                  }}
                >
                  {years.map(y => <option key={y} value={y}>{y} 年</option>)}
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--gray-400)' }} />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500, color: 'var(--gray-700)' }}>月份</label>
              <div style={{ position: 'relative' }}>
                <select 
                  value={month} 
                  onChange={e => setMonth(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--gray-200)',
                    backgroundColor: '#fff',
                    fontSize: '1rem',
                    appearance: 'none'
                  }}
                >
                  {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1} 月</option>)}
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--gray-400)' }} />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500, color: 'var(--gray-700)' }}>圖表類型</label>
              <div style={{ position: 'relative' }}>
                <select 
                  value={chartType} 
                  onChange={e => setChartType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--gray-200)',
                    backgroundColor: '#fff',
                    fontSize: '1rem',
                    appearance: 'none'
                  }}
                >
                  <option value="diary_count">日記數量趨勢</option>
                  <option value="weather_pie">天氣分佈統計</option>
                  <option value="mood_pie">心情分佈統計</option>
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--gray-400)' }} />
              </div>
            </div>

            <Button 
              variant="primary" 
              onClick={handleAnalyze}
              style={{ 
                marginTop: '0.5rem', 
                width: '100%', 
                justifyContent: 'center',
                padding: '0.75rem'
              }}
            >
              開始分析
            </Button>
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
      {deleteConfirm.open && (
        <div
          className="home-delete-confirm-backdrop"
          role="presentation"
          onClick={handleCancelDelete}
        >
          <div
            className="home-delete-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-delete-confirm-title"
            aria-describedby="home-delete-confirm-description"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="home-delete-confirm-title">刪除日記</h3>
            <p id="home-delete-confirm-description" className="home-delete-confirm-text">確定要刪除「{deleteConfirm.diaryTitle || '這篇日記'}」嗎？此動作無法復原。</p>
            <div className="home-delete-confirm-actions">
              <button type="button" className="home-delete-confirm-btn secondary" onClick={handleCancelDelete} disabled={deletePending}>取消</button>
              <button type="button" className="home-delete-confirm-btn danger" onClick={handleConfirmDelete} disabled={deletePending}>{deletePending ? '刪除中...' : '確認刪除'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
