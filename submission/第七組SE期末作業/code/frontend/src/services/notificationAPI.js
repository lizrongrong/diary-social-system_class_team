import api from './api';

export const getNotifications = async (limit = 20, offset = 0) => {
  const response = await api.get('/notifications', { params: { limit, offset } });
  return response.data;
};

export const markAsRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};

export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};

export default { getNotifications, markAsRead, markAllAsRead, deleteNotification };
