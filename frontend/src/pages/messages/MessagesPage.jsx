import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { userAPI, messageAPI, uploadAPI, ensureAbsoluteUrl } from '../../services/api'
import Button from '../../components/ui/Button'
import { ArrowLeft, Image as ImageIcon, Mic, FileText, Smile, Send, Paperclip, Check, CheckCheck } from 'lucide-react'
import './MessagesPage.css'

function MessagesPage() {
  const { user } = useAuthStore()
  const { userId } = useParams()
  const location = useLocation()
  const followFromState = location.state?.follow
  const [follow, setFollow] = useState(followFromState || null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const listRef = useRef()
  const fileInputRef = useRef()

  // Polling for messages
  useEffect(() => {
    let interval
    const fetchMessages = async () => {
      try {
        const data = await messageAPI.getMessagesWith(userId)
        setMessages(data.messages || [])
      } catch (err) {
        console.error('Failed to fetch messages', err)
      }
    }

    const loadProfile = async () => {
      if (!follow) {
        try {
          const data = await userAPI.getPublicById(userId)
          setFollow(data?.user || data || { username: 'User' })
        } catch (err) {
          console.error('Failed to load profile', err)
          setFollow({ username: 'User' })
        }
      }
      setLoading(false)
    }

    loadProfile().then(() => {
        fetchMessages()
        interval = setInterval(fetchMessages, 3000) // Poll every 3s
    })

    return () => clearInterval(interval)
  }, [userId, follow])

  useEffect(() => {
    // Scroll to bottom on new messages
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (type = 'text', content = null) => {
    const textToSend = content || input.trim()
    if (!textToSend && type === 'text') return

    try {
      const payload = {
        type,
        content: textToSend
      }
      
      await messageAPI.sendMessageTo(userId, payload)
      
      if (type === 'text') setInput('')
      if (type === 'emoji') setShowEmojiPicker(false)
      
      // Refresh immediately
      const data = await messageAPI.getMessagesWith(userId)
      setMessages(data.messages || [])
    } catch (err) {
      console.error('Send failed', err)
      alert('發送失敗')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const res = await uploadAPI.uploadFile(file)
      const fileUrl = res.url
      
      let type = 'file'
      if (file.type.startsWith('image/')) type = 'image'
      else if (file.type.startsWith('audio/')) type = 'audio'
      
      await handleSend(type, fileUrl)
    } catch (err) {
      console.error('Upload failed', err)
      alert('上傳失敗')
    } finally {
      e.target.value = '' // reset
    }
  }

  const formatTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const renderMessageContent = (msg) => {
    switch (msg.message_type) {
      case 'image':
        return <img src={ensureAbsoluteUrl(msg.content)} alt="image" className="msg-image" style={{maxWidth: '200px', borderRadius: '8px'}} />
      case 'audio':
        return <audio controls src={ensureAbsoluteUrl(msg.content)} className="msg-audio" />
      case 'file':
        return (
            <a href={ensureAbsoluteUrl(msg.content)} target="_blank" rel="noopener noreferrer" className="msg-file">
                <FileText size={20} />
                <span>附件檔案</span>
            </a>
        )
      case 'emoji':
        return <span style={{fontSize: '2rem'}}>{msg.content}</span>
      default:
        return <p>{msg.content}</p>
    }
  }

  if (loading) return <div className="page-loading">載入中...</div>

  return (
    <div className="page messages-page">
      <header className="chat-header">
        <Link to="/follows" className="back-link">
          <ArrowLeft size={20} />
        </Link>
        <div className="chat-user-info">
            <div className="chat-avatar" style={{backgroundImage: `url(${follow?.avatar_url || follow?.profile_image || '/default-avatar.png'})`}}></div>
            <h3>{follow?.username || follow?.display_name}</h3>
        </div>
      </header>

      <div className="message-list" ref={listRef}>
        {messages.map((msg) => {
            const isMe = String(msg.sender_id) === String(user.user_id)
            return (
                <div key={msg.message_id} className={`message-row ${isMe ? 'me' : 'other'}`}>
                    {!isMe && <div className="msg-avatar" style={{backgroundImage: `url(${follow?.avatar_url || follow?.profile_image || '/default-avatar.png'})`}}></div>}
                    <div className="message-bubble">
                        {renderMessageContent(msg)}
                        <div className="message-meta">
                            <span className="message-time">{formatTime(msg.created_at)}</span>
                            {isMe && (
                                <span className="read-status">
                                    {msg.is_read ? '已讀' : '未讀'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )
        })}
      </div>

      <div className="chat-input-area">
        <input 
            type="file" 
            ref={fileInputRef} 
            style={{display: 'none'}} 
            onChange={handleFileUpload}
        />
        
        <button className="icon-btn" onClick={() => fileInputRef.current.click()}>
            <Paperclip size={20} />
        </button>
        
        <div className="emoji-wrapper">
            <button className="icon-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                <Smile size={20} />
            </button>
            {showEmojiPicker && (
                <div className="emoji-picker">
                    {['😀','😂','😍','🥺','😎','👍','👎','❤️','🎉','🔥'].map(emoji => (
                        <span key={emoji} onClick={() => handleSend('emoji', emoji)}>{emoji}</span>
                    ))}
                </div>
            )}
        </div>

        <input 
            type="text" 
            className="text-input" 
            placeholder="輸入訊息..." 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        
        <button className="send-btn" onClick={() => handleSend()}>
            <Send size={20} />
        </button>
      </div>
    </div>
  )
}

export default MessagesPage
