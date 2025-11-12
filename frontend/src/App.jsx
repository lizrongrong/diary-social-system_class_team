import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './store/authStore'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import DashboardPage from './pages/DashboardPage'
import ExplorePage from './pages/ExplorePage'
import SearchPage from './pages/SearchPage'
import DiariesList from './pages/diaries/DiariesList'
import DiaryDetail from './pages/diaries/DiaryDetail'
import DiaryEditor from './pages/diaries/DiaryEditor'
import ProfilePage from './pages/ProfilePage'
import ChangePasswordPage from './pages/account/ChangePasswordPage'
import UserProfilePage from './pages/UserProfilePage'
import FollowPage from './pages/FollowPage'
import MessagesPage from './pages/messages/MessagesPage'
import LuckyCardPage from './pages/lucky/LuckyCardPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import { ToastProvider } from './components/ui/Toast'
import './App.css'

function App() {
  const { fetchUser } = useAuthStore()

  // 應用啟動時恢復用戶狀態
  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return (
    <ToastProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/search" element={<SearchPage />} />

            {/* 受保護路由 */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/diaries" element={<DiariesList />} />
              <Route path="/diaries/new" element={<DiaryEditor />} />
              <Route path="/diaries/:id/edit" element={<DiaryEditor />} />
              <Route path="/follows" element={<FollowPage />} />
              <Route path="/messages/:userId" element={<MessagesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/account/profile" element={<ProfilePage />} />
              <Route path="/account/change-password" element={<ChangePasswordPage />} />
              <Route path="/lucky-card" element={<LuckyCardPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* 公開讀取單篇（公開可匿名；私人需登入且為作者，但這裡頁面共用）*/}
            <Route path="/diaries/:id" element={<DiaryDetail />} />
            <Route path="/users/:userId" element={<UserProfilePage />} />
          </Routes>
        </Layout>
      </Router>
    </ToastProvider>
  )
}

export default App
