import { useEffect, useState, useRef, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import axios from 'axios'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { userAPI } from '../../services/api'

const API_URL = 'http://localhost:3000/api/v1'

function UserManagement() {
  const { user } = useAuthStore()
  const { addToast } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const searchIdRef = useRef(0)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const resp = await axios.get(`${API_URL}/admin/users?limit=50`)
      setUsers(resp.data.users || [])
    } catch (err) {
      console.error('Load admin users failed', err)
      addToast('載入用戶清單失敗', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = useCallback(async (keywordOverride) => {
    const keyword = (keywordOverride !== undefined ? keywordOverride : searchTerm).trim()
    searchIdRef.current += 1
    const requestId = searchIdRef.current

    if (!keyword) {
      setSearching(false)
      // restore full list
      setUsers((prev) => prev)
      return
    }

    try {
      setSearching(true)
      const resp = await userAPI.search(keyword)
      if (requestId !== searchIdRef.current) return
      setUsers(resp.users || resp || [])
    } catch (err) {
      console.error('User search failed', err)
      addToast('搜尋用戶失敗', 'error')
    } finally {
      if (requestId === searchIdRef.current) setSearching(false)
    }
  }, [searchTerm, addToast])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchTerm.trim()) handleSearch(searchTerm)
      else loadUsers()
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm, handleSearch])

  if (user && user.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div style={{ padding: 'var(--spacing-xl)', paddingTop: 80, maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="text-h1">用戶管理</h1>
      <p className="text-body" style={{ color: 'var(--gray-600)' }}>搜尋、查看與變更用戶狀態。</p>

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="搜尋使用者名稱或 Email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button variant="outline" onClick={() => handleSearch(searchTerm)}>{searching ? '搜尋中...' : '搜尋'}</Button>
          </div>
          <Button variant="outline" onClick={loadUsers}>重新整理</Button>
        </div>

        {loading ? (
          <Card>載入中...</Card>
        ) : users.length === 0 ? (
          <Card>沒有找到用戶。</Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {users.map((u) => (
              <Card key={u.user_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="text-body" style={{ fontWeight: 600 }}>{u.username}</div>
                    <div className="text-tiny" style={{ color: 'var(--gray-500)' }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="outline">編輯</Button>
                    <Button variant="danger">停用</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default UserManagement
