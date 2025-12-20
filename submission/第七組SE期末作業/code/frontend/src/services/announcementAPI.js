import api from './api'

export const getActive = async (limit = 10, offset = 0) => {
  const res = await api.get('/announcements/active', { params: { limit, offset } })
  return res.data
}

export const markAsRead = async (announcementId) => {
  const res = await api.put(`/announcements/${announcementId}/read`)
  return res.data
}

export const getReadsForUser = async () => {
  const res = await api.get('/announcements/reads')
  return res.data
}

export const updateAnnouncement = async (id, payload) => {
  const res = await api.put(`/admin/announcements/${id}`, payload)
  return res.data
}

export const getById = async (id) => {
  const res = await api.get(`/admin/announcements/${id}`)
  return res.data
}

export default { getActive, markAsRead, getReadsForUser, updateAnnouncement }
