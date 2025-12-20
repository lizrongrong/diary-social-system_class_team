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
  const user = useAuthStore((state) => state.user)
  const { addToast } = useToast()

  useEffect(() => {
    // If we have a token but user info hasn't been loaded yet, fetch it.
    // This handles page refresh where `isAuthenticated` may be true (token exists)
    // but `user` is null because the store was recreated.
    if (token && !user) {
      fetchUser()
    }
  }, [token, user, fetchUser])

  useEffect(() => {
    // 未登入且不在載入狀態時顯示提示
    if (!isLoading && !isAuthenticated) {
      try {
        // 使用 sessionStorage 確保同一時間只顯示一次登入提示（避免多個元件重複觸發）
        const key = 'loginRedirectToastShown'
        const last = sessionStorage.getItem(key)
        const now = Date.now()
        const threshold = 3000 // ms
        if (!last || (now - Number(last)) > threshold) {
          addToast('請先登入以訪問此頁面', 'warning', 3000)
          sessionStorage.setItem(key, String(now))
        }
      } catch (e) {
        // 若無法存取 sessionStorage，就直接顯示一次
        addToast('請先登入以訪問此頁面', 'warning', 3000)
      }
    }
  }, [isLoading, isAuthenticated, addToast])

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>載入中…</div>
    )
  }

  // If we have a token but user info hasn't been loaded yet, show loading
  // to avoid immediate redirect to login on page refresh while fetchUser runs.
  if (!isLoading && token && !user) {
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
