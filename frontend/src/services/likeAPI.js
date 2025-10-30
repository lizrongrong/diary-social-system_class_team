import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const toggleLike = async (targetType, targetId) => {
  const response = await api.post('/likes', { targetType, targetId });
  return response.data;
};

export const getLikeStatus = async (targetType, targetId) => {
  const response = await api.get(`/likes/${targetType}/${targetId}`);
  return response.data;
};

export default { toggleLike, getLikeStatus };
