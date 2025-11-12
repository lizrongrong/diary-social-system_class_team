// API 服務層 - 連接後端 API
import axios from 'axios'

const DEFAULT_API_URL = 'http://localhost:3000/api/v1'
const envApiUrl = (import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE_URL || DEFAULT_API_URL).toString()
const sanitizedApiUrl = envApiUrl.replace(/\/+$/, '') || DEFAULT_API_URL

let parsedApiUrl
try {
  parsedApiUrl = new URL(sanitizedApiUrl, window.location.origin)
} catch (error) {
  console.warn('Invalid API URL provided, falling back to default:', error)
  parsedApiUrl = new URL(DEFAULT_API_URL)
}

export const API_ORIGIN = parsedApiUrl.origin

export const ensureAbsoluteUrl = (value = '') => {
  if (!value) return ''
  if (value.startsWith('data:') || /^https?:\/\//i.test(value)) {
    return value
  }
  if (value.startsWith('/')) {
    return `${API_ORIGIN}${value}`
  }
  return `${API_ORIGIN}/${value.replace(/^\/+/, '')}`
}

const API_URL = parsedApiUrl.href.replace(/\/+$/, '')

// 建立 axios 實例
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 請求攔截器 - 自動添加 token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 響應攔截器 - 處理錯誤
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't force-redirect for auth-related endpoints (login/register/etc.) to avoid
      // race-conditions where a 401 from an auth endpoint would immediately send the
      // user back to the login page.
      const url = error.config?.url || '';
      const authPaths = [
        '/auth/login',
        '/auth/register',
        '/auth/check-email',
        '/auth/send-verification',
        '/auth/verify-email',
        '/auth/forgot-password',
        '/auth/verify-reset',
        '/auth/reset-password'
      ];

      const isAuthEndpoint = authPaths.some(p => url.includes(p));

      // Only treat 401 as a session-expiry / logout when the backend returns
      // an explicit auth-related failure code. This avoids clearing session
      // when unrelated endpoints momentarily return 401 or during race
      // conditions. If the backend provides a code, respect it.
      const code = error.response?.data?.code;
      const authFailureCodes = ['TOKEN_EXPIRED', 'INVALID_TOKEN', 'NO_TOKEN', 'USER_NOT_FOUND'];

      if (code && authFailureCodes.includes(code)) {
        // clear token and redirect to login
        sessionStorage.removeItem('token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      // If there's no explicit code, do NOT automatically clear the token.
      // This prevents background or transient 401s from forcing a logout.
    }
    return Promise.reject(error)
  }
)

// 使用者 API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  },

  // Email verification (send code / verify code)
  sendVerification: async (email) => {
    const response = await api.post('/auth/send-verification', { email })
    return response.data
  },

  verifyEmailCode: async (email, code) => {
    const response = await api.post('/auth/verify-email', { email, code })
    return response.data
  },

  // 忘記密碼流程
  sendResetCode: async (email) => {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  },

  verifyResetCode: async (email, code) => {
    const response = await api.post('/auth/verify-reset', { email, code })
    return response.data
  },

  resetPassword: async (email, code, new_password) => {
    const response = await api.post('/auth/reset-password', { email, code, new_password })
    return response.data
  },

  checkUserId: async (user_id) => {
    const response = await api.post('/auth/check-userid', { user_id })
    return response.data
  },

  // 即時檢查 email 是否已被註冊
  checkEmail: async (email) => {
    const response = await api.post('/auth/check-email', { email })
    return response.data
  },

  logout: () => {
    sessionStorage.removeItem('token')
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  }
}

// 日記 API
export const diaryAPI = {
  getAll: async (params) => {
    const response = await api.get('/diaries', { params })
    return response.data
  },
  explore: async (params) => {
    const response = await api.get('/diaries/explore', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/diaries/${id}`)
    // Backend returns shape: { diary: { ... } }
    return response.data?.diary || response.data
  },

  create: async (diaryData) => {
    const response = await api.post('/diaries', diaryData)
    return response.data
  },

  update: async (id, diaryData) => {
    const response = await api.put(`/diaries/${id}`, diaryData)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/diaries/${id}`)
    return response.data
  },

  getUserPublicDiaries: async (userId, params) => {
    const response = await api.get(`/users/${userId}/diaries`, { params })
    return response.data
  }
}

// 使用者 API
export const userAPI = {
  getProfile: async () => {
    const res = await api.get('/users/profile')
    return res.data
  },
  updateProfile: async (data) => {
    const res = await api.put('/users/profile', data)
    return res.data
  },
  changePassword: async (data) => {
    const res = await api.put('/users/password', data)
    return res.data
  },
  getPublicById: async (userId) => {
    const res = await api.get(`/users/id/${userId}`)
    return res.data
  },
  getPublic: async (username) => {
    const res = await api.get(`/users/${username}`)
    return res.data
  },
  search: async (keyword, options = {}) => {
    const params = { keyword, ...options }
    const res = await api.get('/users/search', { params })
    return res.data
  }
}

// 檔案上傳 API
export const uploadAPI = {
  uploadAvatar: async (file) => {
    const formData = new FormData()
    formData.append('files', file)

    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    const [uploaded] = res.data?.files || []
    if (!uploaded) {
      return null
    }

    return {
      ...uploaded,
      absoluteUrl: ensureAbsoluteUrl(uploaded.url)
    }
  }
}

// 通知 API
export const notificationAPI = {
  getAll: async (params) => {
    const response = await api.get('/notifications', { params })
    return response.data
  },

  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`)
    return response.data
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all')
    return response.data
  },

  delete: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`)
    return response.data
  }
}

// 點讚 API
export const likeAPI = {
  toggle: async (targetType, targetId) => {
    // Backend expects camelCase: { targetType, targetId }
    const response = await api.post('/likes', {
      targetType,
      targetId
    })
    return response.data
  }
}

// 評論 API
export const commentAPI = {
  getByDiary: async (diaryId) => {
    const response = await api.get(`/comments/diary/${diaryId}`)
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/comments', data)
    return response.data
  },

  delete: async (commentId) => {
    const response = await api.delete(`/comments/${commentId}`)
    return response.data
  }
}

// 追蹤 / followers API
export const followAPI = {
  getAll: async () => {
    const response = await api.get('/followers')
    return response.data
  },

  add: async (targetUserId) => {
    // backend accepts following_id (preferred) or friend_id (legacy)
    const response = await api.post('/followers', { following_id: targetUserId })
    return response.data
  },

  remove: async (targetUserId) => {
    const response = await api.delete(`/followers/${targetUserId}`)
    return response.data
  },

  checkStatus: async (userId) => {
    const response = await api.get(`/followers/status/${userId}`)
    return response.data
  },
  getFollowing: async (userId) => {
    const response = await api.get(`/followers/${userId}/following`)
    return response.data
  },
  getFollowers: async (userId) => {
    const response = await api.get(`/followers/${userId}/followers`)
    return response.data
  },
  getCounts: async (userId) => {
    const response = await api.get(`/followers/${userId}/counts`)
    return response.data
  }
}

// 已統一使用 followAPI

export const luckyCardAPI = {
  getTodayFortune: async () => {
    const response = await api.get('/cards/today')
    return response.data
  },
  drawCard: async (cardSlot) => {
    const response = await api.post('/cards/draw', { cardSlot })
    return response.data
  }
}

// 訊息 API（輕量，對應 backend/src/routes/messages.js）
export const messageAPI = {
  getConversations: async () => {
    const res = await api.get('/messages')
    return res.data
  },

  getMessagesWith: async (otherId) => {
    const res = await api.get(`/messages/${otherId}/messages`)
    return res.data
  },

  sendMessageTo: async (otherId, payload) => {
    const res = await api.post(`/messages/${otherId}/messages`, payload)
    return res.data
  }
}

export default api
