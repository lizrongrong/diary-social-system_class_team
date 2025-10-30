import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import { Search, Heart, MessageCircle, SlidersHorizontal, X } from 'lucide-react'

const API_URL = 'http://localhost:3000/api/v1'

const EMOTIONS = ['開心', '平靜', '興奮', '難過', '焦慮', '憤怒', '感恩', '疲憊']
const WEATHERS = ['晴天', '陰天', '雨天', '雪天', '多雲', '颱風']

function SearchPage() {
  const [searchParams] = useSearchParams()
  const [keyword, setKeyword] = useState('')
  const [emotion, setEmotion] = useState('')
  const [weather, setWeather] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [showFilters, setShowFilters] = useState(false)

  const [diaries, setDiaries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  // 從URL參數初始化搜尋
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setKeyword(q)
      // 自動執行搜尋
      setTimeout(() => {
        handleSearch()
      }, 100)
    }
  }, [searchParams])

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    
    setLoading(true)
    setError('')
    setSearched(true)
    
    try {
      const token = localStorage.getItem('token')
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      
      const params = new URLSearchParams()
      if (keyword) params.append('keyword', keyword)
      if (emotion) params.append('emotion', emotion)
      if (weather) params.append('weather', weather)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      params.append('sortBy', sortBy)
      
      const response = await axios.get(`${API_URL}/diaries/search?${params.toString()}`, config)
      setDiaries(response.data.diaries || [])
    } catch (e) {
      setError(e.response?.data?.message || '搜尋失敗')
      setDiaries([])
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setKeyword('')
    setEmotion('')
    setWeather('')
    setDateFrom('')
    setDateTo('')
    setSortBy('created_at')
  }

  return (
    <div className="page search-page fade-in" style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h2 className="text-h2" style={{ color: 'var(--primary-purple)' }}> 搜尋日記</h2>
        <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--spacing-sm)' }}>
          使用關鍵字、情緒、天氣等條件來搜尋日記
        </p>
      </div>

      {/* Search Bar */}
      <Card style={{ marginBottom: 'var(--spacing-lg)' }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <Input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜尋標題或內容..."
                leftIcon={<Search size={20} />}
                disabled={loading}
              />
            </div>
            <Button
              type="button"
              variant={showFilters ? 'primary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
              篩選
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? '搜尋中...' : '搜尋'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="slide-up" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 'var(--spacing-lg)',
            paddingBottom: 'var(--spacing-md)',
            borderBottom: '2px solid var(--gray-200)'
          }}>
            <h4 className="text-h4" style={{ color: 'var(--primary-purple)' }}>進階篩選</h4>
            <button
              onClick={() => setShowFilters(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--gray-600)',
                padding: 'var(--spacing-xs)'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
            <Select
              label="情緒"
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              options={[
                { value: '', label: '全部' },
                ...EMOTIONS.map(e => ({ value: e, label: e }))
              ]}
            />

            <Select
              label="天氣"
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              options={[
                { value: '', label: '全部' },
                ...WEATHERS.map(w => ({ value: w, label: w }))
              ]}
            />

            <Input
              type="date"
              label="開始日期"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />

            <Input
              type="date"
              label="結束日期"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />

            <Select
              label="排序方式"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'created_at', label: '最新優先' },
                { value: 'like_count', label: '最多讚' },
                { value: 'comment_count', label: '最多留言' }
              ]}
            />
          </div>

          <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
            >
              清除篩選
            </Button>
          </div>
        </Card>
      )}

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
                    {(diary.display_name || diary.username || 'U').charAt(0).toUpperCase()}
                  </div>
                </Link>
                <div>
                  <Link 
                    to={`/users/${diary.user_id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="text-body" style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                      {diary.display_name || diary.username || '匿名用戶'}
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
