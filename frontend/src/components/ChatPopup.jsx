import React, { useState, useEffect, useRef } from 'react'
import useChatStore from '../store/chatStore'
import useAuthStore from '../store/authStore'
import { uploadAPI, ensureAbsoluteUrl } from '../services/api'
import { X, Image as ImageIcon, Paperclip, Smile, Send, FileText } from 'lucide-react'
import './ChatPopup.css'

export default function ChatPopup() {
  const { open, otherId, otherMeta, messages, loading, close, sendMessage, openConversation } = useChatStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const listRef = useRef()
  const fileInputRef = useRef()

  useEffect(() => {
    if (open && otherId) {
      openConversation(otherId, otherMeta)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, otherId])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  if (!open) return null

  const handleSend = async (type = 'text', content = null) => {
    const textToSend = content || input.trim()
    if (!textToSend && type === 'text') return

    await sendMessage(textToSend, type)
    
    if (type === 'text') setInput('')
    if (type === 'emoji') setShowEmojiPicker(false)
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

  const renderMessageContent = (msg) => {
    const type = msg.message_type || msg.type || 'text'
    const content = msg.text || msg.content || ''
    
    switch (type) {
      case 'image':
        return <img src={ensureAbsoluteUrl(content)} alt="image" className="chat-msg-image" />
      case 'audio':
        return <audio controls src={ensureAbsoluteUrl(content)} className="chat-msg-audio" />
      case 'file':
        return (
            <a href={ensureAbsoluteUrl(content)} target="_blank" rel="noopener noreferrer" className="chat-msg-file">
                <FileText size={16} />
                <span>附件</span>
            </a>
        )
      case 'emoji':
        return <span style={{fontSize: '1.5rem'}}>{content}</span>
      default:
        // Detect URLs and make them clickable
        const parts = content.split(/(https?:\/\/[^\s]+)/g);
        return (
            <span>
                {parts.map((part, i) => {
                    if (part.match(/^https?:\/\//)) {
                        return (
                            <a 
                                key={i} 
                                href={part} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: '#4a90e2', textDecoration: 'underline', wordBreak: 'break-all' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {part}
                            </a>
                        )
                    }
                    return part
                })}
            </span>
        )
    }
  }

  return (
    <div className="chat-popup" role="dialog" aria-label="聊天視窗">
      <div className="chat-header">
        <div className="chat-title">
            {(() => {
              const avatarCandidate = otherMeta?.avatar || otherMeta?.avatar_url || otherMeta?.profile_image || otherMeta?.profileImage
              const resolved = avatarCandidate ? ensureAbsoluteUrl(avatarCandidate) : ''
              const name = otherMeta?.username || otherMeta?.name || ''
              const initial = (name || '').trim().charAt(0).toUpperCase()
              return (
                <div
                  className="chat-avatar-small"
                  style={resolved ? { backgroundImage: `url(${resolved})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
                >
                  {!resolved && (initial || ' ')}
                </div>
              )
            })()}
            <span className="chat-name">{otherMeta?.username || otherMeta?.name || `使用者 ${otherId}`}</span>
        </div>
        <button onClick={close} className="chat-close"><X size={18} /></button>
      </div>
      
      <div ref={listRef} className="chat-messages">
        {loading ? (<div className="chat-loading">載入中...</div>) : (
          messages.length === 0 ? (
            <div className="chat-empty">尚無訊息</div>
          ) : (
            messages.map(m => {
               const isMe = String(m.from) === String(user?.id || user?.user_id)
               return (
                <div key={m.id || m.created_at} className={`chat-msg ${isMe ? 'me' : 'them'}`}>
                    <div className="chat-msg-bubble">
                        {renderMessageContent(m)}
                    </div>
                    <div className="chat-msg-meta">
                        <span className="chat-msg-time">{new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        {isMe && <span className="chat-read-status">{m.is_read ? '已讀' : '未讀'}</span>}
                    </div>
                </div>
              )
            })
          )
        )}
      </div>

      <div className="chat-input-area">
         <input 
            type="file" 
            ref={fileInputRef} 
            style={{display: 'none'}} 
            onChange={handleFileUpload}
        />
        
        <div className="chat-tools">
            <button className="tool-btn" onClick={() => fileInputRef.current.click()}>
                <Paperclip size={18} />
            </button>
            <div className="emoji-wrapper-popup">
                <button className="tool-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                    <Smile size={18} />
                </button>
                {showEmojiPicker && (
                    <div className="emoji-picker-popup">
                        {['😀','😂','😍','🥺','😎','👍','👎','❤️','🎉','🔥'].map(emoji => (
                            <span key={emoji} onClick={() => handleSend('emoji', emoji)}>{emoji}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>

        <div className="chat-input-row">
            <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }} 
                placeholder="輸入訊息..." 
            />
            <button className="send-btn-small" onClick={() => handleSend()}>
                <Send size={16} />
            </button>
        </div>
      </div>
    </div>
  )
}
