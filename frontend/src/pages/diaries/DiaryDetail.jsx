import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { diaryAPI, ensureAbsoluteUrl } from '../../services/api'
import { Heart, MessageCircle, Send, ArrowLeft, PencilLine, Trash2 } from 'lucide-react'
import likeAPI from '../../services/likeAPI'
import commentAPI from '../../services/commentAPI'
import useAuthStore from '../../store/authStore'
import GuestModal from '../../components/ui/GuestModal'
import './DiaryDetail.css'

function DiaryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
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
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [deleting, setDeleting] = useState(false)

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
        setComments(commentsData?.comments || commentsData || [])
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

  const handleDeleteDiary = async (event) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (deleting) return

    const confirmed = window.confirm('確定要刪除此日記嗎？刪除後將無法恢復。')
    if (!confirmed) return

    try {
      setDeleting(true)
      await diaryAPI.delete(id)
      alert('日記已刪除')
      window.dispatchEvent(new Event('homepageRefresh'))
      navigate('/')
    } catch (e) {
      alert('刪除失敗：' + (e.response?.data?.message || e.message))
    } finally {
      setDeleting(false)
    }
  }

  const handleCommentSubmit = async (event) => {
    event.preventDefault()
    if (!user) {
      setShowGuestModal(true)
      return
    }
    if (!commentInput.trim()) {
      setCommentError('請輸入留言內容')
      return
    }

    setSubmitting(true)
    try {
      const newComment = await commentAPI.createComment(
        id,
        commentInput.trim(),
        replyTo?.comment_id || null
      )

      if (replyTo) {
        setComments(comments.map(comment =>
          comment.comment_id === replyTo.comment_id
            ? { ...comment, replies: [...(comment.replies || []), newComment] }
            : comment
        ))
      } else {
        setComments([...comments, { ...newComment, replies: [] }])
      }

      setCommentInput('')
      setReplyTo(null)
      setCommentError('')
    } catch (e) {
      alert('留言失敗：' + (e.response?.data?.message || e.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId, parentId = null) => {
    if (!confirm('確定要刪除此留言？')) return

    try {
      await commentAPI.deleteComment(commentId)

      if (parentId) {
        setComments(comments.map(comment =>
          comment.comment_id === parentId
            ? { ...comment, replies: comment.replies.filter(reply => reply.comment_id !== commentId) }
            : comment
        ))
      } else {
        setComments(comments.filter(comment => comment.comment_id !== commentId))
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

      if (parentId) {
        setComments(comments.map(comment =>
          comment.comment_id === parentId
            ? { ...comment, replies: comment.replies.map(updateLikeStatus) }
            : comment
        ))
      } else {
        setComments(comments.map(updateLikeStatus))
      }
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
              <div className="diary-detail-owner-actions">
                <button
                  type="button"
                  className="diary-detail-owner-btn"
                  onClick={handleEditDiary}
                  aria-label="編輯日記"
                >
                  <PencilLine size={18} />
                </button>
                <button
                  type="button"
                  className="diary-detail-owner-btn diary-detail-owner-delete"
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

          <div className={`diary-detail-content ${isBlurred ? 'blur-content' : ''}`}>
            {diary.content}
          </div>

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
            <div className="diary-detail-comments-count">
              <MessageCircle size={20} />
              <span>{comments.length} 則留言</span>
            </div>
          </div>

          <div className="diary-detail-comments">
            <h3>留言 ({comments.length})</h3>

            {user ? (
              <form onSubmit={handleCommentSubmit} className="diary-detail-comment-form">
                {replyTo && (
                  <div className="diary-detail-replying">
                    回覆 @{replyTo.username}
                    <button type="button" onClick={() => setReplyTo(null)}>
                      取消
                    </button>
                  </div>
                )}
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
                    placeholder={replyTo ? `回覆 ${replyTo.username}...` : '寫下你的留言...'}
                    maxLength={1000}
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
              {comments.map(comment => (
                <div key={comment.comment_id} className="diary-detail-comment-item">
                  <div className="diary-detail-comment-header">
                    <div className="diary-detail-comment-author">
                      <Link to={`/users/${comment.user_id}`}>
                        {comment.username}
                      </Link>
                      <span className="diary-detail-comment-time">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
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

                  <div className="diary-detail-comment-body">{comment.content}</div>

                  <div className="diary-detail-comment-actions">
                    <button
                      type="button"
                      onClick={() => handleCommentLike(comment.comment_id)}
                      disabled={!user}
                      className={`diary-detail-comment-like ${comment.is_liked ? 'liked' : ''}`}
                      aria-pressed={Boolean(comment.is_liked)}
                    >
                      <Heart size={14} color="currentColor" fill={comment.is_liked ? 'currentColor' : 'none'} />
                      <span>{comment.like_count || 0}</span>
                    </button>
                    {user && (
                      <button
                        type="button"
                        onClick={() => setReplyTo(comment)}
                        className="diary-detail-comment-reply"
                      >
                        回覆
                      </button>
                    )}
                  </div>

                  {comment.replies && comment.replies.length > 0 && (
                    <div className="diary-detail-replies">
                      {comment.replies.map(reply => (
                        <div key={reply.comment_id} className="diary-detail-reply-item">
                          <div className="diary-detail-reply-header">
                            <div className="diary-detail-reply-author">
                              <Link to={`/users/${reply.user_id}`}>
                                {reply.username}
                              </Link>
                              <span className="diary-detail-reply-time">
                                {new Date(reply.created_at).toLocaleString()}
                              </span>
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
                          <div className="diary-detail-reply-content">{reply.content}</div>
                          <div className="diary-detail-reply-actions">
                            <button
                              type="button"
                              onClick={() => handleCommentLike(reply.comment_id, comment.comment_id)}
                              disabled={!user}
                              className={`diary-detail-reply-like ${reply.is_liked ? 'liked' : ''}`}
                              aria-pressed={Boolean(reply.is_liked)}
                            >
                              <Heart size={12} color="currentColor" fill={reply.is_liked ? 'currentColor' : 'none'} />
                              <span>{reply.like_count || 0}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>


        </div>
      </div>

      <GuestModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        message="登入後即可查看完整日記內容、按讚和留言"
      />
    </div>
  )
}

export default DiaryDetail
