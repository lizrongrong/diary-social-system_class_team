import { createBrowserRouter, RouterProvider } from 'react-router-dom'
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

  // 建立巢狀路由配置，Layout 為父 element，使用 Outlet 顯示子頁面
  const router = createBrowserRouter([
    {
      path: '/',
      element: <Layout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'login', element: <LoginPage /> },
        { path: 'forgot-password', element: <ForgotPasswordPage /> },
        { path: 'register', element: <RegisterPage /> },
        { path: 'explore', element: <ExplorePage /> },
        { path: 'search', element: <SearchPage /> },

        // 受保護路由（ProtectedRoute 渲染 Outlet）
        {
          element: <ProtectedRoute />,
          children: [
            { path: 'dashboard', element: <DashboardPage /> },
            { path: 'diaries', element: <DiariesList /> },
            { path: 'diaries/new', element: <DiaryEditor /> },
            { path: 'diaries/:id/edit', element: <DiaryEditor /> },
            { path: 'follows', element: <FollowPage /> },
            { path: 'messages/:userId', element: <MessagesPage /> },
            { path: 'profile', element: <ProfilePage /> },
            { path: 'account/profile', element: <ProfilePage /> },
            { path: 'account/change-password', element: <ChangePasswordPage /> },
            { path: 'lucky-card', element: <LuckyCardPage /> },
            { path: 'admin', element: <AdminDashboard /> }
          ]
        },

        // 公開細節頁
        { path: 'diaries/:id', element: <DiaryDetail /> },
        { path: 'users/:userId', element: <UserProfilePage /> }
      ]
    }
  ])

  return (
    <ToastProvider>
      {/* 使用 future flags 提前啟用 v7 行為，移除警告 */}
      <RouterProvider router={router} future={{ v7_startTransition: true, v7_relativeSplatPath: true }} />
    </ToastProvider>
  )
}

export default App
