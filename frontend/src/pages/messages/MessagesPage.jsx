import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { userAPI } from '../../services/api'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import './MessagesPage.css'

function MessagesPage() {
  const { user } = useAuthStore()
  const { userId } = useParams()
  const location = useLocation()
  const friendFromState = location.state?.friend
  const [friend, setFriend] = useState(friendFromState || null)
  const [loading, setLoading] = useState(!friendFromState)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const listRef = useRef()

  // chat key to save to localStorage: deterministic by user ids
  const chatKey = (() => {
    if (!user || !userId) return null
    const a = String(user.id)
    const b = String(userId)
    return `chat_${[a,b].sort().join('_')}`
  })()

  useEffect(() => {
    const load = async () => {
      if (!friend) {
        try {
          setLoading(true)
          const res = await userAPI.getProfile(userId)
          // userAPI.getProfile returns axios response; try to get data
          setFriend(res.data?.user || res.data || null)
        } catch (err) {
          console.error('Failed to load friend profile', err)
          setFriend({ display_name: '未知使用者', username: userId })
        } finally {
          setLoading(false)
        }
      }

      // load local messages
      if (chatKey) {
        try {
          const raw = localStorage.getItem(chatKey)
          const arr = raw ? JSON.parse(raw) : []
          // normalize to newest-first by sorting descending on created_at
          arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          setMessages(arr)
        } catch (e) {
          setMessages([])
        }
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    // for newest-first layout, scroll to top when messages change
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [messages])

  const persist = (next) => {
    setMessages(next)
    if (chatKey) localStorage.setItem(chatKey, JSON.stringify(next))
  }

  const handleSend = () => {
    if (!input.trim()) return
    const msg = {
      id: Date.now(),
      from: user.id,
      to: Number(userId),
      text: input.trim(),
      created_at: new Date().toISOString()
    }
    // newest-first: put new message at the beginning
    const next = [msg, ...messages]
    persist(next)
    setInput('')
  }

  if (loading) return (
    <div className="page messages-page" style={{ padding: 'var(--spacing-xl)' }}>
      <div>載入中...</div>
    </div>
  )

  return (
    <div className="page messages-page" style={{ padding: 'var(--spacing-xl)', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
        <Link to="/friends">
          <Button variant="ghost"><ArrowLeft size={16} /> 返回好友</Button>
        </Link>
        <h2 className="text-h3">與 {friend?.display_name || friend?.username}</h2>
      </div>

      <Card style={{ padding: 0, display: 'flex', flexDirection: 'column', height: 500 }}>
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-md)' }}>
          {messages.length === 0 ? (
            <div style={{ color: 'var(--gray-600)', textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>尚無訊息，來打個招呼吧！</div>
          ) : (
            messages.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.from === user.id ? 'flex-end' : 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                <div style={{ maxWidth: '70%', padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: 8, background: m.from === user.id ? 'var(--primary-purple)' : 'var(--gray-100)', color: m.from === user.id ? '#fff' : 'inherit' }}>
                  <div style={{ fontSize: '0.9rem' }}>{m.text}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: '4px', textAlign: 'right' }}>{new Date(m.created_at).toLocaleTimeString('zh-TW')}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', padding: 'var(--spacing-md)', borderTop: '1px solid var(--gray-100)' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
            placeholder={`傳送訊息給 ${friend?.display_name || friend?.username}`}
            style={{ flex: 1, padding: 'var(--spacing-sm)', borderRadius: 6, border: '1px solid var(--gray-200)' }}
          />
          <Button variant="primary" onClick={handleSend}>送出</Button>
        </div>
      </Card>
    </div>
  )
}

export default MessagesPage
