import React, { useState, useEffect, useRef } from 'react'
import useChatStore from '../store/chatStore'
import useAuthStore from '../store/authStore'
import Button from './ui/Button'
import './ChatPopup.css'

export default function ChatPopup() {
  const { open, otherId, otherMeta, messages, loading, close, sendMessage, openConversation } = useChatStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const listRef = useRef()

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

  const handleSend = async () => {
    if (!input.trim()) return
    await sendMessage(input)
    setInput('')
  }

  return (
    <div className="chat-popup" role="dialog" aria-label="聊天視窗">
      <div className="chat-header">
        <div style={{ fontWeight: 700 }}>{otherMeta?.username || `使用者 ${otherId}`}</div>
        <button onClick={close} className="chat-close">✕</button>
      </div>
      <div ref={listRef} className="chat-messages">
        {loading ? (<div className="chat-loading">載入中...</div>) : (
          messages.length === 0 ? (
            <div className="chat-empty">尚無訊息</div>
          ) : (
            messages.map(m => (
              <div key={m.id || m.created_at} className={`chat-msg ${String(m.from) === String(user?.id || user?.user_id) ? 'me' : 'them'}`}>
                <div className="chat-msg-bubble">{m.text}</div>
                <div className="chat-msg-time">{new Date(m.created_at).toLocaleTimeString('zh-TW')}</div>
              </div>
            ))
          )
        )}
      </div>
      <div className="chat-input-row">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }} placeholder={`傳送訊息給 ${otherMeta?.username || otherId}`} />
        <Button variant="primary" onClick={handleSend}>送出</Button>
      </div>
    </div>
  )
}
