import useAuthStore from '../store/authStore'
import { useToast } from '../components/ui/Toast'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import Card from '../components/ui/Card'
import { Heart, MessageCircle } from 'lucide-react'

const API_URL = 'http://localhost:3000/api/v1'

function SearchPage() {
  const [searchParams] = useSearchParams()
  const [keyword, setKeyword] = useState('')
  const [emotion, setEmotion] = useState('')
  const [weather, setWeather] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('created_at')

  const [diaries, setDiaries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  // 從URL參數初始化搜尋
  const filterParams = useMemo(() => {
    const params = {
      keyword: searchParams.get('keyword') || searchParams.get('q') || '',
      emotion: searchParams.get('emotion') || '',
      weather: searchParams.get('weather') || '',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      sortBy: searchParams.get('sortBy') || 'created_at'
    }
    return params
  }, [searchParams])

  useEffect(() => {
    setKeyword(filterParams.keyword)
    setEmotion(filterParams.emotion)
    setWeather(filterParams.weather)
    setDateFrom(filterParams.dateFrom)
    setDateTo(filterParams.dateTo)
    setSortBy(filterParams.sortBy)

    const hasCriteria = Object.values(filterParams).some((value, index) => {
      if (index === 5) {
        return value && value !== 'created_at'
      }
      return value && value.trim() !== ''
    })

    if (hasCriteria) {
      handleSearch(undefined, filterParams)
    } else {
      setDiaries([])
      setSearched(false)
    }
  }, [filterParams])

  // 若為訪客，強制跳轉至登入頁（不在此處顯示提示，由 ProtectedRoute 處理或其他共通邏輯負責提示）
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAuthLoading = useAuthStore((state) => state.isLoading)
  const { addToast } = useToast()

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      // 顯示一次登入提示（和 ProtectedRoute 使用相同去重機制）
      try {
        const key = 'loginRedirectToastShown'
        const last = sessionStorage.getItem(key)
        const now = Date.now()
        const threshold = 3000
        if (!last || (now - Number(last)) > threshold) {
          addToast('請先登入以訪問此頁面', 'warning', 3000)
          sessionStorage.setItem(key, String(now))
        }
      } catch (e) {
        addToast('請先登入以訪問此頁面', 'warning', 3000)
      }

      // 導向登入頁，保留來源位置
      navigate('/login', { replace: true, state: { from: '/search' } })
    }
  }, [isAuthLoading, isAuthenticated, navigate])

  const handleSearch = async (e, overrides) => {
    if (e) e.preventDefault()

    const criteria = overrides || {
      keyword,
      emotion,
      weather,
      dateFrom,
      dateTo,
      sortBy
    }

    setLoading(true)
    setError('')
    setSearched(true)

    try {
      const token = sessionStorage.getItem('token')
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}

      const params = new URLSearchParams()
      if (criteria.keyword) params.append('keyword', criteria.keyword)
      if (criteria.emotion) params.append('emotion', criteria.emotion)
      if (criteria.weather) params.append('weather', criteria.weather)
      if (criteria.dateFrom) params.append('dateFrom', criteria.dateFrom)
      if (criteria.dateTo) params.append('dateTo', criteria.dateTo)
      params.append('sortBy', criteria.sortBy || 'created_at')

      const response = await axios.get(`${API_URL}/diaries/search?${params.toString()}`, config)
      setDiaries(response.data.diaries || [])
    } catch (err) {
      setError(err.response?.data?.message || '搜尋失敗')
      setDiaries([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page search-page fade-in" style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h2 className="text-h2" style={{ color: 'var(--primary-purple)' }}> 搜尋日記</h2>
        <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--spacing-sm)' }}>
          使用關鍵字、情緒、天氣等條件來搜尋日記
        </p>
      </div>

      {/* Error */}
      {error && (
        <Card style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-lg)',
            color: 'var(--error-color)'
          }}>
            <p className="text-body">{error}</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ width: '100%', height: 200, borderRadius: 'var(--radius-lg)' }}></div>
          ))}
        </div>
      ) : searched && diaries.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}></div>
            <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-sm)' }}>沒有找到符合條件的日記</h3>
            <p className="text-body" style={{ color: 'var(--gray-600)' }}>
              試試調整搜尋條件或清除篩選
            </p>
          </div>
        </Card>
      ) : diaries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {diaries.map((diary, index) => (
            <Card
              key={diary.diary_id}
              hoverable
              className="slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Author info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 'var(--spacing-md)',
                paddingBottom: 'var(--spacing-md)',
                borderBottom: '1px solid var(--gray-200)'
              }}>
                <Link to={`/users/${diary.user_id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary-purple), var(--primary-pink))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    marginRight: 'var(--spacing-sm)'
                  }}>
                    {(diary.username || 'U').charAt(0).toUpperCase()}
                  </div>
                </Link>
                <div>
                  <Link
                    to={`/users/${diary.user_id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="text-body" style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                      {diary.username || '匿名用戶'}
                    </div>
                  </Link>
                  <div className="text-small" style={{ color: 'var(--gray-600)' }}>
                    {new Date(diary.created_at).toLocaleDateString('zh-TW')}
                  </div>
                </div>
              </div>

              {/* Content */}
              <Link
                to={`/diaries/${diary.diary_id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <h3 className="text-h3" style={{
                  marginBottom: 'var(--spacing-md)',
                  color: 'var(--gray-900)'
                }}>
                  {diary.title || '(未命名)'}
                </h3>

                {/* Tags */}
                {diary.tags && diary.tags.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-xs)',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    {diary.tags.filter(t => t.tag_type === 'emotion').slice(0, 2).map((t, i) => (
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
                  </div>
                )}

                {/* Preview */}
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

              {/* Stats */}
              <div style={{
                display: 'flex',
                gap: 'var(--spacing-lg)',
                paddingTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--gray-200)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                  <Heart size={16} />
                  <span>{diary.like_count || 0}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                  <MessageCircle size={16} />
                  <span>{diary.comment_count || 0}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : !searched ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}></div>
            <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-sm)' }}>開始搜尋</h3>
            <p className="text-body" style={{ color: 'var(--gray-600)' }}>
              輸入關鍵字或使用進階篩選來找到您想要的日記
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

export default SearchPage
