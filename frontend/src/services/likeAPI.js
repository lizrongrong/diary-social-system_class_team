import api from './api';

export const toggleLike = async (targetType, targetId) => {
  const response = await api.post('/likes', { targetType, targetId });
  return response.data;
};

export const getLikeStatus = async (targetType, targetId) => {
  const response = await api.get(`/likes/${targetType}/${targetId}`);
  return response.data;
};

export default { toggleLike, getLikeStatus };
