const Like = require('../models/Like');
const Notification = require('../models/Notification');
const Diary = require('../models/Diary');

exports.toggleLike = async (req, res) => {
  try {
    const { targetType, targetId } = req.body;
    const userId = req.user.user_id;

    if (!['diary', 'comment'].includes(targetType)) {
      return res.status(400).json({ message: 'Invalid target type' });
    }

    const result = await Like.toggle(targetType, targetId, userId);
    const count = await Like.count(targetType, targetId);

    // Create notification if liked
    if (result.liked && targetType === 'diary') {
      try {
        const diary = await Diary.findById(targetId);
        if (diary && diary.user_id !== userId) {
          await Notification.create(
            diary.user_id,
            'like',
            '新的按讚',
            `${req.user.username} 對你的日記按了讚`,
            userId,
            targetId
          );
        }
      } catch (notifyError) {
        console.error('Failed to create like notification:', notifyError);
      }
    }

    res.json({ ...result, count });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLikeStatus = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const userId = req.user?.userId;

    const count = await Like.count(targetType, targetId);
    const isLiked = userId ? await Like.isLiked(targetType, targetId, userId) : false;

    res.json({ count, isLiked });
  } catch (error) {
    console.error('Get like status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
