// API 服務層 - 連接後端 API
import axios from 'axios'

const API_URL = 'http://localhost:3000/api/v1'

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
    const token = localStorage.getItem('token')
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
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 使用者 API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }
    return response.data
  },
  
  register: async (userData) => {
    const response = await api.post('/auth/register', userData)
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }
    return response.data
  },
  
  checkUserId: async (user_id) => {
    const response = await api.post('/auth/check-userid', { user_id })
    return response.data
  },
  
  logout: () => {
    localStorage.removeItem('token')
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
    return response
  }
}

// 使用者 API
export const userAPI = {
  getProfile: async (userId) => {
    // 如果有 userId，獲取該用戶的公開資料；否則獲取自己的資料
    const url = userId ? `/users/${userId}` : '/users/profile'
    const res = await api.get(url)
    return res
  },
  updateProfile: async (data) => {
    const res = await api.put('/users/profile', data)
    return res.data
  },
  changePassword: async (data) => {
    const res = await api.put('/users/password', data)
    return res.data
  },
  getPublic: async (username) => {
    const res = await api.get(`/users/${username}`)
    return res.data
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

// 好友 API
export const friendAPI = {
  getAll: async () => {
    const response = await api.get('/friends')
    return response.data
  },
  
  add: async (friendId) => {
    const response = await api.post('/friends', { friend_id: friendId })
    return response.data
  },
  
  remove: async (friendId) => {
    const response = await api.delete(`/friends/${friendId}`)
    return response.data
  },
  
  checkStatus: async (userId) => {
    const response = await api.get(`/friends/status/${userId}`)
    return response.data
  },
  getFollowing: async (userId) => {
    const response = await api.get(`/friends/${userId}/following`)
    return response.data
  },
  getFollowers: async (userId) => {
    const response = await api.get(`/friends/${userId}/followers`)
    return response.data
  },
  getCounts: async (userId) => {
    const response = await api.get(`/friends/${userId}/counts`)
    return response.data
  }
}

export default api
