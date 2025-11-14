const Comment = require('../models/Comment');
const Like = require('../models/Like');
const Notification = require('../models/Notification');
const Diary = require('../models/Diary');

exports.createComment = async (req, res) => {
  try {
    const { diaryId, content, parentCommentId } = req.body;
    const userId = req.user.user_id;

    if (!content || content.length > 1000) {
      return res.status(400).json({ message: 'Invalid comment content' });
    }

    const commentId = await Comment.create(diaryId, userId, content, parentCommentId);
    const comment = await Comment.findById(commentId);

    try {
      const diary = await Diary.findById(diaryId);
      if (diary && diary.user_id !== userId) {
        await Notification.create(
          diary.user_id,
          'comment',
          '新的留言',
          `${req.user.username} 留言了：${content.substring(0, 50)}...`,
          userId,
          diaryId
        );
      }

      if (parentCommentId) {
        const parentComment = await Comment.findById(parentCommentId);
        if (parentComment && parentComment.user_id !== userId) {
          await Notification.create(
            parentComment.user_id,
            'comment',
            '新的回覆',
            `${req.user.username} 回覆了你的留言：${content.substring(0, 50)}...`,
            userId,
            diaryId
          );
        }
      }
    } catch (notificationError) {
      console.error('Create comment notification error:', notificationError);
    }

    res.status(201).json({
      ...comment,
      like_count: 0,
      is_liked: false
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { diaryId } = req.params;
    const userId = req.user?.userId;

    let comments = await Comment.findByDiary(diaryId);

    // Add like status for each comment
    if (userId) {
      comments = await Promise.all(comments.map(async (c) => {
        const likeCount = await Like.count('comment', c.comment_id);
        const isLiked = await Like.isLiked('comment', c.comment_id, userId);
        return { ...c, like_count: likeCount, is_liked: isLiked };
      }));
    } else {
      comments = await Promise.all(comments.map(async (c) => {
        const likeCount = await Like.count('comment', c.comment_id);
        return { ...c, like_count: likeCount, is_liked: false };
      }));
    }

    // Organize with replies
    const topLevel = comments.filter(c => !c.parent_comment_id);
    const replies = comments.filter(c => c.parent_comment_id);

    const organized = topLevel.map(c => ({
      ...c,
      replies: replies.filter(r => r.parent_comment_id === c.comment_id)
    }));

    res.json(organized);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.user_id;

    const isOwner = await Comment.isOwner(commentId, userId);
    if (!isOwner) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await Comment.delete(commentId);
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
