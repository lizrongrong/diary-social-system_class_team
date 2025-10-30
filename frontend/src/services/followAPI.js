// Deprecated: This module is intentionally disabled.
// Use friendAPI from services/api.js instead.

const notAvailable = () => {
  throw new Error('followAPI is removed. Use friendAPI instead.');
};

export const toggleFollow = notAvailable;
export const getFollowers = notAvailable;
export const getFollowing = notAvailable;
export const getFollowStatus = notAvailable;

export default { toggleFollow, getFollowers, getFollowing, getFollowStatus };
