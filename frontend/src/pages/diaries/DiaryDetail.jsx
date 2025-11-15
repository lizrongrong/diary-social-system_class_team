import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { diaryAPI, ensureAbsoluteUrl } from '../../services/api'
import { Heart, MessageCircle, Send, ArrowLeft, PencilLine, Trash2 } from 'lucide-react'
import likeAPI from '../../services/likeAPI'
import commentAPI from '../../services/commentAPI'
import useAuthStore from '../../store/authStore'
import GuestModal from '../../components/ui/GuestModal'
import { useToast } from '../../components/ui/Toast'
import './DiaryDetail.css'

function DiaryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToast } = useToast()
  const [diary, setDiary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Guest restriction (10 seconds blur)
  const [guestTimer, setGuestTimer] = useState(10)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [isBlurred, setIsBlurred] = useState(false)

  // Social states
  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [comments, setComments] = useState([])
  const [commentInput, setCommentInput] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [expandedReplies, setExpandedReplies] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const commentInputRef = useRef(null)
  const replyInputRef = useRef(null)
  const REPLY_COLLAPSE_LIMIT = 2

  const formatComments = (items) => {
    return (Array.isArray(items) ? items : []).map(comment => ({
      ...comment,
      replies: Array.isArray(comment.replies)
        ? comment.replies.map(reply => ({
          ...reply,
          parent_username: comment.username
        }))
        : []
    }))
  }

  // Guest timer countdown
  useEffect(() => {
    if (!user && diary && diary.visibility === 'public') {
      const timer = setInterval(() => {
        setGuestTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            setIsBlurred(true)
            setShowGuestModal(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [user, diary])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await diaryAPI.getById(id)
        const diaryData = data?.diary || data?.item || data
        if (!diaryData) throw new Error('找不到日記資料')
        setDiary(diaryData)
        setLikeCount(diaryData.like_count || 0)
        setIsLiked(diaryData.is_liked || false)

        const commentsData = await commentAPI.getComments(id)
        const rawComments = commentsData?.comments || commentsData || []
        setComments(formatComments(rawComments))
      } catch (e) {
        console.error('DiaryDetail load error:', e)
        setError(e.response?.data?.message || e.message || '找不到這篇日記或沒有權限')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleLike = async () => {
    if (!user) {
      setShowGuestModal(true)
      return
    }
    try {
      const result = await likeAPI.toggleLike('diary', id)
      setIsLiked(result.liked)
      setLikeCount(result.count)
    } catch (e) {
      console.error('Like error:', e)
    }
  }

  const handleEditDiary = (event) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    navigate(`/diaries/${id}/edit`)
  }

  const handleDeleteDiary = (event) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (deleting) return

    setShowDeleteConfirm(true)
  }

  const handleCancelDeleteDiary = () => {
    if (deleting) return
    setShowDeleteConfirm(false)
  }

  const handleConfirmDeleteDiary = async () => {
    if (deleting) return

    try {
      setDeleting(true)
      await diaryAPI.delete(id)
      setShowDeleteConfirm(false)
      addToast('日記已刪除', 'success')
      window.dispatchEvent(new Event('homepageRefresh'))
      navigate('/')
    } catch (e) {
      const message = e.response?.data?.message || e.message || '刪除失敗'
      addToast(message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const getInitial = (value) => {
    if (!value || typeof value !== 'string') return '用'
    const trimmed = value.trim()
    if (!trimmed) return '用'
    return trimmed[0].toUpperCase()
  }

  const handleCommentButtonClick = () => {
    if (!user) {
      setShowGuestModal(true)
      return
    }

    if (commentInputRef.current) {
      commentInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Delay focus slightly so scroll completes first
      setTimeout(() => {
        commentInputRef.current?.focus({ preventScroll: true })
      }, 200)
    }
  }

  const handleCommentSubmit = async (event) => {
    event.preventDefault()
    if (!user) {
      setShowGuestModal(true)
      return
    }

    const content = commentInput.trim()
    if (!content) {
      setCommentError('請輸入留言內容')
      return
    }

    setSubmitting(true)
    try {
      const newComment = await commentAPI.createComment(id, content, null)
      setComments(prev => [...prev, { ...newComment, replies: [] }])
      setCommentInput('')
      setCommentError('')
    } catch (e) {
      alert('留言失敗：' + (e.response?.data?.message || e.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReplyClick = (comment) => {
    if (!user) {
      setShowGuestModal(true)
      return
    }
    if (replyTo?.comment_id === comment.comment_id) {
      setReplyTo(null)
      setReplyDraft('')
      return
    }

    setReplyTo(comment)
    setReplyDraft('')

    const focusReplyInput = () => {
      replyInputRef.current?.focus()
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(focusReplyInput)
    } else {
      setTimeout(focusReplyInput, 0)
    }
  }

  const handleReplyCancel = () => {
    setReplyTo(null)
    setReplyDraft('')
  }

  const handleReplySubmit = async (event) => {
    event.preventDefault()
    if (!user) {
      setShowGuestModal(true)
      return
    }
    if (!replyTo) return

    const content = replyDraft.trim()
    if (!content) return

    setReplySubmitting(true)
    try {
      const newReply = await commentAPI.createComment(id, content, replyTo.comment_id)
      const formattedReply = {
        ...newReply,
        parent_username: replyTo.username
      }

      setComments(prev => prev.map(comment =>
        comment.comment_id === replyTo.comment_id
          ? { ...comment, replies: [...(comment.replies || []), formattedReply] }
          : comment
      ))

      setExpandedReplies(prev => ({
        ...prev,
        [replyTo.comment_id]: true
      }))

      setReplyDraft('')
      setReplyTo(null)
    } catch (e) {
      alert('回覆失敗：' + (e.response?.data?.message || e.message))
    } finally {
      setReplySubmitting(false)
    }
  }

  const handleToggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
  }

  const handleDeleteComment = async (commentId, parentId = null) => {
    if (!confirm('確定要刪除此留言？')) return

    try {
      await commentAPI.deleteComment(commentId)

      if (replyTo?.comment_id === commentId) {
        handleReplyCancel()
      }

      setExpandedReplies(prev => {
        const next = { ...prev }
        delete next[commentId]
        return next
      })

      if (parentId) {
        setComments(prev => prev.map(comment =>
          comment.comment_id === parentId
            ? {
              ...comment,
              replies: Array.isArray(comment.replies)
                ? comment.replies.filter(reply => reply.comment_id !== commentId)
                : []
            }
            : comment
        ))
      } else {
        setComments(prev => prev.filter(comment => comment.comment_id !== commentId))
      }
    } catch (e) {
      alert('刪除失敗：' + (e.response?.data?.message || e.message))
    }
  }

  const handleCommentLike = async (commentId, parentId = null) => {
    if (!user) return

    try {
      const result = await likeAPI.toggleLike('comment', commentId)

      const updateLikeStatus = (comment) =>
        comment.comment_id === commentId
          ? { ...comment, is_liked: result.liked, like_count: result.count }
          : comment

      setComments(prev => {
        if (parentId) {
          return prev.map(comment =>
            comment.comment_id === parentId
              ? {
                ...comment,
                replies: Array.isArray(comment.replies)
                  ? comment.replies.map(updateLikeStatus)
                  : []
              }
              : comment
          )
        }
        return prev.map(updateLikeStatus)
      })
    } catch (e) {
      console.error('Comment like error:', e)
    }
  }

  if (loading) return <div style={{ padding: '1rem' }}>載入中...</div>
  if (error) return <div style={{ padding: '1rem', color: 'crimson' }}>{error}</div>
  if (!diary) return null

  const emotionTags = Array.isArray(diary.tags)
    ? diary.tags.filter(tag => tag.tag_type === 'emotion')
    : []
  const weatherTag = Array.isArray(diary.tags)
    ? diary.tags.find(tag => tag.tag_type === 'weather')
    : null
  const keywordTags = Array.isArray(diary.tags)
    ? diary.tags.filter(tag => tag.tag_type === 'keyword')
    : []
  const mediaItems = Array.isArray(diary.media) ? diary.media : []
  const createdAt = new Date(diary.created_at || diary.createdAt || Date.now())
  const isOwner = Boolean(user && diary && user.user_id === diary.user_id)
  const totalCommentCount = comments.reduce((total, comment) => {
    const replyCount = Array.isArray(comment.replies) ? comment.replies.length : 0
    return total + 1 + replyCount
  }, 0)

  return (
    <div className="page diary-detail-page">
      <div className="diary-detail-container">
        <button
          type="button"
          className="diary-detail-back-btn"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} />
          返回上一頁
        </button>

        <div className="diary-detail-card">
          {!user && diary.visibility === 'public' && guestTimer > 0 && (
            <div className="diary-detail-guest-banner">
              ⏱️ 訪客預覽模式：{guestTimer} 秒後內容將模糊，請登入以查看完整內容
            </div>
          )}

          <div className="diary-detail-header">
            <div className="diary-detail-author">
              <Link
                to={`/users/${diary.user_id}`}
                className="diary-detail-author-avatar"
                style={{
                  backgroundImage: diary.avatar_url ? `url(${ensureAbsoluteUrl(diary.avatar_url)})` : 'none'
                }}
              />
              <div className="diary-detail-author-info">
                <Link to={`/users/${diary.user_id}`} className="diary-detail-author-name">
                  {diary.username || '匿名用戶'}
                </Link>
                <div style={{ display: 'flex' }}>
                  <span className="diary-detail-author-date" style={{ paddingRight: '0.5rem' }}>{createdAt.toLocaleString()}  </span>
                  <span className={`diary-detail-badge ${diary.visibility === 'public' ? 'diary-detail-badge--public' : 'diary-detail-badge--private'}`}>
                    {diary.visibility === 'public' ? '公開' : '私人'}
                  </span>
                </div>
              </div>
            </div>
            {isOwner && (
              <div className="post-owner-actions">
                <button
                  type="button"
                  className="owner-action-btn"
                  onClick={handleEditDiary}
                  aria-label="編輯日記"
                >
                  <PencilLine size={18} />
                </button>
                <button
                  type="button"
                  className="owner-action-btn owner-action-delete"
                  onClick={handleDeleteDiary}
                  aria-label="刪除日記"
                  disabled={deleting}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>

          <h2 className="diary-detail-title">{diary.title || '(未命名)'}</h2>

          <div className="diary-detail-meta">
            {diary.status === 'draft' && (
              <span className="diary-detail-badge diary-detail-badge--draft">草稿</span>
            )}

          </div>

          {diary.tags && diary.tags.length > 0 && (
            <div className="diary-detail-tags">
              {emotionTags.map((tag, index) => (
                <span key={`emotion-${index}`} className="diary-detail-tag diary-detail-tag--emotion">
                  {tag.tag_value}
                </span>
              ))}
              {weatherTag && (
                <span className="diary-detail-tag diary-detail-tag--weather">
                  {weatherTag.tag_value}
                </span>
              )}
              {keywordTags.map((tag, index) => (
                <span key={`keyword-${index}`} className="diary-detail-tag diary-detail-tag--keyword">
                  #{tag.tag_value}
                </span>
              ))}
            </div>
          )}

          <div className={`diary-detail-content ${isBlurred ? 'blur-content' : ''}`}>
            {diary.content}
          </div>

          {mediaItems.length > 0 && (
            <div className={`diary-detail-media ${isBlurred ? 'blur-content' : ''}`}>
              {mediaItems.map((mediaItem, index) => {
                const imageUrl = ensureAbsoluteUrl(mediaItem.file_url || mediaItem.url || '')
                if (!imageUrl) return null
                return (
                  <img
                    key={index}
                    src={imageUrl}
                    alt="日記附件"
                  />
                )
              })}
            </div>
          )}

          <div className="diary-detail-actions">
            <button
              type="button"
              onClick={handleLike}
              disabled={!user}
              className={`diary-detail-like-button ${isLiked ? 'liked' : ''}`}
              aria-pressed={isLiked}
            >
              <Heart size={20} color="currentColor" fill={isLiked ? 'currentColor' : 'none'} />
              <span>{likeCount} 個讚</span>
            </button>
            <button
              type="button"
              className="diary-detail-comment-button"
              onClick={handleCommentButtonClick}
            >
              <MessageCircle size={20} />
              <span>{totalCommentCount} 則留言</span>
            </button>
          </div>

          <div className="diary-detail-comments">
            <h3>留言 ({totalCommentCount})</h3>

            {user ? (
              <form onSubmit={handleCommentSubmit} className="diary-detail-comment-form">
                <div className="diary-detail-comment-input">
                  <input
                    name="comment"
                    id="comment-input"
                    autoComplete="off"
                    type="text"
                    value={commentInput}
                    onChange={(event) => {
                      if (commentError) setCommentError('')
                      setCommentInput(event.target.value)
                    }}
                    placeholder="寫下你的留言..."
                    maxLength={1000}
                    ref={commentInputRef}
                  />
                  <button type="submit" disabled={submitting}>
                    <Send size={16} />
                    {submitting ? '送出中...' : '送出'}
                  </button>
                </div>
                {commentError && <p className="diary-detail-comment-error">{commentError}</p>}
              </form>
            ) : (
              <div className="diary-detail-login-hint">
                <Link to="/login">登入</Link> 後即可留言
              </div>
            )}

            <div className="diary-detail-comments-list">
              {comments.map(comment => {
                const commentInitial = getInitial(comment.username)
                const commentAvatarUrl = comment.avatar_url ? ensureAbsoluteUrl(comment.avatar_url) : ''
                const commentProfileUrl = comment.user_id ? `/users/${comment.user_id}` : '#'
                const commentTimestamp = comment.created_at ? new Date(comment.created_at).toLocaleString() : ''
                const preventCommentNav = !comment.user_id
                  ? (event) => event.preventDefault()
                  : undefined
                const commentReplies = Array.isArray(comment.replies) ? comment.replies : []
                const replyCount = commentReplies.length
                const shouldCollapseReplies = replyCount > REPLY_COLLAPSE_LIMIT
                const isExpanded = Boolean(expandedReplies[comment.comment_id])
                const visibleReplies = shouldCollapseReplies && !isExpanded
                  ? []
                  : commentReplies
                const hiddenCount = shouldCollapseReplies ? replyCount : 0

                return (
                  <div key={comment.comment_id} className="diary-detail-comment-item">
                    <div className="diary-detail-comment-row">
                      <div className="diary-detail-comment-main">
                        <Link
                          to={commentProfileUrl}
                          className="diary-detail-comment-avatar"
                          aria-label={`${comment.username || '使用者'} 的個人頁面`}
                          onClick={preventCommentNav}
                        >
                          {commentAvatarUrl ? (
                            <span
                              className="diary-detail-comment-avatar-image"
                              style={{ backgroundImage: `url(${commentAvatarUrl})` }}
                            />
                          ) : (
                            <span className="diary-detail-comment-avatar-initial">{commentInitial}</span>
                          )}
                        </Link>
                        <div className="diary-detail-comment-content">
                          <div className="diary-detail-comment-header">
                            <div className="diary-detail-comment-meta">
                              <Link
                                to={commentProfileUrl}
                                className="diary-detail-comment-name"
                                onClick={preventCommentNav}
                              >
                                {comment.username || '匿名用戶'}
                              </Link>
                              <span className="diary-detail-comment-time">{commentTimestamp}</span>
                            </div>
                            {user && user.user_id === comment.user_id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.comment_id)}
                                className="diary-detail-comment-delete"
                              >
                                刪除
                              </button>
                            )}
                          </div>
                          <div className="diary-detail-comment-text">{comment.content}</div>
                          <div className="diary-detail-comment-footer">
                            {user && (
                              <button
                                type="button"
                                onClick={() => handleReplyClick(comment)}
                                className="diary-detail-comment-reply"
                              >
                                回覆
                              </button>
                            )}
                          </div>
                          {replyTo?.comment_id === comment.comment_id && (
                            <form className="diary-detail-inline-reply" onSubmit={handleReplySubmit}>
                              <textarea
                                ref={replyInputRef}
                                value={replyDraft}
                                onChange={(event) => setReplyDraft(event.target.value)}
                                placeholder={`回覆 ${comment.username || '這則留言'}...`}
                                maxLength={1000}
                                rows={3}
                              />
                              <div className="diary-detail-inline-reply-actions">
                                <button type="button" onClick={handleReplyCancel} disabled={replySubmitting}>
                                  取消
                                </button>
                                <button
                                  type="submit"
                                  disabled={replySubmitting || !replyDraft.trim()}
                                >
                                  <Send size={14} />
                                  送出
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                      <div className="diary-detail-comment-likes">
                        <button
                          type="button"
                          onClick={() => handleCommentLike(comment.comment_id)}
                          disabled={!user}
                          className={`diary-detail-comment-like-btn ${comment.is_liked ? 'liked' : ''}`}
                          aria-pressed={Boolean(comment.is_liked)}
                          aria-label={`對${comment.username || '這則'}留言按讚`}
                        >
                          <Heart size={18} color="currentColor" fill={comment.is_liked ? 'currentColor' : 'none'} />
                        </button>
                        <span className="diary-detail-comment-like-count">{comment.like_count || 0}</span>
                      </div>
                    </div>

                    {visibleReplies.length > 0 && (
                      <div className="diary-detail-replies">
                        {visibleReplies.map(reply => {
                          const replyInitial = getInitial(reply.username)
                          const replyAvatarUrl = reply.avatar_url ? ensureAbsoluteUrl(reply.avatar_url) : ''
                          const replyProfileUrl = reply.user_id ? `/users/${reply.user_id}` : '#'
                          const replyTimestamp = reply.created_at ? new Date(reply.created_at).toLocaleString() : ''
                          const preventReplyNav = !reply.user_id
                            ? (event) => event.preventDefault()
                            : undefined

                          return (
                            <div key={reply.comment_id} className="diary-detail-reply-item">
                              <div className="diary-detail-reply-main">
                                <Link
                                  to={replyProfileUrl}
                                  className="diary-detail-reply-avatar"
                                  aria-label={`${reply.username || '使用者'} 的個人頁面`}
                                  onClick={preventReplyNav}
                                >
                                  {replyAvatarUrl ? (
                                    <span
                                      className="diary-detail-reply-avatar-image"
                                      style={{ backgroundImage: `url(${replyAvatarUrl})` }}
                                    />
                                  ) : (
                                    <span className="diary-detail-reply-avatar-initial">{replyInitial}</span>
                                  )}
                                </Link>
                                <div className="diary-detail-reply-body">
                                  <div className="diary-detail-reply-header">
                                    <div className="diary-detail-reply-meta">
                                      <Link
                                        to={replyProfileUrl}
                                        className="diary-detail-reply-name"
                                        onClick={preventReplyNav}
                                      >
                                        {reply.username || '匿名用戶'}
                                      </Link>
                                      <span className="diary-detail-reply-time">{replyTimestamp}</span>
                                    </div>
                                    {user && user.user_id === reply.user_id && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteComment(reply.comment_id, comment.comment_id)}
                                        className="diary-detail-reply-delete"
                                      >
                                        刪除
                                      </button>
                                    )}
                                  </div>
                                  <div className="diary-detail-reply-target">
                                    回覆 @{reply.parent_username || comment.username || '留言者'}
                                  </div>
                                  <div className="diary-detail-reply-text">{reply.content}</div>
                                </div>
                              </div>
                              <div className="diary-detail-reply-like-stack">
                                <button
                                  type="button"
                                  onClick={() => handleCommentLike(reply.comment_id, comment.comment_id)}
                                  disabled={!user}
                                  className={`diary-detail-reply-like-btn ${reply.is_liked ? 'liked' : ''}`}
                                  aria-pressed={Boolean(reply.is_liked)}
                                  aria-label={`對${reply.username || '這則'}回覆按讚`}
                                >
                                  <Heart size={14} color="currentColor" fill={reply.is_liked ? 'currentColor' : 'none'} />
                                </button>
                                <span className="diary-detail-reply-like-count">{reply.like_count || 0}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {shouldCollapseReplies && (
                      <button
                        type="button"
                        className="diary-detail-replies-toggle"
                        onClick={() => handleToggleReplies(comment.comment_id)}
                      >
                        {isExpanded ? '收合回覆' : `顯示更多回覆 (${hiddenCount})`}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>


        </div>
      </div>

      <GuestModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        message="登入後即可查看完整日記內容、按讚和留言"
      />

      {showDeleteConfirm && (
        <div
          className="diary-delete-confirm-backdrop"
          role="presentation"
          onClick={handleCancelDeleteDiary}
        >
          <div
            className="diary-delete-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="diary-delete-confirm-title"
            aria-describedby="diary-delete-confirm-description"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="diary-delete-confirm-title">刪除日記</h3>
            <p id="diary-delete-confirm-description" className="diary-delete-confirm-text">
              確定要刪除「{diary.title || '(未命名)'}」嗎？此動作無法復原。
            </p>
            <div className="diary-delete-confirm-actions">
              <button
                type="button"
                className="diary-delete-confirm-btn secondary"
                onClick={handleCancelDeleteDiary}
                disabled={deleting}
              >
                取消
              </button>
              <button
                type="button"
                className="diary-delete-confirm-btn danger"
                onClick={handleConfirmDeleteDiary}
                disabled={deleting}
              >
                {deleting ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DiaryDetail
