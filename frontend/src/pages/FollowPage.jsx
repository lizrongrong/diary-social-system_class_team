import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { followAPI } from '../services/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Users, Search, X, HeartHandshake } from 'lucide-react'
import { FaCommentDots, FaShareNodes, FaTrashCan } from 'react-icons/fa6'
import { useToast } from '../components/ui/Toast'
import './FollowPage.css'

function ConfirmModal({ open, name, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className="friend-confirm-backdrop" onClick={onCancel}>
      <div className="friend-confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <h3 className="friend-confirm-title">刪除好友</h3>
        <p className="friend-confirm-text">確定要刪除 {name} 嗎？此動作無法復原。</p>
        <div className="friend-confirm-actions">
          <button type="button" className="friend-confirm-btn secondary" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="friend-confirm-btn danger" onClick={onConfirm}>
            確認刪除
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoModal({ open, title, description, onClose, actionLabel }) {
  if (!open) return null

  return (
    <div className="friend-confirm-backdrop" onClick={onClose}>
      <div className="friend-info-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="friend-info-close" onClick={onClose} aria-label="關閉視窗">
          <X size={18} />
        </button>
        <h3 className="friend-info-title">{title}</h3>
        <p className="friend-info-text">{description}</p>
        <button type="button" className="friend-info-action" onClick={onClose}>
          {actionLabel || '我知道了'}
        </button>
      </div>
    </div>
  )
}

function FollowPage() {
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [follows, setFollows] = useState([])
  const [filteredFollows, setFilteredFollows] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [messageFriend, setMessageFriend] = useState(null)
  const [shareFriend, setShareFriend] = useState(null)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    loadFollows()
  }, [])

  const loadFollows = async () => {
    try {
      setLoading(true)
      const data = await followAPI.getAll()
      // backend may return { following: [...] } or legacy { friends: [...] }
      const list = data.following || data.friends || []
      setFollows(list)
      setFilteredFollows(list)
    } catch (err) {
      console.error('Error loading follows:', err)
      addToast('載入追蹤列表失敗', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) {
      setFilteredFollows(follows)
      return
    }

    const matched = follows.filter((item) => {
      const username = (item.username || '').toLowerCase()
      const displayName = (item.display_name || '').toLowerCase()
      return username.includes(keyword) || displayName.includes(keyword)
    })
    setFilteredFollows(matched)
  }

  const handleRemoveFollow = async (targetUserId) => {
    try {
      await followAPI.remove(targetUserId)
      addToast('已取消追蹤', 'success')
      loadFollows()
    } catch (err) {
      console.error('Error removing follow:', err)
      addToast('取消追蹤失敗', 'error')
    }
  }

  const openProfile = (friendId) => {
    if (!friendId) return
    navigate(`/user/${friendId}`)
  }

  const friendCount = follows.length

  if (loading) {
    return (
      <div className="page follow-page" style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
          <p>載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page follow-page">
      <header className="friend-header">
        <h1 className="friend-title">好友管理</h1>
        <button
          type="button"
          className="friend-info-trigger"
          onClick={() => setShowGuide(true)}
          aria-label="好友管理使用說明"
        >
          <HeartHandshake size={28} />
        </button>
      </header>

      <section className="friend-toolbar">
        <div className="friend-count">
          <span className="friend-count-label">好友人數</span>
          <span className="friend-count-value">共 {friendCount} 人</span>
        </div>

        <div className="friend-search">
          <div className="friend-search-input">
            {/* <Search size={18} /> */}
            <input
              type="text"
              placeholder="搜尋好友名稱或暱稱"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSearch()
              }}
            />
          </div>
          <button type="button" className="friend-search-button" onClick={handleSearch}>
            搜尋
          </button>
        </div>
      </section>

      {filteredFollows.length === 0 ? (
        <Card className="friend-empty-card">
          <Users size={64} />
          <h3>還沒有好友</h3>
          <p>到首頁探索更多日記，加入新朋友吧！</p>
          <Link to="/">
            <Button variant="primary">探索日記</Button>
          </Link>
        </Card>
      ) : (
        <ul className="friend-list">
          {filteredFollows.map((follow) => {
            const friendId = follow.friend_user_id || follow.following_user_id || follow.user_id
            const displayName = follow.display_name || follow.username || '好友'
            const avatarStyle = follow.avatar_url
              ? { backgroundImage: `url(${follow.avatar_url})` }
              : {}

            return (
              <li key={friendId || follow.friend_id || follow.follow_id} className="friend-item">
                <button
                  type="button"
                  className="friend-avatar"
                  style={avatarStyle}
                  onClick={() => openProfile(friendId)}
                  aria-label={`${displayName} 的個人頁面`}
                >
                  {!follow.avatar_url && (follow.username || '').charAt(0).toUpperCase()}
                </button>

                <div className="friend-info">
                  <span className="friend-name">{displayName}</span>
                  {follow.username && <span className="friend-username">@{follow.username}</span>}
                </div>

                <div className="friend-actions">
                  <button
                    type="button"
                    className="friend-icon-button"
                    aria-label="私訊好友"
                    onClick={() => setMessageFriend({ id: friendId, name: displayName })}
                  >
                    <FaCommentDots size={26} />
                  </button>
                  <button
                    type="button"
                    className="friend-icon-button"
                    aria-label="分享好友"
                    onClick={() => setShareFriend({ id: friendId, name: displayName })}
                  >
                    <FaShareNodes size={26} />
                  </button>
                  <button
                    type="button"
                    className="friend-icon-button danger"
                    aria-label="刪除好友"
                    onClick={() => setPendingDelete({ id: friendId, name: displayName })}
                  >
                    <FaTrashCan size={26} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmModal
        open={Boolean(pendingDelete)}
        name={pendingDelete?.name}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete?.id) return
          handleRemoveFollow(pendingDelete.id)
          setPendingDelete(null)
        }}
      />

      <InfoModal
        open={Boolean(messageFriend)}
        title={messageFriend ? `與 ${messageFriend.name} 聊聊天` : ''}
        description="聊天窗即將登場，敬請期待！"
        onClose={() => setMessageFriend(null)}
        actionLabel="好的"
      />

      <InfoModal
        open={Boolean(shareFriend)}
        title={shareFriend ? `分享 ${shareFriend.name} 的主頁` : ''}
        description="分享功能即將上線，很快就能把好友介紹給大家。"
        onClose={() => setShareFriend(null)}
        actionLabel="了解"
      />

      <InfoModal
        open={showGuide}
        title="好友管理使用指南"
        description="在這裡可以快速搜尋好友、發送私訊、分享主頁或移除好友。點擊卡片右側的按鈕即可操作。"
        onClose={() => setShowGuide(false)}
        actionLabel="開始管理"
      />
    </div>
  )
}

export default FollowPage
