import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, Heart, HeartHandshake, MessageCircle, Share2, UserMinus, UserPlus, Users } from 'lucide-react'
import { diaryAPI, ensureAbsoluteUrl, followAPI, likeAPI, userAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { useToast } from '../components/ui/Toast'
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

  const isOwnProfile = currentUser?.user_id === userId

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const publicProfile = await userAPI.getPublicById(userId)
        if (!mounted) return

        setProfile(publicProfile.user)
        setStats(publicProfile.stats || { followerCount: 0, diaryCount: 0 })

        const diariesResponse = await diaryAPI.getUserPublicDiaries(userId)
        if (!mounted) return
        const diariesData = diariesResponse?.diaries || diariesResponse || []
        const ordered = [...diariesData].sort((a, b) => {
          const aDate = new Date(a.created_at || a.createdAt || 0)
          const bDate = new Date(b.created_at || b.createdAt || 0)
          return bDate - aDate
        })
        setDiaries(ordered)
        setStats((prev) => ({
          followerCount: prev.followerCount,
          diaryCount: publicProfile.stats?.diaryCount ?? ordered.length
        }))

        if (currentUser && currentUser.user_id !== userId) {
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

  const handleLike = async (diaryId) => {
    if (!currentUser) {
      addToast('請先登入後再按讚', 'warning')
      return
    }

    try {
      await likeAPI.toggle('diary', diaryId)
      setDiaries((prev) =>
        prev.map((item) => {
          if (item.diary_id !== diaryId) return item
          const currentCount = Number.isFinite(item.like_count)
            ? item.like_count
            : Number(item.likes ?? 0)
          const isLiked = !item.is_liked
          const nextCount = isLiked ? currentCount + 1 : Math.max(0, currentCount - 1)
          return {
            ...item,
            is_liked: isLiked,
            like_count: nextCount,
            likes: nextCount
          }
        })
      )
    } catch (err) {
      console.error('Toggle like failed:', err)
      addToast('按讚失敗，請稍後再試', 'error')
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
                >
                  <header className="diary-card-header">
                    <div className="diary-author">
                      <div className="diary-author-avatar">
                        {diaryAvatar ? (
                          <img src={diaryAvatar} alt={`${diaryOwnerName} 的大頭貼`} />
                        ) : (
                          <span>{(diaryOwnerName || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="diary-author-details">
                        <h3 className="diary-author-name">{diaryOwnerName}</h3>
                        <span className="diary-post-date">{diaryDate}</span>
                      </div>
                    </div>
                  </header>

                  <div className="diary-card-body">
                    <Link
                      to={`/diaries/${diary.diary_id}`}
                      className="diary-card-title"
                    >
                      {diary.title || '未命名日記'}
                    </Link>

                    {(emotionTags.length > 0 || weatherTag || keywordTags.length > 0) && (
                      <div className="diary-card-tags">
                        {emotionTags.slice(0, 3).map((tag, tagIndex) => (
                          <span key={`emotion-${tagIndex}`} className="diary-tag diary-tag--emotion">
                            {tag.tag_value}
                          </span>
                        ))}
                        {weatherTag && (
                          <span className="diary-tag diary-tag--weather">{weatherTag.tag_value}</span>
                        )}
                        {keywordTags.slice(0, 3).map((tag, tagIndex) => (
                          <span key={`keyword-${tagIndex}`} className="diary-tag diary-tag--keyword">
                            #{tag.tag_value}
                          </span>
                        ))}
                      </div>
                    )}

                    {diary.content && (
                      <p className="diary-card-content">{diary.content}</p>
                    )}
                  </div>

                  <footer className="diary-card-footer">
                    <button
                      type="button"
                      className={`diary-card-action ${diary.is_liked ? 'is-active' : ''}`}
                      onClick={() => handleLike(diary.diary_id)}
                    >
                      <Heart size={20} fill={diary.is_liked ? '#FF9393' : 'none'} />
                      <span>{likeCount}</span>
                    </button>
                    <Link to={`/diaries/${diary.diary_id}`} className="diary-card-action">
                      <MessageCircle size={20} />
                      <span>{commentCount}</span>
                    </Link>
                    <button
                      type="button"
                      className="diary-card-action diary-card-action-share"
                      onClick={() => handleShare(diary.diary_id)}
                    >
                      <Share2 size={20} />
                      分享
                    </button>
                  </footer>
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
    </div>
  )
}

export default UserProfilePage
