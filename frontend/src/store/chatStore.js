import { create } from 'zustand'
import { messageAPI } from '../services/api'
import useAuthStore from './authStore'

const useChatStore = create((set, get) => ({
  open: false,
  otherId: null,
  otherMeta: null,
  messages: [],
  loading: false,

  openConversation: async (otherId, meta = null) => {
    set({ open: true, otherId, otherMeta: meta, loading: true })
    try {
      const res = await messageAPI.getMessagesWith(otherId)
      const raw = res?.messages || res || []
      // normalize to a consistent shape used by the UI: { id, from, to, text, created_at }
      const msgs = (Array.isArray(raw) ? raw : []).map(m => ({
        id: m.id || m.message_id || String(Date.now()),
        from: m.from || m.sender_id || m.user_id || null,
        to: m.to || m.receiver_id || null,
        text: m.text || m.content || m.body || '',
        created_at: m.created_at || m.createdAt || m.created_at
      }))
      // normalize to oldest-first so newest messages render at the bottom
      msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      set({ messages: msgs, loading: false })
    } catch (e) {
      console.error('Failed to load conversation', e)
      // fallback: try reading localStorage
      try {
        const user = useAuthStore.getState().user
        const a = String(user?.id || user?.user_id || '')
        const b = String(otherId)
        const key = `chat_${[a, b].sort().join('_')}`
        const raw = localStorage.getItem(key)
        const arr = raw ? JSON.parse(raw) : []
        arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        set({ messages: arr, loading: false })
      } catch (e2) {
        set({ messages: [], loading: false })
      }
    }
  },

  close: () => set({ open: false, otherId: null, messages: [], otherMeta: null }),

  sendMessage: async (text) => {
    const { otherId, messages } = get()
    const user = useAuthStore.getState().user
    if (!otherId || !text || !text.trim()) return
    const payload = { text: text.trim() }
    try {
      const res = await messageAPI.sendMessageTo(otherId, payload)
      const savedRaw = res?.message || res
      const saved = {
        id: savedRaw.id || savedRaw.message_id || String(Date.now()),
        from: savedRaw.from || savedRaw.sender_id || (useAuthStore.getState().user?.user_id),
        to: savedRaw.to || savedRaw.receiver_id || otherId,
        text: savedRaw.text || savedRaw.content || '',
        created_at: savedRaw.created_at || new Date().toISOString()
      }
      // append to end (oldest-first ordering)
      const next = [...messages, saved]
      set({ messages: next })
      return saved
    } catch (e) {
      console.error('Failed to send message', e)
      const optimistic = {
        id: Date.now(),
        from: user?.id || user?.user_id || 'me',
        to: otherId,
        text: text.trim(),
        created_at: new Date().toISOString()
      }
  set({ messages: [...messages, optimistic] })
      // persist to localStorage as fallback
      try {
        const a = String(user?.id || user?.user_id || '')
        const b = String(otherId)
        const key = `chat_${[a, b].sort().join('_')}`
        const raw = localStorage.getItem(key)
  const arr = raw ? JSON.parse(raw) : []
  arr.push(optimistic)
        localStorage.setItem(key, JSON.stringify(arr))
      } catch (e2) { /* ignore */ }
      return optimistic
    }
  }
}))

export default useChatStore
