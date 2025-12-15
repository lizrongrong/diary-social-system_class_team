import api from './api';

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
