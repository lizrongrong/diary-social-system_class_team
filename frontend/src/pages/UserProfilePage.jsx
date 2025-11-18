import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { BookOpen, Heart, HeartHandshake, MessageCircle, Share2, UserMinus, UserPlus, Users, PencilLine, Trash2 } from 'lucide-react'
import { diaryAPI, ensureAbsoluteUrl, followAPI, likeAPI, userAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { useToast } from '../components/ui/Toast'
import { buildTagStyle, getEmotionPalette, getWeatherPalette } from '../utils/tagPalettes'
import './UserProfilePage.css'

const formatDate = (value) => {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch (err) {
    return value
  }
}

function UserProfilePage() {
  const { userId } = useParams()
  const { user: currentUser } = useAuthStore()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ followerCount: 0, diaryCount: 0 })
  const [diaries, setDiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [followState, setFollowState] = useState({
    isFollowing: false,
    isMutual: false,
    followsYou: false,
    loading: false
  })
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false)

  const isOwnProfile = String(currentUser?.user_id) === String(userId)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const publicProfile = await userAPI.getPublicById(userId)
        if (!mounted) return

        const profileUser = publicProfile?.user || publicProfile || null
        setProfile(profileUser)
        setStats((publicProfile && (publicProfile.stats || publicProfile.stats === 0)) ? publicProfile.stats : { followerCount: 0, diaryCount: 0 })

        const diariesResponse = await diaryAPI.getUserPublicDiaries(userId)
        if (!mounted) return
        const diariesData = diariesResponse?.diaries || diariesResponse || []
        const ordered = [...diariesData].sort((a, b) => {
          const aDate = new Date(a.created_at || a.createdAt || 0)
          const bDate = new Date(b.created_at || b.createdAt || 0)
          return bDate - aDate
        })
        const normalizeDiary = (d) => {
          const likeCount = Number(d.like_count ?? d.likes ?? 0) || 0
          const commentCount = Number(d.comment_count ?? d.comments ?? 0) || 0
          return {
            ...d,
            diary_id: d.diary_id || d.id || d.diaryId || null,
            is_liked: !!d.is_liked,
            like_count: likeCount,
            likes: likeCount,
            comment_count: commentCount,
            comments: commentCount
          }
        }

        setDiaries(ordered.map(normalizeDiary))
        // Refresh each diary from server to get authoritative counts/is_liked
        try {
          const refreshed = await Promise.all(ordered.map(async (d) => {
            try {
              const server = await diaryAPI.getById(d.diary_id || d.id || d.diaryId)
              const merged = { ...(server || {}), ...(d || {}) }
              return normalizeDiary(merged)
            } catch (e) {
              return normalizeDiary(d)
            }
          }))
          if (!mounted) return
          setDiaries(refreshed)
        } catch (e) {
          console.debug('Failed to refresh diaries from server:', e)
        }
        setStats((prev) => ({
          followerCount: prev.followerCount,
          diaryCount: publicProfile?.stats?.diaryCount ?? ordered.length
        }))

        if (currentUser && String(currentUser.user_id) !== String(userId)) {
          try {
            const status = await followAPI.checkStatus(userId)
            if (!mounted) return
            setFollowState((prev) => ({
              ...prev,
              isFollowing: !!status.isFriend,
              isMutual: !!status.isMutual,
              followsYou: !!status.followsYou,
              loading: false
            }))
          } catch (statusError) {
            console.warn('Unable to fetch follow status:', statusError)
          }
        } else if (mounted) {
          setFollowState({ isFollowing: false, isMutual: false, followsYou: false, loading: false })
        }
      } catch (err) {
        if (!mounted) return
        const message = err.response?.data?.message || err.response?.data?.error || '無法載入會員資料'
        setError(message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [userId, currentUser?.user_id])

  // Listen for global like updates from other pages
  useEffect(() => {
    const handler = (e) => {
      try {
        const { diaryId, liked, count } = e.detail || {}
        if (diaryId) syncLikeState(diaryId, liked, count)
      } catch (err) {
        console.debug('UserProfile diaryLikeUpdated handler error', err)
      }
    }
    window.addEventListener('diaryLikeUpdated', handler)
    const commentHandler = (ev) => {
      try {
        const { diaryId, count } = ev.detail || {}
        if (!diaryId) return
        setDiaries(prev => {
          if (!Array.isArray(prev) || prev.length === 0) return prev
          return prev.map(item => item.diary_id === diaryId ? { ...item, comment_count: Number(count ?? item.comment_count ?? 0), comments: Number(count ?? item.comments ?? 0) } : item)
        })
      } catch (err) {
        console.debug('UserProfile diaryCommentUpdated handler error', err)
      }
    }
    window.addEventListener('diaryCommentUpdated', commentHandler)
    return () => {
      window.removeEventListener('diaryLikeUpdated', handler)
      window.removeEventListener('diaryCommentUpdated', commentHandler)
    }
  }, [diaries])

  const avatarUrl = useMemo(() => ensureAbsoluteUrl(profile?.profile_image), [profile?.profile_image])
  const initials = useMemo(() => (profile?.username || 'U').charAt(0).toUpperCase(), [profile?.username])
  const displayName = useMemo(() => {
    if (!profile) return ''
    return (profile.display_name && profile.display_name.trim()) || profile.username || ''
  }, [profile])
  const userHandle = useMemo(() => (profile?.username ? `@${profile.username}` : ''), [profile?.username])
  const profileBio = useMemo(() => {
    if (!profile) return ''
    return profile.signature || profile.bio || profile.introduction || profile.self_intro || ''
  }, [profile])

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, diaryId: null, diaryTitle: '' })
  const [deletePending, setDeletePending] = useState(false)
  const [likePendingIds, setLikePendingIds] = useState(() => new Set())

  const isLikePending = (diaryId) => likePendingIds.has(diaryId)

  const syncLikeState = (diaryId, liked, count) => {
    setDiaries(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev
      return prev.map((item) => {
        const itemId = item.diary_id || item.id || item.diaryId || null
        if (String(itemId) !== String(diaryId)) return item
        const baseCount = Number(item.like_count ?? item.likes ?? 0) || 0
        let nextCount = baseCount

        if (typeof count === 'number' && Number.isFinite(count)) {
          nextCount = count
        } else if (liked !== undefined) {
          if (liked && !item.is_liked) nextCount = baseCount + 1
          else if (!liked && item.is_liked) nextCount = Math.max(0, baseCount - 1)
        }

        return {
          ...item,
          is_liked: !!liked,
          like_count: nextCount,
          likes: nextCount,
          comment_count: Number(item.comment_count ?? item.comments ?? 0) || 0,
          comments: Number(item.comment_count ?? item.comments ?? 0) || 0
        }
      })
    })
  }

  const handleLike = async (event, diaryId) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (!currentUser) {
      addToast('請先登入後再按讚', 'warning')
      return
    }

    if (!diaryId || isLikePending(diaryId)) return

    const currentItem = Array.isArray(diaries) ? diaries.find(d => String(d.diary_id || d.id || d.diaryId) === String(diaryId)) : null
    if (!currentItem) return

    const prevLiked = Boolean(currentItem.is_liked)
    const prevCount = Number(currentItem.like_count || currentItem.likes || 0) || 0
    console.debug('[UserProfile] handleLike start', { diaryId, prevLiked, prevCount })

    setLikePendingIds(prev => {
      const next = new Set(prev)
      next.add(diaryId)
      return next
    })

    // optimistic update
    syncLikeState(diaryId, !prevLiked, NaN)
    console.debug('[UserProfile] optimistic toggle', { diaryId, optimisticLiked: !prevLiked })

    try {
      const resp = await likeAPI.toggle('diary', diaryId)
      const serverLiked = Boolean(resp?.liked)
      const rawCount = Number(resp?.count)
      const serverCount = Number.isFinite(rawCount) ? rawCount : NaN
      console.debug('[UserProfile] server response', { diaryId, serverLiked, serverCount, resp })
      syncLikeState(diaryId, serverLiked, serverCount)
      // Broadcast like update so other pages can sync
      try {
        window.dispatchEvent(new CustomEvent('diaryLikeUpdated', { detail: { diaryId, liked: serverLiked, count: serverCount } }))
      } catch (e) {
        console.debug('Failed to dispatch diaryLikeUpdated event', e)
      }
    } catch (err) {
      console.error('Error toggling like:', err)
      addToast(err?.response?.data?.message || '按讚失敗', 'error')
      // revert
      console.debug('[UserProfile] revert to previous state', { diaryId, prevLiked, prevCount })
      syncLikeState(diaryId, prevLiked, prevCount)
    } finally {
      setLikePendingIds(prev => {
        const next = new Set(prev)
        next.delete(diaryId)
        return next
      })
    }
  }

  const handleLikeClick = async (event, diaryId) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    return handleLike(event, diaryId)
  }

  const handleShareClick = (event, diaryId) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    return handleShare(diaryId)
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

  const handleEditDiary = (event, diaryId) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (!diaryId) return
    navigate(`/diaries/${diaryId}/edit`)
  }

  const handleDeleteDiary = (event, diary) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (!diary || !diary.diary_id) return
    const title = diary.title && diary.title.trim() ? diary.title : '(未命名)'
    setDeleteConfirm({ open: true, diaryId: diary.diary_id, diaryTitle: title })
  }

  const handleCancelDeleteDiary = () => {
    if (deletePending) return
    setDeleteConfirm({ open: false, diaryId: null, diaryTitle: '' })
  }

  const handleConfirmDeleteDiary = async () => {
    if (!deleteConfirm.diaryId) return
    setDeletePending(true)
    try {
      await diaryAPI.delete(deleteConfirm.diaryId)
      addToast('日記已刪除', 'success')
      setDiaries(prev => (Array.isArray(prev) ? prev.filter(d => d.diary_id !== deleteConfirm.diaryId) : []))
      setDeleteConfirm({ open: false, diaryId: null, diaryTitle: '' })
    } catch (err) {
      console.error('刪除日記失敗', err)
      addToast(err?.response?.data?.message || '刪除失敗', 'error')
    } finally {
      setDeletePending(false)
    }
  }

  const handleShare = async (diaryId) => {
    const shareUrl = `${window.location.origin}/diaries/${diaryId}`
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        addToast('連結已複製', 'success')
      } else {
        window.prompt('請複製連結', shareUrl)
      }
    } catch (err) {
      console.error('Copy share url failed:', err)
      addToast('複製連結失敗', 'error')
    }
  }

  const followUser = async () => {
    setFollowState((prev) => ({ ...prev, loading: true }))
    try {
      await followAPI.add(userId)
      setFollowState((prev) => ({
        ...prev,
        isFollowing: true,
        isMutual: prev.followsYou || prev.isMutual,
        loading: false
      }))
      setStats((prev) => ({
        ...prev,
        followerCount: prev.followerCount + 1
      }))
    } catch (err) {
      console.error('Follow failed:', err)
      alert('操作失敗：' + (err.response?.data?.message || err.message))
      setFollowState((prev) => ({ ...prev, loading: false }))
    }
  }

  const unfollowUser = async () => {
    setFollowState((prev) => ({ ...prev, loading: true }))
    try {
      await followAPI.remove(userId)
      setFollowState((prev) => ({
        ...prev,
        isFollowing: false,
        isMutual: false,
        loading: false
      }))
      setStats((prev) => ({
        ...prev,
        followerCount: Math.max(0, prev.followerCount - 1)
      }))
    } catch (err) {
      console.error('Unfollow failed:', err)
      alert('操作失敗：' + (err.response?.data?.message || err.message))
      setFollowState((prev) => ({ ...prev, loading: false }))
    } finally {
      setShowUnfollowConfirm(false)
    }
  }

  const handleToggleFollow = () => {
    if (!currentUser) {
      alert('請先登入後再追蹤其他會員')
      return
    }
    if (!profile) return

    if (followState.isFollowing) {
      setShowUnfollowConfirm(true)
      return
    }

    followUser()
  }

  const handleConfirmUnfollow = () => {
    unfollowUser()
  }

  const handleCancelUnfollow = () => {
    if (followState.loading) return
    setShowUnfollowConfirm(false)
  }

  if (loading) {
    return (
      <div className="user-profile-page loading">
        <div className="user-profile-loading">載入中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="user-profile-page error">
        <div className="user-profile-error">{error}</div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="user-profile-page">
      <section className="user-profile-hero">
        <div className="user-profile-metrics">
          <div className="user-profile-metric">
            <Users size={18} />
            <span>追蹤數 {stats.followerCount} 人</span>
          </div>
          <div className="user-profile-metric">
            <BookOpen size={18} />
            <span>日記數 {stats.diaryCount} 篇</span>
          </div>
        </div>

        <div className="user-profile-banner">
          <div className="user-profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${displayName || profile.username} 的大頭貼`} />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="user-profile-banner-body">
            <h1 className="user-profile-display-name">{displayName}</h1>
            {userHandle && <p className="user-profile-username">{userHandle}</p>}
            {profileBio && <p className="user-profile-bio">{profileBio}</p>}

            {!isOwnProfile && (
              <button
                type="button"
                className={`user-profile-follow-btn ${followState.isFollowing ? 'is-following' : ''}`}
                onClick={handleToggleFollow}
                disabled={followState.loading}
              >
                {followState.isFollowing ? (
                  followState.isMutual ? (
                    <>
                      <HeartHandshake size={16} />
                      互相追蹤
                    </>
                  ) : (
                    <>
                      <UserMinus size={16} />
                      已追蹤
                    </>
                  )
                ) : (
                  <>
                    <UserPlus size={16} />
                    追蹤
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="user-profile-diaries">
        {diaries.length === 0 ? (
          <div className="user-profile-empty">
            <p>{isOwnProfile ? '還沒有公開日記，開始分享你的故事吧！' : '這位會員尚未發佈公開日記。'}</p>
          </div>
        ) : (
          <div className="user-profile-diary-list">
            {diaries.map((diary, index) => {
              const diaryAvatar = ensureAbsoluteUrl(diary.avatar_url) || avatarUrl
              const diaryDate = formatDate(diary.created_at || diary.createdAt)
              const tags = Array.isArray(diary.tags) ? diary.tags : []
              const emotionTags = tags.filter((tag) => tag.tag_type === 'emotion')
              const weatherTag = tags.find((tag) => tag.tag_type === 'weather')
              const keywordTags = tags.filter((tag) => tag.tag_type === 'keyword')
              const likeCount = diary.like_count ?? diary.likes ?? 0
              const commentCount = diary.comment_count ?? diary.comments ?? 0
              const diaryOwnerName = diary.username || displayName || profile.username

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
                    <div className="diary-author">
                        <Link
                          to={diary.user_id ? `/users/${diary.user_id}` : '#'}
                          className="diary-author-avatar-link"
                          style={{ textDecoration: 'none' }}
                          onClick={(event) => { if (!diary.user_id) event.preventDefault(); event.stopPropagation() }}
                        >
                          <div className="diary-author-avatar">
                            {diaryAvatar ? (
                              <img src={diaryAvatar} alt={`${diaryOwnerName} 的大頭貼`} />
                            ) : (
                              <span>{(diaryOwnerName || 'U').charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        </Link>
                        <div className="diary-author-details">
                          <Link to={diary.user_id ? `/users/${diary.user_id}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }} onClick={(event) => { if (!diary.user_id) event.preventDefault(); event.stopPropagation() }}>
                            <h3 className="diary-author-name">{diaryOwnerName}</h3>
                          </Link>
                          <span className="diary-post-date">{diaryDate}</span>
                        </div>
                    </div>
                    {isOwnProfile && (
                      <div className="post-owner-actions" style={{ marginLeft: 'auto' }}>
                        <button
                          type="button"
                          className="owner-action-btn"
                          onClick={(event) => handleEditDiary(event, diary.diary_id)}
                          aria-label="編輯日記"
                        >
                          <PencilLine size={18} />
                        </button>
                        <button
                          type="button"
                          className="owner-action-btn owner-action-delete"
                          onClick={(event) => handleDeleteDiary(event, diary)}
                          aria-label="刪除日記"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </header>

                  <div className="diary-card-body">
                    <Link
                      to={`/diaries/${diary.diary_id}`}
                      className="diary-card-title"
                    >
                      {diary.title || '未命名日記'}
                    </Link>

                    {(emotionTags.length > 0 || weatherTag || keywordTags.length > 0) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                        {emotionTags.slice(0, 3).map((tag, tagIndex) => (
                          <span
                            key={`emotion-${tagIndex}`}
                            style={{
                              ...buildTagStyle(getEmotionPalette(tag.tag_value)),
                              padding: '2px 8px',
                              color: '#FFFFFF',
                              borderRadius: '999px',
                              fontSize: '0.8125rem'
                            }}
                          >
                            {tag.tag_value}
                          </span>
                        ))}
                        {weatherTag && (
                          <span
                            style={{
                              ...buildTagStyle(getWeatherPalette(weatherTag.tag_value)),
                              padding: '2px 8px',
                              color: '#FFFFFF',
                              borderRadius: '999px',
                              fontSize: '0.8125rem'
                            }}
                          >
                            {weatherTag.tag_value}
                          </span>
                        )}
                        {keywordTags.slice(0, 3).map((tag, tagIndex) => (
                          <span
                            key={`keyword-${tagIndex}`}
                            style={{
                              padding: '2px 8px',
                              background: 'var(--gray-200)',
                              borderRadius: '999px',
                              fontSize: '0.8125rem',
                              color: 'var(--gray-700)'
                            }}
                          >
                            #{tag.tag_value}
                          </span>
                        ))}
                      </div>
                    )}

                    {diary.content && (
                      <p className="diary-card-content">{diary.content}</p>
                    )}
                  </div>

                  <div
                    className="post-footer"
                    role="presentation"
                    onClick={(event) => { event.stopPropagation() }}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') event.stopPropagation() }}
                  >
                    <button
                      type="button"
                      className={`post-action ${diary.is_liked ? 'liked' : ''}`}
                      onClick={(event) => handleLike(event, diary.diary_id)}
                      disabled={isLikePending(diary.diary_id)}
                      aria-busy={isLikePending(diary.diary_id)}
                    >
                      <Heart
                        size={20}
                        color={diary.is_liked ? '#CD79D5' : undefined}
                        fill={diary.is_liked ? '#CD79D5' : 'none'}
                      />
                      <span>{likeCount} 個讚</span>
                    </button>
                    <Link to={`/diaries/${diary.diary_id}`} className="post-action">
                      <MessageCircle size={20} />
                      <span>{commentCount} 則留言</span>
                    </Link>
                    <button
                      type="button"
                      className="post-action"
                      onClick={() => handleShare(diary.diary_id)}
                    >
                      <Share2 size={20} />
                      <span>日記分享</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {showUnfollowConfirm && (
        <div className="user-profile-confirm-backdrop" role="presentation">
          <div
            className="user-profile-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-profile-confirm-title"
          >
            <h3 id="user-profile-confirm-title">取消追蹤</h3>
            <p>
              確定要取消追蹤 {displayName || profile.username} 嗎？
            </p>
            <div className="user-profile-confirm-actions">
              <button type="button" className="confirm-cancel" onClick={handleCancelUnfollow}>
                返回
              </button>
              <button
                type="button"
                className="confirm-submit"
                onClick={handleConfirmUnfollow}
                disabled={followState.loading}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm.open && (
        <div
          className="home-delete-confirm-backdrop"
          role="presentation"
          onClick={handleCancelDeleteDiary}
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
            <p id="home-delete-confirm-description" className="home-delete-confirm-text">
              確定要刪除「{deleteConfirm.diaryTitle || '這篇日記'}」嗎？此動作無法復原。
            </p>
            <div className="home-delete-confirm-actions">
              <button
                type="button"
                className="home-delete-confirm-btn secondary"
                onClick={handleCancelDeleteDiary}
                disabled={deletePending}
              >
                取消
              </button>
              <button
                type="button"
                className="home-delete-confirm-btn danger"
                onClick={handleConfirmDeleteDiary}
                disabled={deletePending}
              >
                {deletePending ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserProfilePage
