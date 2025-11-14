import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Share2, UserPlus, UserCheck, Users, RefreshCw, SlidersHorizontal, X, PencilLine, Trash2 } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { diaryAPI, ensureAbsoluteUrl, followAPI, likeAPI } from '../services/api'
import { useToast } from '../components/ui/Toast'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import { EMOTIONS, WEATHERS, SORT_OPTIONS } from '../constants/searchFilters'
import './HomePage.css'

function HomePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [posts, setPosts] = useState([])
  const [filteredPosts, setFilteredPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [follows, setFollows] = useState([])
  const [mutualFollows, setMutualFollows] = useState(new Set()) // 儲存互相追蹤的用戶ID
  const [followLoadingIds, setFollowLoadingIds] = useState(() => new Set())
  const [unfollowConfirm, setUnfollowConfirm] = useState({ open: false, targetId: null, targetName: '' })
  const [likePendingIds, setLikePendingIds] = useState(() => new Set())
  const [keyword, setKeyword] = useState('')
  const [emotion, setEmotion] = useState('')
  const [weather, setWeather] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [showFilters, setShowFilters] = useState(false)

  const updateFollowLoading = (targetId, isLoading) => {
    setFollowLoadingIds(prev => {
      const next = new Set(prev)
      if (isLoading) {
        next.add(targetId)
      } else {
        next.delete(targetId)
      }
      return next
    })
  }

  const isFollowLoading = (targetId) => followLoadingIds.has(targetId)
  const isLikePending = (diaryId) => likePendingIds.has(diaryId)

  const updateMutualFlag = (targetId, shouldBeMutual) => {
    if (!targetId) return
    setMutualFollows(prev => {
      const next = new Set(prev)
      if (shouldBeMutual) {
        next.add(targetId)
      } else {
        next.delete(targetId)
      }
      return next
    })
  }

  const normalizeMediaArray = (media) => {
    if (!media) return []
    if (Array.isArray(media)) return media
    if (typeof media === 'string') {
      try {
        const parsed = JSON.parse(media)
        return Array.isArray(parsed) ? parsed : []
      } catch (err) {
        console.warn('無法解析日記媒體資料', err)
        return []
      }
    }
    return []
  }

  const getImagesFromMedia = (media) => {
    return normalizeMediaArray(media)
      .map((item) => (typeof item === 'string' ? { file_url: item } : item))
      .filter((item) => {
        const type = (item?.file_type || item?.type || '').toLowerCase()
        if (type && type.startsWith('image')) return true
        const url = item?.file_url || item?.url || ''
        return /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(url)
      })
      .map((item, index) => {
        const url = ensureAbsoluteUrl(item.file_url || item.url || '')
        return {
          key: item.media_id || item.id || `${item.file_url || item.url || 'image'}-${index}`,
          url,
          alt: item.alt || item.description || ''
        }
      })
      .filter((item) => Boolean(item.url))
  }

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

  const openUnfollowConfirm = (targetId, targetName) => {
    setUnfollowConfirm({ open: true, targetId, targetName: targetName || '' })
  }

  const closeUnfollowConfirm = () => {
    setUnfollowConfirm({ open: false, targetId: null, targetName: '' })
  }

  const applyFilters = (data, overrides = {}) => {
    const criteria = {
      keyword,
      emotion,
      weather,
      dateFrom,
      dateTo,
      sortBy,
      ...overrides
    }

    const normalizedKeyword = criteria.keyword.trim().toLowerCase()
    const hasEmotion = Boolean(criteria.emotion)
    const hasWeather = Boolean(criteria.weather)
    const hasDateFrom = Boolean(criteria.dateFrom)
    const hasDateTo = Boolean(criteria.dateTo)
    const hasKeyword = Boolean(normalizedKeyword)
    const shouldFilter = hasEmotion || hasWeather || hasDateFrom || hasDateTo || hasKeyword

    const fromDate = hasDateFrom ? new Date(criteria.dateFrom) : null
    const toDate = hasDateTo ? new Date(criteria.dateTo) : null
    if (toDate) {
      toDate.setHours(23, 59, 59, 999)
    }

    let result = shouldFilter ? data.filter((post) => {
      const createdAt = post.created_at ? new Date(post.created_at) : null

      if (fromDate && createdAt && createdAt < fromDate) {
        return false
      }

      if (toDate && createdAt && createdAt > toDate) {
        return false
      }

      const tags = Array.isArray(post.tags) ? post.tags : []
      if (hasEmotion && !tags.some(tag => tag.tag_type === 'emotion' && tag.tag_value === criteria.emotion)) {
        return false
      }

      if (hasWeather && !tags.some(tag => tag.tag_type === 'weather' && tag.tag_value === criteria.weather)) {
        return false
      }

      if (hasKeyword) {
        const text = `${post.title || ''} ${post.content || ''}`.toLowerCase()
        const keywordTags = tags
          .filter(tag => tag.tag_type === 'keyword')
          .map(tag => tag.tag_value?.toLowerCase?.() || '')
        const hasKeywordMatch = text.includes(normalizedKeyword) || keywordTags.some(value => value.includes(normalizedKeyword))
        if (!hasKeywordMatch) {
          return false
        }
      }

      return true
    }) : data

    const shouldSort = shouldFilter || criteria.sortBy !== 'created_at'
    if (!shouldSort) {
      return [...result]
    }

    const sorter = (a, b) => {
      switch (criteria.sortBy) {
        case 'like_count':
          return (b.like_count || 0) - (a.like_count || 0)
        case 'comment_count':
          return (b.comment_count || 0) - (a.comment_count || 0)
        case 'created_at':
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      }
    }

    return [...result].sort(sorter)
  }

  const handleManualRefresh = () => {
    fetchPublicDiaries()
    if (user) {
      fetchFollows()
    }
  }

  // 獲取公開日記
  useEffect(() => {
    fetchPublicDiaries()
    if (user) {
      fetchFollows()
    }
  }, [user])

  // 監聽首頁重整事件
  useEffect(() => {
    const handleRefresh = () => {
      fetchPublicDiaries()
    }
    window.addEventListener('homepageRefresh', handleRefresh)
    return () => window.removeEventListener('homepageRefresh', handleRefresh)
  }, [user])

  const fetchPublicDiaries = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching public diaries...')
      const data = await diaryAPI.explore({ page: 1, limit: user ? 20 : 6 })
      console.log('Received data:', data)

      // 隨機排序日記
      const diariesArray = data.diaries || []
      const shuffled = [...diariesArray].sort(() => Math.random() - 0.5)
      setPosts(shuffled)
      setFilteredPosts(applyFilters(shuffled))
    } catch (err) {
      console.error('Error fetching public diaries:', err)
      setError('無法載入日記')
    } finally {
      setLoading(false)
    }
  }

  const fetchFollows = async () => {
    try {
      const data = await followAPI.getAll()
      const list = data.following || data.friends || []
      console.log('=== 我追蹤的人 ===')
      console.log('當前用戶:', user?.username, user?.user_id)
      console.log('追蹤列表:', list)
      list.forEach(f => {
        console.log(`  → 我追蹤: ${f.username} (${f.friend_user_id || f.following_user_id})`)
      })
      setFollows(list)

      // 檢查每個好友是否互相追蹤
      const mutuals = new Set()
      for (const friend of list) {
        try {
          const targetId = friend.friend_user_id || friend.following_user_id
          const status = await followAPI.checkStatus(targetId)
          console.log(`檢查 ${friend.username}: isFriend=${status.isFriend}, followsYou=${status.followsYou}, isMutual=${status.isMutual}`)
          if (status.isMutual) {
            mutuals.add(targetId)
          }
        } catch (err) {
          console.error('Error checking mutual status:', err)
        }
      }
      console.log('互相追蹤的用戶:', Array.from(mutuals))
      setMutualFollows(mutuals)
    } catch (err) {
      console.error('Error fetching follows:', err)
    }
  }

  const isFriend = (userId) => {
    const result = follows.some(f => (f.friend_user_id || f.following_user_id) === userId)
    console.log(`Checking if ${userId} is friend:`, result, 'Follows:', follows)
    return result
  }

  const isMutual = (userId) => {
    return mutualFollows.has(userId)
  }

  const syncLikeState = (diaryId, liked, count) => {
    setPosts(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev
      const updated = prev.map((post) => {
        if (post.diary_id !== diaryId) return post
        const baseCount = Number(post.like_count) || 0
        let nextCount = baseCount

        if (typeof count === 'number' && Number.isFinite(count)) {
          nextCount = count
        } else if (liked !== undefined) {
          if (liked && !post.is_liked) nextCount = baseCount + 1
          else if (!liked && post.is_liked) nextCount = Math.max(0, baseCount - 1)
        }

        return {
          ...post,
          is_liked: liked,
          like_count: nextCount
        }
      })
      setFilteredPosts(applyFilters(updated))
      return updated
    })
  }

  const handleLike = async (event, diaryId) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (!user) {
      addToast('請先登入', 'warning')
      return
    }

    if (!diaryId || isLikePending(diaryId)) {
      return
    }

    const currentPost = (Array.isArray(posts) ? posts : []).find(p => p.diary_id === diaryId) ||
      (Array.isArray(filteredPosts) ? filteredPosts : []).find(p => p.diary_id === diaryId)

    if (!currentPost) {
      console.warn('找不到指定日記，無法處理按讚：', diaryId)
      return
    }

    const previousLiked = Boolean(currentPost.is_liked)
    const previousCount = Number(currentPost.like_count) || 0

    setLikePendingIds(prev => {
      const next = new Set(prev)
      next.add(diaryId)
      return next
    })

    // Optimistically reflect the toggle for responsiveness
    syncLikeState(diaryId, !previousLiked, NaN)

    try {
      const response = await likeAPI.toggle('diary', diaryId)
      const serverLiked = Boolean(response?.liked)
      const rawCount = Number(response?.count)
      const serverCount = Number.isFinite(rawCount) ? rawCount : NaN

      syncLikeState(diaryId, serverLiked, serverCount)
    } catch (err) {
      const serverMessage = err?.response?.data?.message || err?.response?.data?.error
      console.error('Error toggling like:', serverMessage || err)
      addToast(serverMessage || '操作失敗', 'error')

      // Revert to previous state on failure
      syncLikeState(diaryId, previousLiked, previousCount)
    } finally {
      setLikePendingIds(prev => {
        const next = new Set(prev)
        next.delete(diaryId)
        return next
      })
    }
  }

  const performFollowMutation = async ({ targetUserId, alreadyFriend }) => {
    if (isFollowLoading(targetUserId)) {
      return
    }

    updateFollowLoading(targetUserId, true)

    try {
      if (alreadyFriend) {
        await followAPI.remove(targetUserId)
        addToast('已取消追蹤', 'success')
        updateMutualFlag(targetUserId, false)
      } else {
        const response = await followAPI.add(targetUserId)
        addToast('追蹤成功', 'success')
        if (response?.isMutual) {
          updateMutualFlag(targetUserId, true)
        }
      }
      await fetchFollows()
    } catch (err) {
      console.error('Error toggling follow:', err)
      const errorMsg = err.response?.data?.message || (alreadyFriend ? '取消追蹤失敗' : '追蹤失敗')
      addToast(errorMsg, 'error')
    } finally {
      updateFollowLoading(targetUserId, false)
      if (alreadyFriend) {
        closeUnfollowConfirm()
      }
    }
  }

  const handleToggleFollow = (targetUserId, targetUsername) => {
    if (!user) {
      addToast('請先登入', 'warning')
      return
    }

    const alreadyFriend = isFriend(targetUserId)

    if (alreadyFriend) {
      openUnfollowConfirm(targetUserId, targetUsername)
      return
    }

    performFollowMutation({ targetUserId, alreadyFriend: false })
  }

  const handleConfirmUnfollow = () => {
    if (!unfollowConfirm.targetId) return
    performFollowMutation({
      targetUserId: unfollowConfirm.targetId,
      alreadyFriend: true
    })
  }

  const handleCancelUnfollow = () => {
    if (unfollowConfirm.targetId && isFollowLoading(unfollowConfirm.targetId)) {
      return
    }
    closeUnfollowConfirm()
  }

  const handleShare = (diaryId) => {
    const url = `${window.location.origin}/diaries/${diaryId}`
    navigator.clipboard.writeText(url)
    addToast('連結已複製', 'success')
  }

  const handleEditDiary = (event, diaryId) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    navigate(`/diaries/${diaryId}/edit`)
  }

  const handleDeleteDiary = async (event, diaryId) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    const confirmed = window.confirm('確定要刪除此日記嗎？刪除後將無法恢復。')
    if (!confirmed) return

    try {
      await diaryAPI.delete(diaryId)
      addToast('日記已刪除', 'success')
      setPosts(prev => {
        const next = Array.isArray(prev) ? prev.filter(post => post.diary_id !== diaryId) : []
        setFilteredPosts(applyFilters(next))
        return next
      })
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || '刪除失敗'
      addToast(message, 'error')
    }
  }

  const clearSearchFilters = () => {
    setKeyword('')
    setEmotion('')
    setWeather('')
    setDateFrom('')
    setDateTo('')
    setSortBy('created_at')
    setShowFilters(false)
    setFilteredPosts(applyFilters(posts, {
      keyword: '',
      emotion: '',
      weather: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'created_at'
    }))
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setShowFilters(false)
    setFilteredPosts(applyFilters(posts))
  }

  // 顯示限制訪客提示
  const showGuestLimit = !user && filteredPosts.length >= 3

  if (loading) {
    return (
      <div className="home-page">
        <div className="loading-state">
          <p>載入中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="home-page">
        <div className="empty-state">
          <h3>{error}</h3>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="home-page">
        <div className="empty-state">
          <h3>此系統還未有任何日記</h3>
          <p>成為第一個分享生活的人吧！</p>
        </div>
      </div>
    )
  }

  return (
    <div className="home-page">
      <div className="home-search-section">
        <Card className="home-search-card">
          <form onSubmit={handleSearchSubmit}>
            <div className="home-search-toolbar">
              <button
                type="button"
                className="home-refresh-btn"
                onClick={handleManualRefresh}
                aria-label="重新整理"
              >
                <RefreshCw size={20} />
              </button>
              <div className="home-search-input">
                <Input
                  type="text"
                  name="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜尋標題或內容..."
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant={showFilters ? 'primary' : 'outline'}
                onClick={() => setShowFilters((prev) => !prev)}
              >
                <SlidersHorizontal size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
                篩選
              </Button>
              <Button type="submit" variant="primary">
                搜尋
              </Button>
            </div>
          </form>
        </Card>

        {showFilters && (
          <Card className="slide-up" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-lg)',
                paddingBottom: 'var(--spacing-md)',
                borderBottom: '2px solid var(--gray-200)'
              }}
            >
              <h4 className="text-h4" style={{ color: 'var(--primary-purple)' }}>
                進階篩選
              </h4>
              <button
                type="button"
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 'var(--spacing-md)'
              }}
            >
              <Select
                label="情緒"
                name="emotion"
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                options={[
                  { value: '', label: '全部' },
                  ...EMOTIONS.map((item) => ({ value: item, label: item }))
                ]}
              />

              <Select
                label="天氣"
                name="weather"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                options={[
                  { value: '', label: '全部' },
                  ...WEATHERS.map((item) => ({ value: item, label: item }))
                ]}
              />

              <Input
                type="date"
                name="dateFrom"
                label="開始日期"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />

              <Input
                type="date"
                name="dateTo"
                label="結束日期"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />

              <Select
                label="排序方式"
                name="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={SORT_OPTIONS}
              />
            </div>

            <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="button" variant="ghost" onClick={clearSearchFilters}>
                清除篩選
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="posts-container">
        {filteredPosts.length === 0 ? (
          <div className="empty-state">
            <h3>找不到符合條件的日記</h3>
            <p>試試不同的關鍵字或篩選條件</p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const friend = isFriend(post.user_id)
            const mutual = isMutual(post.user_id)
            const followLoading = isFollowLoading(post.user_id)
            const mediaImages = getImagesFromMedia(post.media)

            return (
              <article
                key={post.diary_id}
                className="post-card"
                role="link"
                tabIndex={0}
                aria-label={`開啟 ${post.title || '日記'} 詳細內容`}
                onClick={(event) => handleCardClick(event, post.diary_id)}
                onKeyDown={(event) => handleCardKeyDown(event, post.diary_id)}
              >
                <div className="post-header">
                  <div className="author-info">
                    <Link
                      to={`/users/${post.user_id}`}
                      className="author-avatar-link"
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        className="author-avatar"
                        style={{
                          backgroundImage: post.avatar_url ? `url(${ensureAbsoluteUrl(post.avatar_url)})` : 'none',
                          backgroundColor: post.avatar_url ? 'transparent' : '#E0E0E0'
                        }}
                      />
                    </Link>
                    <div className="author-details">
                      <Link
                        to={`/users/${post.user_id}`}
                        className="author-name-link"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <h3 className="author-name">{post.username || '匿名用戶'}</h3>
                      </Link>
                      <span className="post-date">
                        {new Date(post.created_at).toLocaleDateString('zh-TW')}
                      </span>
                    </div>
                  </div>
                  {user && user.user_id !== post.user_id && (
                    <button
                      type="button"
                      className={`follow-btn ${mutual ? 'is-mutual' :
                        friend ? 'is-friend' : ''
                        }`}
                      onClick={() => handleToggleFollow(post.user_id, post.username)}
                      disabled={followLoading}
                      aria-busy={followLoading}
                    >
                      {mutual ? (
                        <>
                          <Users size={16} />
                          互相追蹤
                        </>
                      ) : friend ? (
                        <>
                          <UserCheck size={16} />
                          已追蹤
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          追蹤
                        </>
                      )}
                    </button>
                  )}
                  {user && user.user_id === post.user_id && (
                    <div className="post-owner-actions">
                      <button
                        type="button"
                        className="owner-action-btn"
                        onClick={(event) => handleEditDiary(event, post.diary_id)}
                        aria-label="編輯日記"
                      >
                        <PencilLine size={18} />
                      </button>
                      <button
                        type="button"
                        className="owner-action-btn owner-action-delete"
                        onClick={(event) => handleDeleteDiary(event, post.diary_id)}
                        aria-label="刪除日記"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="post-content" role="presentation">
                  <Link
                    to={`/diaries/${post.diary_id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <h3 className="post-title">{post.title || '(未命名)'}</h3>
                  </Link>

                  {/* 標籤 */}
                  {post.tags && post.tags.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginBottom: '12px'
                    }}>
                      {post.tags.filter(t => t.tag_type === 'emotion').slice(0, 2).map((t, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '3px 10px',
                            background: 'var(--emotion-pink)',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'var(--dark-purple)'
                          }}
                        >
                          {t.tag_value}
                        </span>
                      ))}
                      {post.tags.find(t => t.tag_type === 'weather') && (
                        <span
                          style={{
                            padding: '3px 10px',
                            background: '#B2EBF2',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: '#006064'
                          }}
                        >
                          {post.tags.find(t => t.tag_type === 'weather').tag_value}
                        </span>
                      )}
                      {post.tags.filter(t => t.tag_type === 'keyword').slice(0, 3).map((t, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '3px 10px',
                            background: 'var(--gray-200)',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            color: 'var(--gray-700)'
                          }}
                        >
                          #{t.tag_value}
                        </span>
                      ))}
                    </div>
                  )}

                  {post.content && <p>{post.content}</p>}

                  {mediaImages.length > 0 && (
                    <div className="post-media-grid">
                      {mediaImages.map((image, idx) => (
                        <img
                          key={image.key || idx}
                          src={image.url}
                          alt={image.alt || `${post.username || '用戶'} 的日記圖片 ${idx + 1}`}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className="post-footer"
                  role="presentation"
                  onClick={(event) => {
                    event.stopPropagation()
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
                  }}
                >
                  <button
                    type="button"
                    className={`post-action ${post.is_liked ? 'liked' : ''}`}
                    onClick={(event) => handleLike(event, post.diary_id)}
                    disabled={isLikePending(post.diary_id)}
                    aria-busy={isLikePending(post.diary_id)}
                  >
                    <Heart
                      size={20}
                      color={post.is_liked ? '#CD79D5' : undefined}
                      fill={post.is_liked ? '#CD79D5' : 'none'}
                    />
                    <span>{post.like_count || 0} 個讚</span>
                  </button>
                  <Link to={`/diaries/${post.diary_id}`} className="post-action">
                    <MessageCircle size={20} />
                    <span>{post.comment_count || 0} 則留言</span>
                  </Link>
                  <button
                    type="button"
                    className="post-action"
                    onClick={() => handleShare(post.diary_id)}
                  >
                    <Share2 size={20} />
                    <span>日記分享</span>
                  </button>
                </div>
              </article>
            )
          })
        )}

        {/* 訪客限制提示 */}
        {showGuestLimit && (
          <div className="guest-limit-notice">
            <h3>想看更多精彩內容？</h3>
            <p>註冊成為會員，探索更多朋友的日記與故事</p>
            <div className="cta-buttons">
              <Link to="/register">
                <button className="register-btn">立即註冊</button>
              </Link>
              <Link to="/login">
                <button className="login-btn">登入帳號</button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {unfollowConfirm.open && (
        <div className="user-profile-confirm-backdrop" role="presentation">
          <div
            className="user-profile-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-unfollow-confirm-title"
          >
            <h3 id="home-unfollow-confirm-title">取消追蹤</h3>
            <p>確定要取消追蹤 {unfollowConfirm.targetName || '該用戶'} 嗎？</p>
            <div className="user-profile-confirm-actions">
              <button
                type="button"
                className="confirm-cancel"
                onClick={handleCancelUnfollow}
                disabled={unfollowConfirm.targetId ? isFollowLoading(unfollowConfirm.targetId) : false}
              >
                返回
              </button>
              <button
                type="button"
                className="confirm-submit"
                onClick={handleConfirmUnfollow}
                disabled={unfollowConfirm.targetId ? isFollowLoading(unfollowConfirm.targetId) : false}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage
