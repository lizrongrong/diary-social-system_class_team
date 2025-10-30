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

export const getComments = async (diaryId) => {
  const response = await api.get(`/comments/diary/${diaryId}`);
  return response.data;
};

export const createComment = async (diaryId, content, parentCommentId = null) => {
  const response = await api.post('/comments', { diaryId, content, parentCommentId });
  return response.data;
};

export const deleteComment = async (commentId) => {
  const response = await api.delete(`/comments/${commentId}`);
  return response.data;
};

export default { getComments, createComment, deleteComment };
