import axios from 'axios'

const API_URL = 'http://localhost:3000/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const getActive = async (limit = 10, offset = 0) => {
  const res = await api.get('/announcements/active', { params: { limit, offset } })
  return res.data
}

export const markAsRead = async (announcementId) => {
  const res = await api.put(`/announcements/${announcementId}/read`)
  return res.data
}

export default { getActive, markAsRead }
