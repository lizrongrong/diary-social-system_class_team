import { useEffect, useState, useRef, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import axios from 'axios'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { userAPI, adminAPI, ensureAbsoluteUrl } from '../../services/api'

const API_URL = 'http://localhost:3000/api/v1'

function UserManagement() {
  const { user } = useAuthStore()
  const { addToast } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const searchIdRef = useRef(0)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const token = sessionStorage.getItem('token')
      const resp = await axios.get(`${API_URL}/admin/users?limit=50`, { headers: { Authorization: `Bearer ${token}` } })
      setUsers((resp.data.users || []).map(u => {
        const statusNorm = normalizeStatus(u.status)
        return { ...u, statusNormalized: statusNorm, _selectedStatus: statusNorm }
      }))
    } catch (err) {
      console.error('Load admin users failed', err)
      addToast('載入用戶清單失敗', 'error')
    } finally {
      setLoading(false)
    }
  }

  // NOTE: do not auto-load users on mount. Show the "請輸入以查詢用戶" prompt when
  // the search input is empty. We will reload from server after updates/deletes so
  // the page reflects persisted changes.

  const isUuid = (s) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)
  const isUsername = (s) => /^[a-zA-Z0-9_.-]{3,64}$/.test(s)

  const normalizeStatus = (raw) => {
    if (raw === null || typeof raw === 'undefined') return 'active'
    const s = String(raw).toLowerCase()
    if (s === '1' || s === 'active' || s === '正常' || s === 'normal' || s === 'enabled') return 'active'
    if (s === '0' || s === 'suspended' || s === '停用' || s === 'disabled') return 'suspended'
    if (s === 'deleted' || s === '刪除') return 'deleted'
    return s
  }

  const handleSearch = useCallback(async (keywordOverride) => {
    const keyword = (keywordOverride !== undefined ? keywordOverride : searchTerm).trim()
    searchIdRef.current += 1
    const requestId = searchIdRef.current

    // if empty keyword -> do not search, instruct user to input
    if (!keyword) {
      setSearching(false)
      setUsers([])
      return
    }

    // only allow search when keyword looks like user_id (uuid) or username
    if (!(isUuid(keyword) || isUsername(keyword))) {
      setSearching(false)
      setUsers([])
      return
    }

    try {
      setSearching(true)
      const resp = await userAPI.search(keyword)
      if (requestId !== searchIdRef.current) return
      setUsers((resp.users || resp || []).map(u => {
        const statusNorm = normalizeStatus(u.status)
        return { ...u, statusNormalized: statusNorm, _selectedStatus: statusNorm }
      }))
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
      else {
        // do not auto-load users; show prompt
        setUsers([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm, handleSearch])

  if (user && user.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div style={{ padding: 'var(--spacing-xl)', paddingTop: 80, maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="text-h1">用戶管理</h1>
      <p className="text-body" style={{ color: 'var(--gray-600)' }}>搜尋、查看與變更用戶狀態。</p>

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="請輸入 user_id 或 username 以查詢"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 420, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd' }}
          />
          <Button variant="outline" onClick={() => handleSearch(searchTerm)}>{searching ? '搜尋中...' : '搜尋'}</Button>
        </div>

        {loading ? (
          <Card>載入中...</Card>
        ) : users.length === 0 ? (
          <Card>{searchTerm.trim() ? '沒有找到用戶。' : '請輸入以查詢用戶'}</Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {users.map((u) => (
              <Card key={u.user_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <img src={ensureAbsoluteUrl(u.profile_image || u.avatar_url || u.avatar || '') || '/placeholder-avatar.png'} alt="avatar" style={{ width: 72, height: 72, borderRadius: 36, objectFit: 'cover', border: '1px solid #eee' }} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{u.user_id}</div>
                      <div className="text-tiny" style={{ color: 'var(--gray-500)', marginTop: 6 }}>{u.username}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {(() => {
                      const current = (u._selectedStatus || u.statusNormalized || 'active')
                      const color = current === 'active' ? 'green' : current === 'suspended' ? 'red' : current === 'deleted' ? '#888' : 'black'

                      // Keep the select background white; only change the text color
                      const bg = '#ffffff'

                      return current === 'deleted' ? (
                        <select disabled style={{ padding: '8px 10px', borderRadius: 6, color, backgroundColor: bg, border: '1px solid #ddd' }}>
                          <option value="deleted">已刪除</option>
                        </select>
                      ) : (
                        <select value={current} onChange={(e) => {
                          const val = e.target.value
                          setUsers(prev => prev.map(x => x.user_id === u.user_id ? { ...x, _selectedStatus: val } : x))
                        }} style={{ padding: '8px 10px', borderRadius: 6, color, backgroundColor: bg, border: '1px solid #ddd' }}>
                          <option value="active" style={{ color: 'green' }}>帳號正常</option>
                          <option value="suspended" style={{ color: 'red' }}>帳號停用</option>
                        </select>
                      )
                    })()}
                    <Button variant="primary" onClick={async () => {
                      const newStatus = u._selectedStatus || u.status || 'active'
                      if (!window.confirm('確定要修改此用戶狀態嗎？')) return
                      try {
                        await adminAPI.updateUserStatus(u.user_id, newStatus)
                        // If the admin is currently searching, refresh the search
                        // results (which include `status`) so the displayed item
                        // remains on the search page but shows the persisted value.
                        if (searchTerm.trim()) {
                          const resp = await adminAPI.getUsers(searchTerm)
                          const serverUsers = (resp.users || []).map(uu => {
                            const statusNorm = normalizeStatus(uu.status)
                            return { ...uu, statusNormalized: statusNorm, _selectedStatus: statusNorm }
                          })
                          setUsers(serverUsers)
                        } else {
                          // not searching: reload full list
                          await loadUsers()
                        }
                        addToast('用戶狀態已更新', 'success')
                      } catch (err) {
                        console.error('Update user status failed', err)
                        addToast('更新失敗', 'error')
                      }
                    }}>修改</Button>
                    <Button variant="danger" onClick={async () => {
                      if (!window.confirm('確定要刪除此帳號？此操作會將帳號標記為已刪除，使用者將無法登入。')) return
                      try {
                        await adminAPI.deleteUser(u.user_id)
                        // If user performed a search, refresh the search results so
                        // the UI stays on the search page and shows the persisted state.
                        if (searchTerm.trim()) {
                          const resp = await adminAPI.getUsers(searchTerm)
                          const serverUsers = (resp.users || []).map(uu => {
                            const statusNorm = normalizeStatus(uu.status)
                            return { ...uu, statusNormalized: statusNorm, _selectedStatus: statusNorm }
                          })
                          setUsers(serverUsers)
                        } else {
                          await loadUsers()
                        }
                        addToast('帳號已刪除', 'success')
                      } catch (err) {
                        console.error('Delete user failed', err)
                        addToast('刪除失敗', 'error')
                      }
                    }}>刪除</Button>
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
