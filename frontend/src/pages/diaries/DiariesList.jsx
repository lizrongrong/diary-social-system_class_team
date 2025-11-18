import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { diaryAPI, ensureAbsoluteUrl, likeAPI } from '../../services/api'
import useAuthStore from '../../store/authStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Heart, MessageCircle, Share2, PencilLine, Trash2, Eye, EyeOff, PenTool } from 'lucide-react'
import { useToast } from '../../components/ui/Toast'
import { buildTagStyle, getEmotionPalette, getWeatherPalette } from '../../utils/tagPalettes'
import '../HomePage.css'
import './DiariesList.css'

const normalizeMediaArray = (media) => {
  if (!media) return []
  if (Array.isArray(media)) return media
  if (typeof media === 'string') {
    try {
      const parsed = JSON.parse(media)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.warn('無法解析日記附件資料:', error)
      return []
    }
  }
  return []
}

const collectDiaryMedia = (diary) => {
  if (!diary || typeof diary !== 'object') return []
  const candidateKeys = ['media', 'media_items', 'mediaItems', 'attachments', 'images', 'files']

  return candidateKeys.reduce((accumulator, key) => {
    if (Object.prototype.hasOwnProperty.call(diary, key)) {
      const normalized = normalizeMediaArray(diary[key])
      if (normalized.length) {
        accumulator.push(...normalized)
      }
    }
    return accumulator
  }, [])
}

const getImageMediaForDiary = (diary) => {
  const allMedia = collectDiaryMedia(diary)

  const unique = []
  const seen = new Set()

  allMedia
    .map((item) => (typeof item === 'string' ? { file_url: item } : item))
    .filter((item) => {
      const type = (item?.file_type || item?.type || '').toLowerCase()
      if (type && type.startsWith('image')) return true
      const url = item?.file_url || item?.url || ''
      return /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(url)
    })
    .forEach((item, index) => {
      const url = ensureAbsoluteUrl(item.file_url || item.url || '')
      if (!url || seen.has(url)) return
      seen.add(url)
      unique.push({
        key: item.media_id || item.id || `${url}-${index}`,
        url,
        alt: item.alt || item.description || ''
      })
    })

  return unique
}

function DiariesList() {
  const { user } = useAuthStore()
  const [diaries, setDiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // all, public, private, draft
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [likePendingIds, setLikePendingIds] = useState(() => new Set())

  useEffect(() => {
    loadDiaries()
  }, [])

  const loadDiaries = async () => {
    setLoading(true)
    try {
      // 獲取所有日記（不限狀態）
      const data = await diaryAPI.getAll({ limit: 100 })
      const source = data?.items || data?.diaries || data || []
      const normalized = (Array.isArray(source) ? source : []).map((item) => ({
        ...item,
        like_count: Number(item?.like_count) || 0,
        comment_count: Number(item?.comment_count) || 0,
        is_liked: Boolean(item?.is_liked)
      }))
      setDiaries(normalized)
      setLikePendingIds(new Set())
    } catch (e) {
      setError(e.response?.data?.message || '無法取得日記列表')
    } finally {
      setLoading(false)
    }
  }

  const isLikePending = (diaryId) => likePendingIds.has(diaryId)

  const syncDiaryLikeState = (diaryId, liked, count) => {
    setDiaries(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev
      return prev.map((entry) => {
        const entryId = entry.diary_id || entry.id || entry.diaryId || null
        if (String(entryId) !== String(diaryId)) return entry
        const baseCount = Number(entry.like_count) || 0
        let nextCount = baseCount

        if (typeof count === 'number' && Number.isFinite(count)) {
          nextCount = Math.max(0, Math.round(count))
        } else if (typeof liked === 'boolean') {
          if (liked && !entry.is_liked) nextCount = baseCount + 1
          if (!liked && entry.is_liked) nextCount = Math.max(0, baseCount - 1)
        }

        return {
          ...entry,
          is_liked: typeof liked === 'boolean' ? liked : entry.is_liked,
          like_count: nextCount
        }
      })
    })
  }

  const handleToggleLike = async (event, diaryId) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!diaryId || isLikePending(diaryId)) return

    if (!user) {
      addToast('請先登入', 'warning')
      return
    }

    const currentDiary = (Array.isArray(diaries) ? diaries : []).find(
      (entry) => String(entry.diary_id || entry.id || entry.diaryId) === String(diaryId)
    )

    if (!currentDiary) {
      console.warn('找不到指定日記，無法處理按讚：', diaryId)
      return
    }

    const previousLiked = Boolean(currentDiary.is_liked)
    const previousCount = Number(currentDiary.like_count) || 0

    setLikePendingIds(prev => {
      const next = new Set(prev)
      next.add(diaryId)
      return next
    })

    // Optimistic update for responsiveness
    syncDiaryLikeState(diaryId, !previousLiked, NaN)

    try {
      const response = await likeAPI.toggle('diary', diaryId)
      const serverLiked = Boolean(response?.liked)
      const rawCount = Number(response?.count)
      const serverCount = Number.isFinite(rawCount) ? rawCount : NaN
      syncDiaryLikeState(diaryId, serverLiked, serverCount)
      // Broadcast like update so other pages can sync
      try {
        window.dispatchEvent(new CustomEvent('diaryLikeUpdated', { detail: { diaryId, liked: serverLiked, count: serverCount } }))
      } catch (e) {
        console.debug('Failed to dispatch diaryLikeUpdated event', e)
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || '按讚失敗'
      addToast(message, 'error')
      syncDiaryLikeState(diaryId, previousLiked, previousCount)
    } finally {
      setLikePendingIds(prev => {
        const next = new Set(prev)
        next.delete(diaryId)
        return next
      })
    }
  }

  // Listen for global like updates from other pages
  useEffect(() => {
    const handler = (e) => {
      try {
        const { diaryId, liked, count } = e.detail || {}
        if (diaryId) syncDiaryLikeState(diaryId, liked, count)
      } catch (err) {
        console.debug('DiariesList diaryLikeUpdated handler error', err)
      }
    }
    window.addEventListener('diaryLikeUpdated', handler)
    const commentHandler = (ev) => {
      try {
        const { diaryId, count } = ev.detail || {}
        if (!diaryId) return
        setDiaries(prev => {
          if (!Array.isArray(prev) || prev.length === 0) return prev
          return prev.map(entry => {
            const entryId = entry.diary_id || entry.id
            if (entryId !== diaryId) return entry
            return { ...entry, comment_count: Number(count ?? entry.comment_count ?? 0), comments: Number(count ?? entry.comments ?? 0) }
          })
        })
      } catch (err) {
        console.debug('DiariesList diaryCommentUpdated handler error', err)
      }
    }
    window.addEventListener('diaryCommentUpdated', commentHandler)
    return () => {
      window.removeEventListener('diaryLikeUpdated', handler)
      window.removeEventListener('diaryCommentUpdated', commentHandler)
    }
  }, [diaries])

  const handleDelete = async (event, diaryId) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!window.confirm('確定要刪除這篇日記嗎？')) return

    try {
      await diaryAPI.delete(diaryId)
      setDiaries(prev => prev.filter(d => (d.diary_id || d.id) !== diaryId))
      addToast('日記已刪除', 'success')
    } catch (e) {
      const message = e.response?.data?.message || e.message || '刪除失敗'
      addToast(message, 'error')
    }
  }

  const handleEdit = (event, diaryId) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    navigate(`/diaries/${diaryId}/edit`)
  }

  const handleShare = (event, diaryId) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    const shareUrl = `${window.location.origin}/diaries/${diaryId}`

    const fallbackCopy = () => {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = shareUrl
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (successful) {
          addToast('連結已複製', 'success')
        } else {
          addToast('複製連結失敗', 'error')
        }
      } catch (err) {
        addToast('複製連結失敗', 'error')
      }
    }

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => addToast('連結已複製', 'success'))
        .catch(() => fallbackCopy())
    } else {
      fallbackCopy()
    }
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

  const filteredDiaries = diaries.filter(d => {
    if (filter === 'public') return d.visibility === 'public'
    if (filter === 'private') return d.visibility === 'private'
    if (filter === 'draft') return d.status === 'draft'
    return true
  })

  const filterTabs = [
    { key: 'all', label: '全部', count: diaries.length },
    { key: 'public', label: '公開', count: diaries.filter(d => d.visibility === 'public').length },
    { key: 'private', label: '私人', count: diaries.filter(d => d.visibility === 'private').length },
    // { key: 'draft', label: '草稿', count: diaries.filter(d => d.status === 'draft').length }
  ]

  if (loading) {
    return (
      <div className="page diaries-list-page fade-in diaries-page">
        <div className="skeleton" style={{ width: '100%', height: 400, borderRadius: 'var(--radius-lg)' }}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page diaries-list-page fade-in diaries-page">
        <Card className="diaries-empty-card">
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
    <div className="page diaries-list-page fade-in diaries-page">
      <div className="diaries-header">
        <div>
          <h2 className="text-h2 diaries-title">我的日記</h2>
          <p className="text-body diaries-subtitle">共 {diaries.length} 篇日記</p>
        </div>
        <Link to="/diaries/new" style={{ textDecoration: 'none' }}>
          <Button variant="primary" size="large" className="diaries-new-button">
            <PenTool size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
            寫新日記
          </Button>
        </Link>
      </div>

      <div className="diaries-tabs">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`diaries-tab ${filter === tab.key ? 'is-active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {filteredDiaries.length === 0 ? (
        <Card className="diaries-empty-card">
          <div className="diaries-empty-content">
            <div className="diaries-empty-emoji" aria-hidden="true">📝</div>
            <h3 className="diaries-empty-title">
              {filter === 'all' && '還沒有日記'}
              {filter === 'public' && '還沒有公開日記'}
              {filter === 'private' && '還沒有私人日記'}
              {filter === 'draft' && '還沒有草稿日記'}
            </h3>
            <p className="diaries-empty-subtitle">開始記錄你的生活點滴吧！</p>
            <Link to="/diaries/new" style={{ textDecoration: 'none' }}>
              <Button variant="primary">寫第一篇日記</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="posts-container diaries-posts-container">
          {filteredDiaries.map((diary) => {
            const diaryId = diary.diary_id || diary.id
            const mediaImages = getImageMediaForDiary(diary)
            const createdAt = diary.created_at || diary.createdAt
            const displayDate = createdAt
              ? new Date(createdAt).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
              : ''
            const authorName = diary.username || user?.username || '我'
            const avatarUrl = diary.avatar_url || user?.profile_image
            const authorInitial = authorName.charAt(0).toUpperCase()
            const profileLink = user?.user_id ? `/users/${user.user_id}` : '#'
            const tags = Array.isArray(diary.tags) ? diary.tags : []
            const emotionTags = tags.filter(t => t.tag_type === 'emotion').slice(0, 3)
            const weatherTag = tags.find(t => t.tag_type === 'weather')
            const keywordTags = tags.filter(t => t.tag_type === 'keyword').slice(0, 3)

            return (
              <article
                key={diaryId}
                className="post-card"
                role="link"
                tabIndex={0}
                aria-label={`開啟 ${diary.title || '日記'} 詳細內容`}
                onClick={(event) => handleCardClick(event, diaryId)}
                onKeyDown={(event) => handleCardKeyDown(event, diaryId)}
              >
                <div className="post-header">
                  <div className="author-info">
                    <Link
                      to={profileLink}
                      className="author-avatar-link"
                      style={{ textDecoration: 'none' }}
                      onClick={(event) => {
                        if (profileLink === '#') {
                          event.preventDefault()
                        }
                        event.stopPropagation()
                      }}
                    >
                      <div
                        className="author-avatar"
                        style={{
                          backgroundImage: avatarUrl ? `url(${ensureAbsoluteUrl(avatarUrl)})` : 'none',
                          backgroundColor: avatarUrl ? 'transparent' : 'var(--gray-200)',
                          display: avatarUrl ? 'block' : 'flex',
                          alignItems: avatarUrl ? undefined : 'center',
                          justifyContent: avatarUrl ? undefined : 'center',
                          color: avatarUrl ? 'transparent' : 'var(--primary-purple)',
                          fontWeight: avatarUrl ? undefined : 700,
                          fontSize: avatarUrl ? undefined : '1rem'
                        }}
                      >
                        {!avatarUrl && authorInitial}
                      </div>
                    </Link>
                    <div className="author-details">
                      <h3 className="author-name">{authorName}</h3>
                      <div className="diaries-meta">
                        {displayDate && <span className="post-date">{displayDate}</span>}
                        {diary.status === 'draft' && (
                          <span className="diary-badge diary-badge--draft">草稿</span>
                        )}
                        <span className={`diary-badge ${diary.visibility === 'public' ? 'diary-badge--public' : 'diary-badge--private'}`}>
                          {diary.visibility === 'public' ? <Eye size={14} /> : <EyeOff size={14} />}
                          {diary.visibility === 'public' ? '公開' : '私人'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="post-owner-actions">
                    <button
                      type="button"
                      className="owner-action-btn"
                      onClick={(event) => handleEdit(event, diaryId)}
                      aria-label="編輯日記"
                    >
                      <PencilLine size={18} />
                    </button>
                    <button
                      type="button"
                      className="owner-action-btn owner-action-delete"
                      onClick={(event) => handleDelete(event, diaryId)}
                      aria-label="刪除日記"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="post-content" role="presentation">
                  <Link
                    to={`/diaries/${diaryId}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <h3 className="post-title">{diary.title || '(未命名)'}</h3>
                  </Link>

                  {tags.length > 0 && (
                    <div className="diaries-tags">
                      {emotionTags.map((t, i) => {
                        const palette = getEmotionPalette(t.tag_value)
                        const tagStyle = {
                          ...buildTagStyle(palette),
                          color: '#FFFFFF'
                        }
                        return (
                          <span
                            key={`emotion-${i}`}
                            className="diaries-tag diaries-tag--emotion"
                            style={tagStyle}
                          >
                            {t.tag_value}
                          </span>
                        )
                      })}
                      {weatherTag && (
                        <span
                          className="diaries-tag diaries-tag--weather"
                          style={{
                            ...buildTagStyle(getWeatherPalette(weatherTag.tag_value)),
                            color: '#FFFFFF'
                          }}
                        >
                          {weatherTag.tag_value}
                        </span>
                      )}
                      {keywordTags.map((t, i) => (
                        <span key={`keyword-${i}`} className="diaries-tag diaries-tag--keyword">#{t.tag_value}</span>
                      ))}
                    </div>
                  )}

                  {diary.content && <p>{diary.content}</p>}

                  {mediaImages.length > 0 && (
                    <div className="post-media-grid">
                      {mediaImages.map((image) => (
                        <img
                          key={image.key}
                          src={image.url}
                          alt={image.alt || `${authorName} 的日記圖片`}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className="post-footer"
                  role="presentation"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className={`post-action ${diary.is_liked ? 'liked' : ''}`}
                    onClick={(event) => handleToggleLike(event, diaryId)}
                    disabled={isLikePending(diaryId)}
                    aria-pressed={Boolean(diary.is_liked)}
                    aria-busy={isLikePending(diaryId)}
                  >
                    <Heart
                      size={20}
                      color={diary.is_liked ? '#CD79D5' : undefined}
                      fill={diary.is_liked ? '#CD79D5' : 'none'}
                    />
                    <span>{diary.like_count || 0} 個讚</span>
                  </button>
                  <Link
                    to={`/diaries/${diaryId}`}
                    className="post-action"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MessageCircle size={20} />
                    <span>{diary.comment_count || 0} 則留言</span>
                  </Link>
                  <button
                    type="button"
                    className="post-action"
                    onClick={(event) => handleShare(event, diaryId)}
                  >
                    <Share2 size={20} />
                    <span>複製連結</span>
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DiariesList
