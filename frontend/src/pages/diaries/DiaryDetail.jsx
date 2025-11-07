import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { diaryAPI } from '../../services/api'
import { Heart, MessageCircle, Send, ArrowLeft } from 'lucide-react'
import likeAPI from '../../services/likeAPI'
import commentAPI from '../../services/commentAPI'
import useAuthStore from '../../store/authStore'
import GuestModal from '../../components/ui/GuestModal'

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
        const diaryData = data?.item || data
        setDiary(diaryData)
        setLikeCount(diaryData.like_count || 0)
        setIsLiked(diaryData.is_liked || false)
        
        // Load comments
        const commentsData = await commentAPI.getComments(id)
        setComments(commentsData)
      } catch (e) {
        setError(e.response?.data?.message || '找不到這篇日記或沒有權限')
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

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      setShowGuestModal(true)
      return
    }
    if (!commentInput.trim()) return
    
    setSubmitting(true)
    try {
      const newComment = await commentAPI.createComment(id, commentInput.trim(), replyTo?.comment_id || null)
      
      if (replyTo) {
        // Add reply to parent comment
        setComments(comments.map(c => 
          c.comment_id === replyTo.comment_id 
            ? { ...c, replies: [...(c.replies || []), newComment] }
            : c
        ))
      } else {
        // Add top-level comment
        setComments([...comments, { ...newComment, replies: [] }])
      }
      
      setCommentInput('')
      setReplyTo(null)
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
        // Remove reply
        setComments(comments.map(c => 
          c.comment_id === parentId 
            ? { ...c, replies: c.replies.filter(r => r.comment_id !== commentId) }
            : c
        ))
      } else {
        // Remove top-level comment
        setComments(comments.filter(c => c.comment_id !== commentId))
      }
    } catch (e) {
      alert('刪除失敗：' + (e.response?.data?.message || e.message))
    }
  }

  const handleCommentLike = async (commentId, parentId = null) => {
    if (!user) return
    
    try {
      const result = await likeAPI.toggleLike('comment', commentId)
      
      const updateLike = (c) => 
        c.comment_id === commentId 
          ? { ...c, is_liked: result.liked, like_count: result.count }
          : c
      
      if (parentId) {
        setComments(comments.map(c => 
          c.comment_id === parentId 
            ? { ...c, replies: c.replies.map(updateLike) }
            : c
        ))
      } else {
        setComments(comments.map(updateLike))
      }
    } catch (e) {
      console.error('Comment like error:', e)
    }
  }

  if (loading) return <div style={{ padding: '1rem' }}>載入中…</div>
  if (error) return <div style={{ padding: '1rem', color: 'crimson' }}>{error}</div>
  if (!diary) return null

  return (
    <div className="page diary-detail" style={{ padding: '1rem', maxWidth: 800, margin: '0 auto' }}>
      {/* Guest Timer Warning */}
      {!user && diary.visibility === 'public' && guestTimer > 0 && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#FFF3CD',
          border: '1px solid #FFC107',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'slideInLeft 0.3s ease'
        }}>
          <span style={{ fontSize: 14, color: '#856404' }}>
            ⏱️ 訪客預覽模式：{guestTimer} 秒後內容將模糊，請登入以查看完整內容
          </span>
        </div>
      )}

      {/* 返回按鈕 */}
      <div style={{ marginBottom: 16 }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: '1px solid var(--gray-300)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            color: 'var(--gray-700)',
            fontSize: '14px',
            transition: 'all var(--transition-base)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--gray-50)'
            e.currentTarget.style.borderColor = 'var(--primary-purple)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.borderColor = 'var(--gray-300)'
          }}
        >
          <ArrowLeft size={16} />
          返回上一頁
        </button>
      </div>
      
      <h2 style={{ marginBottom: 8 }}>{diary.title || '(未命名)'}</h2>
      
      <div style={{ fontSize: 12, color: '#666', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>{new Date(diary.created_at || diary.createdAt || Date.now()).toLocaleString()}</span>
        {diary.status === 'draft' && <span style={{ padding: '2px 8px', background: '#FFE4B5', borderRadius: 4 }}>草稿</span>}
        <span style={{ padding: '2px 8px', background: diary.visibility === 'public' ? '#E0F7FA' : '#f0f0f0', borderRadius: 4 }}>
          {diary.visibility === 'public' ? '公開' : '私人'}
        </span>
      </div>

      {/* 標籤 */}
      {diary.tags && diary.tags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {diary.tags.filter(t => t.tag_type === 'emotion').map((t, i) => (
              <span key={i} style={{ padding: '6px 12px', background: '#E1B1E8', borderRadius: 16, fontSize: 14 }}>
                {t.tag_value}
              </span>
            ))}
            {diary.tags.find(t => t.tag_type === 'weather') && (
              <span style={{ padding: '6px 12px', background: '#B2EBF2', borderRadius: 16, fontSize: 14 }}>
                {diary.tags.find(t => t.tag_type === 'weather').tag_value}
              </span>
            )}
            {diary.tags.filter(t => t.tag_type === 'keyword').map((t, i) => (
              <span key={i} style={{ padding: '6px 12px', background: '#f0f0f0', borderRadius: 16, fontSize: 14 }}>
                #{t.tag_value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 附件 */}
      {diary.media && diary.media.length > 0 && (
        <div style={{ marginBottom: 16 }} className={isBlurred ? 'blur-content' : ''}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {diary.media.map((m, idx) => (
              <img key={idx} src={`http://localhost:3000${m.file_url}`} alt="" style={{ width: '100%', borderRadius: 8, border: '1px solid #ddd' }} />
            ))}
          </div>
        </div>
      )}

      {/* 內容 */}
      <div 
        className={isBlurred ? 'blur-content' : ''}
        style={{ 
          whiteSpace: 'pre-wrap', 
          lineHeight: 1.7, 
          fontSize: 16, 
          marginBottom: 24,
          position: 'relative'
        }}
      >
        {diary.content}
      </div>

      {/* Social Actions */}
      <div style={{ display: 'flex', gap: 24, paddingY: 16, borderTop: '1px solid #eee', borderBottom: '1px solid #eee', marginBottom: 24 }}>
        <button 
          onClick={handleLike}
          disabled={!user}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            background: 'none', 
            border: 'none', 
            cursor: user ? 'pointer' : 'not-allowed',
            fontSize: 16,
            color: isLiked ? '#CD79D5' : '#666'
          }}
        >
          <Heart size={20} fill={isLiked ? '#CD79D5' : 'none'} />
          <span>{likeCount}</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, color: '#666' }}>
          <MessageCircle size={20} />
          <span>{comments.length}</span>
        </div>
      </div>

      {/* Comments Section */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 18 }}>留言 ({comments.length})</h3>
        
        {/* Comment Form */}
        {user ? (
          <form onSubmit={handleCommentSubmit} style={{ marginBottom: 24 }}>
            {replyTo && (
              <div style={{ padding: 8, background: '#f0f0f0', borderRadius: 4, marginBottom: 8, fontSize: 14 }}>
                回覆 @{replyTo.username}
                <button 
                  type="button" 
                  onClick={() => setReplyTo(null)}
                  style={{ marginLeft: 12, padding: '2px 8px', background: '#fff', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
                >
                  取消
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                name="comment"
                id="comment-input"
                autoComplete="off"
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={replyTo ? `回覆 ${replyTo.username}...` : '寫下你的留言...'}
                maxLength={1000}
                style={{ 
                  flex: 1, 
                  padding: '10px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
              <button
                type="submit"
                disabled={!commentInput.trim() || submitting}
                style={{
                  padding: '10px 20px',
                  background: commentInput.trim() ? '#CD79D5' : '#ccc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: commentInput.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Send size={16} />
                {submitting ? '送出中...' : '送出'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ padding: 16, background: '#f9f9f9', borderRadius: 8, marginBottom: 24, textAlign: 'center' }}>
            <Link to="/login" style={{ color: '#CD79D5' }}>登入</Link> 後即可留言
          </div>
        )}

        {/* Comments List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {comments.map(comment => (
            <div key={comment.comment_id} style={{ padding: 12, background: '#f9f9f9', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link 
                    to={`/users/${comment.user_id}`} 
                    style={{ textDecoration: 'none', color: '#333', fontWeight: 600, fontSize: 14 }}
                  >
                    {comment.username}
                  </Link>
                  <span style={{ fontSize: 12, color: '#999' }}>
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                {user && user.userId === comment.user_id && (
                  <button
                    onClick={() => handleDeleteComment(comment.comment_id)}
                    style={{ padding: '2px 8px', background: 'none', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                  >
                    刪除
                  </button>
                )}
              </div>
              <div style={{ marginBottom: 8, fontSize: 14, lineHeight: 1.5 }}>{comment.content}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <button
                  onClick={() => handleCommentLike(comment.comment_id)}
                  disabled={!user}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: 'none',
                    cursor: user ? 'pointer' : 'not-allowed',
                    color: comment.is_liked ? '#CD79D5' : '#666'
                  }}
                >
                  <Heart size={14} fill={comment.is_liked ? '#CD79D5' : 'none'} />
                  <span>{comment.like_count || 0}</span>
                </button>
                {user && (
                  <button
                    onClick={() => setReplyTo(comment)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#666',
                      fontSize: 13
                    }}
                  >
                    回覆
                  </button>
                )}
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div style={{ marginTop: 12, marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {comment.replies.map(reply => (
                    <div key={reply.comment_id} style={{ padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #eee' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Link 
                            to={`/users/${reply.user_id}`} 
                            style={{ textDecoration: 'none', color: '#333', fontWeight: 600, fontSize: 13 }}
                          >
                            {reply.username}
                          </Link>
                          <span style={{ fontSize: 11, color: '#999' }}>
                            {new Date(reply.created_at).toLocaleString()}
                          </span>
                        </div>
                        {user && user.userId === reply.user_id && (
                          <button
                            onClick={() => handleDeleteComment(reply.comment_id, comment.comment_id)}
                            style={{ padding: '2px 6px', background: 'none', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                          >
                            刪除
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{reply.content}</div>
                      <button
                        onClick={() => handleCommentLike(reply.comment_id, comment.comment_id)}
                        disabled={!user}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'none',
                          border: 'none',
                          cursor: user ? 'pointer' : 'not-allowed',
                          color: reply.is_liked ? '#CD79D5' : '#666',
                          fontSize: 12
                        }}
                      >
                        <Heart size={12} fill={reply.is_liked ? '#CD79D5' : 'none'} />
                        <span>{reply.like_count || 0}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #eee' }}>
        <Link to={`/diaries/${id}/edit`} style={{ padding: '10px 20px', background: '#CD79D5', color: '#fff', textDecoration: 'none', borderRadius: 8, marginRight: 12 }}>編輯</Link>
      </div>

      {/* Guest Modal */}
      <GuestModal 
        isOpen={showGuestModal} 
        onClose={() => setShowGuestModal(false)}
        message="登入後即可查看完整日記內容、按讚和留言"
      />
    </div>
  )
}

export default DiaryDetail
