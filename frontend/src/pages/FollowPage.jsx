import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { followAPI, userAPI } from '../services/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Users, Search, X, HeartHandshake, UserPlus } from 'lucide-react'
import { FaCommentDots, FaShareFromSquare, FaTrashCan } from 'react-icons/fa6'
import { useToast } from '../components/ui/Toast'
import useChatStore from '../store/chatStore'
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
  const [otherUsers, setOtherUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [messageFriend, setMessageFriend] = useState(null)
  const [shareFriend, setShareFriend] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const searchRequestIdRef = useRef(0)

  const resetSearch = useCallback(() => {
    searchRequestIdRef.current += 1
    setSearchTerm('')
    setFilteredFollows(follows)
    setOtherUsers([])
    setSearchingUsers(false)
  }, [follows])

  useEffect(() => {
    loadFollows()
  }, [])

  const loadFollows = async ({ showSpinner = true } = {}) => {
    try {
      if (showSpinner) setLoading(true)
      const data = await followAPI.getAll()
      const list = data.following || data.friends || []
      setFollows(list)

      if (!searchTerm.trim()) {
        setFilteredFollows(list)
        setOtherUsers([])
      }

      return list
    } catch (err) {
      console.error('Error loading follows:', err)
      addToast('載入追蹤列表失敗', 'error')
      return []
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  const handleSearch = useCallback(
    async (options = {}) => {
      const { keyword: keywordOverride, sourceFollows, skipToast } = options
      const rawKeyword = keywordOverride !== undefined ? keywordOverride : searchTerm
      const keyword = rawKeyword.trim()
      const currentFollows = sourceFollows || follows
      const requestId = ++searchRequestIdRef.current

      if (!keyword) {
        setFilteredFollows(currentFollows)
        setOtherUsers([])
        setSearchingUsers(false)
        return
      }

      const lowerKeyword = keyword.toLowerCase()
      const matched = currentFollows.filter((item) => {
        const username = (item.username || '').toLowerCase()
        const displayName = (item.display_name || '').toLowerCase()
        return username.includes(lowerKeyword) || displayName.includes(lowerKeyword)
      })
      setFilteredFollows(matched)
      setOtherUsers([])

      try {
        setSearchingUsers(true)
        const response = await userAPI.search(keyword)
        if (requestId !== searchRequestIdRef.current) {
          return
        }

        const friendIds = new Set(
          currentFollows.map(
            (item) => item.following_user_id || item.friend_user_id || item.user_id
          )
        )

        const suggestions = (response?.users || []).filter((user) => {
          if (!user?.user_id) return false
          return !friendIds.has(user.user_id)
        })

        setOtherUsers(suggestions)
      } catch (err) {
        console.error('Error searching users:', err)
        if (requestId === searchRequestIdRef.current) {
          if (!skipToast) {
            addToast('搜尋用戶失敗', 'error')
          }
          setOtherUsers([])
        }
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setSearchingUsers(false)
        }
      }
    },
    [addToast, follows, searchTerm]
  )

  useEffect(() => {
    if (loading) {
      return
    }

    const handler = setTimeout(() => {
      handleSearch({ skipToast: true })
    }, 300)

    return () => clearTimeout(handler)
  }, [handleSearch, loading, searchTerm])

  const handleRemoveFollow = async (targetUserId) => {
    try {
      await followAPI.remove(targetUserId)
      addToast('已取消追蹤', 'success')
      const updatedList = await loadFollows({ showSpinner: false })
      if (searchTerm.trim()) {
        await handleSearch({ keyword: searchTerm, sourceFollows: updatedList, skipToast: true })
      }
    } catch (err) {
      console.error('Error removing follow:', err)
      addToast('取消追蹤失敗', 'error')
    }
  }

  const handleAddFollow = async (user) => {
    if (!user?.user_id) return
    try {
      await followAPI.add(user.user_id)
      addToast(`已追蹤 ${user.username || user.user_id}`, 'success')
      const updatedList = await loadFollows({ showSpinner: false })
      setOtherUsers((prev) => prev.filter((item) => item.user_id !== user.user_id))
      if (searchTerm.trim()) {
        await handleSearch({ keyword: searchTerm, sourceFollows: updatedList, skipToast: true })
      } else {
        setFilteredFollows(updatedList)
      }
    } catch (err) {
      console.error('Error adding follow:', err)
      const message = err.response?.data?.message || '追蹤失敗'
      addToast(message, 'error')
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
            {searchingUsers ? '搜尋中...' : '搜尋'}
          </button>
        </div>
      </section>

      {searchTerm.trim() ? (
        <div className="friend-search-results">
          {filteredFollows.length > 0 && (
            <>
              <h2 className="friend-section-title">好友列表</h2>
              <ul className="friend-list">
                {filteredFollows.map((follow) => {
                  const friendId =
                    follow.friend_user_id || follow.following_user_id || follow.user_id
                  const displayName = follow.display_name || follow.username || '好友'
                  const avatarStyle = follow.avatar_url
                    ? { backgroundImage: `url(${follow.avatar_url})` }
                    : {}

                  return (
                    <li
                      key={friendId || follow.friend_id || follow.follow_id}
                      className="friend-item"
                    >
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
                        {follow.username && (
                          <span className="friend-username">@{follow.username}</span>
                        )}
                      </div>

                      <div className="friend-actions">
                        <button
                          type="button"
                          className="friend-icon-button"
                          aria-label="私訊好友"
                          onClick={() => { useChatStore.getState().openConversation(friendId, { username: displayName }); setMessageFriend(null) }}
                        >
                          <FaCommentDots size={26} />
                        </button>
                        <button
                          type="button"
                          className="friend-icon-button"
                          aria-label="分享好友"
                          onClick={() => setShareFriend({ id: friendId, name: displayName })}
                        >
                          <FaShareFromSquare size={26} />
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
            </>
          )}

          {otherUsers.length > 0 && (
            <>
              <h2 className="friend-section-title">搜尋好友</h2>
              <ul className="friend-list friend-suggestion-list">
                {otherUsers.map((user) => {
                  const displayName = user.display_name || user.username || '使用者'
                  const usernameLabel = user.username
                    ? `@${user.username}`
                    : `ID：${user.user_id}`
                  const avatarStyle = user.avatar_url
                    ? { backgroundImage: `url(${user.avatar_url})` }
                    : {}

                  return (
                    <li key={user.user_id} className="friend-item friend-item--suggestion">
                      <button
                        type="button"
                        className="friend-avatar"
                        style={avatarStyle}
                        onClick={() => openProfile(user.user_id)}
                        aria-label={`${displayName} 的個人頁面`}
                      >
                        {!user.avatar_url && (user.username || user.user_id || '').charAt(0).toUpperCase()}
                      </button>
                      <div className="friend-info">
                        <span className="friend-name">{displayName}</span>
                        <span className="friend-username">{usernameLabel}</span>
                      </div>
                      <div className="friend-actions friend-actions--suggestion">
                        <button
                          type="button"
                          className="friend-follow-button"
                          onClick={() => handleAddFollow(user)}
                        >
                          <UserPlus size={20} />
                          <span>追蹤</span>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {filteredFollows.length === 0 && otherUsers.length === 0 && !searchingUsers && (
            <div className="friend-search-empty-card">
              <div className="friend-search-empty-icon">
                <Search size={56} />
              </div>
              <h3 className="friend-search-empty-title">尚未找到符合的好友</h3>
              <p className="friend-search-empty-text">
                試試不同的暱稱或關鍵字，或是邀請朋友加入 Resonote。
              </p>
              <button type="button" className="friend-search-empty-action" onClick={resetSearch}>
                返回好友列表
              </button>
            </div>
          )}
        </div>
      ) : filteredFollows.length === 0 ? (
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
                    onClick={() => { useChatStore.getState().openConversation(friendId, { username: displayName }); setMessageFriend(null) }}
                  >
                    <FaCommentDots size={26} />
                  </button>
                  <button
                    type="button"
                    className="friend-icon-button"
                    aria-label="分享好友"
                    onClick={() => setShareFriend({ id: friendId, name: displayName })}
                  >
                    <FaShareFromSquare size={26} />
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

      {/* 訊息彈窗已改為右下 ChatPopup，移除 InfoModal */}

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
