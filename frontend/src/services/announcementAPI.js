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
  const token = sessionStorage.getItem('token')
  const res = await api.put(`/announcements/${announcementId}/read`, null, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export const getReadsForUser = async () => {
  const token = sessionStorage.getItem('token')
  const res = await api.get('/announcements/reads', { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export const updateAnnouncement = async (id, payload) => {
  const token = sessionStorage.getItem('token')
  const res = await api.put(`/admin/announcements/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export const getById = async (id) => {
  const token = sessionStorage.getItem('token')
  const res = await api.get(`/admin/announcements/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  return res.data
}

export default { getActive, markAsRead, getReadsForUser, updateAnnouncement }
