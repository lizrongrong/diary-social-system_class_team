import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useToast } from './ui/Toast'

function ProtectedRoute() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const fetchUser = useAuthStore((state) => state.fetchUser)
  const token = useAuthStore((state) => state.token)
  const { addToast } = useToast()

  useEffect(() => {
    if (!isAuthenticated && token) {
      // 嘗試以現有 token 取得使用者
      fetchUser()
    }
  }, [isAuthenticated, token, fetchUser])

  useEffect(() => {
    // 未登入且不在載入狀態時顯示提示
    if (!isLoading && !isAuthenticated) {
      addToast('請先登入以訪問此頁面', 'warning', 3000)
    }
  }, [isLoading, isAuthenticated, addToast])

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>載入中…</div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
