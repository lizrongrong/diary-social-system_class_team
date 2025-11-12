import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import useAuthStore from '../store/authStore'
import { notificationAPI } from '../services/api'
import { Home, Sparkles, BookOpen, TrendingUp, Users, RefreshCw, Search as SearchIcon, ChevronDown, User, LogOut, Menu, X, IdCard, KeyRound } from 'lucide-react'
import AnnouncementBell from './AnnouncementBell'
import NotificationBell from './NotificationBell'
import ChatPopup from './ChatPopup'
import './Layout.css'

function Layout({ children }) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 獲取未讀通知數量
  useEffect(() => {
    if (user) {
      fetchUnreadCount()
      // 每30秒更新一次
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationAPI.getAll({ limit: 1 })
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  const isActive = (path) => location.pathname === path

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleRefresh = () => {
    // 如果在首頁，觸發隨機重整事件
    if (location.pathname === '/') {
      window.dispatchEvent(new Event('homepageRefresh'))
    } else {
      // 其他頁面正常重新載入
      window.location.reload()
    }
  }

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    navigate('/')
  }

  const navItems = [
    { path: '/', label: '首頁', icon: Home },
    { path: '/lucky-card', label: '幸運小卡', icon: Sparkles },
    { path: '/diaries', label: '專屬日記', icon: BookOpen },
    { path: '/dashboard', label: '圖表分析', icon: TrendingUp },
    { path: '/follows', label: '好友管理', icon: Users },
    { path: '/search', label: '搜尋', icon: SearchIcon },
  ]

  return (
    <div className="app-layout">
      <header className="top-header">
        {/* 漢堡選單按鈕（僅手機版顯示） */}
        <button
          className="hamburger-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <h1 className="site-title">Resonote</h1>

        {/* 右側使用者功能區 */}
        <div className="header-actions">
          {user ? (
            <>
              {/* 通知/公告：NotificationBell 保留訊息/通知，AnnouncementBell 顯示系統公告 */}
              <AnnouncementBell />
              <NotificationBell />

              {/* 使用者選單 */}
              <div className="user-menu-container">
                <button
                  className="user-menu-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="user-avatar">
                    <User size={18} />
                  </div>
                  <span className="user-name">{user.username}</span>
                  <ChevronDown size={16} className={showUserMenu ? 'rotate' : ''} />
                </button>

                {showUserMenu && (
                  <div className="user-dropdown">
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <IdCard size={16} />
                      會員管理
                    </Link>
                    <Link
                      to="/account/change-password"
                      className="dropdown-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <KeyRound size={16} />
                      修改密碼
                    </Link>
                    <button
                      className="dropdown-item logout"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} />
                      登出
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* 未登入 - 顯示註冊/登入按鈕 */}
              <Link to="/register">
                <button className="header-btn register-btn">註冊</button>
              </Link>
              <Link to="/login">
                <button className="header-btn login-btn">登入</button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* 手機版遮罩層 */}
      {isMobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="content-wrapper">
        <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <div className="main-content">
          {/* 全局聊天彈窗（固定掛載） */}
          <ChatPopup />
          {/* 只在首頁顯示頂部工具列 */}
          {location.pathname === '/' && (
            <div className="content-topbar">
              <button className="refresh-btn" onClick={handleRefresh} title="重新整理">
                <RefreshCw size={20} />
              </button>
              <button
                className="search-icon-btn"
                onClick={() => navigate('/search')}
                title="搜尋"
              >
                <SearchIcon size={20} />
              </button>
            </div>
          )}
          <main className="page-content">{children}</main>
        </div>
      </div>
    </div>
  )
}

export default Layout
