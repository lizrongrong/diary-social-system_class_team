const Diary = require('../models/Diary');
const Like = require('../models/Like');
const Comment = require('../models/Comment');

/**
 * 建�??�日�?
 * @route POST /api/v1/diaries
 * @access Private
 */
exports.createDiary = async (req, res) => {
  try {
    const { title, content, visibility, status, tags, media } = req.body;

    // 建�??��?
    const diaryId = await Diary.create({
      user_id: req.user.user_id,
      title,
      content,
      visibility: visibility || 'private',
      status: status || 'published'
    });

    // ?��?標籤（�??��?�?
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        await Diary.addTag(diaryId, tag.type || tag.tag_type, tag.value || tag.tag_value);
      }
    }

    // ?��??�件（�??��?�?
    if (media && Array.isArray(media)) {
      for (const file of media) {
        await Diary.addMedia(diaryId, file.url, file.type || 'image', file.size);
      }
    }

    // ?��?完整?�日記�???
    const diary = await Diary.findById(diaryId);
    const diaryTags = await Diary.getTags(diaryId);
    const diaryMedia = await Diary.getMedia(diaryId);

    res.status(201).json({
      message: 'Diary created successfully',
      diary: {
        ...diary,
        tags: diaryTags,
        media: diaryMedia
      }
    });
  } catch (error) {
    console.error('Create diary error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * ?��?使用?��??��??�表
 * @route GET /api/v1/diaries
 * @access Private
 */
exports.getDiaries = async (req, res) => {
  try {
    console.log('=== getDiaries called ===');
    console.log('Query params:', req.query);
    console.log('User ID:', req.user?.user_id);

    // If this route was reached without authentication, return 401 instead of causing DB errors
    if (!req.user || !req.user.user_id) {
      console.warn('getDiaries: unauthenticated request');
      return res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
    }

    const { visibility, status, page = 1, limit = 20, orderBy = 'created_at', order = 'DESC' } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const pageNum = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
    const limitNum = Math.max(1, Math.min(100, isNaN(parsedLimit) ? 20 : parsedLimit));
    const offset = (pageNum - 1) * limitNum;

    // Sanitize orderBy - only allow specific columns to avoid SQL injection
    const allowedOrderBy = ['created_at', 'published_at', 'updated_at'];
    const orderBySafe = allowedOrderBy.includes(orderBy) ? orderBy : 'created_at';
    const orderSafe = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    console.log('Parsed params:', { visibility, status, pageNum, limitNum, offset });

    const diaries = await Diary.findByUserId(req.user.user_id, {
      visibility,
      status: status || null, // null 表示不限制狀態
      limit: limitNum,
      offset: offset,
      orderBy: orderBySafe,
      order: orderSafe
    });

    console.log('Found diaries (raw):', Array.isArray(diaries) ? diaries.length : typeof diaries);

    // Defensive: ensure diaries is always an array to avoid runtime errors
    const safeDiaries = Array.isArray(diaries) ? diaries : [];

    // 為每篇日記取標籤與社交數據（容錯處理單篇失敗不影響整體）
    const diariesWithTags = await Promise.all(
      safeDiaries.map(async (diary) => {
        try {
          const tags = await Diary.getTags(diary.diary_id);
          const likeCount = await Like.count('diary', diary.diary_id);
          const comments = await Comment.findByDiary(diary.diary_id);
          return {
            ...diary,
            tags,
            like_count: likeCount,
            comment_count: comments.length
          };
        } catch (innerErr) {
          console.error('Error enriching diary:', diary && diary.diary_id, innerErr && innerErr.stack ? innerErr.stack : innerErr);
          // return the diary basic shape so the client still gets it
          return {
            ...diary,
            tags: [],
            like_count: 0,
            comment_count: 0
          };
        }
      })
    );

    const totalCount = await Diary.countByUserId(req.user.user_id);

    // Use parsed numeric values for pagination to avoid NaN
    const respPage = pageNum;
    const respLimit = limitNum;

    res.json({
      diaries: diariesWithTags,
      pagination: {
        page: respPage,
        limit: respLimit,
        total: totalCount || 0,
        totalPages: respLimit > 0 ? Math.ceil((totalCount || 0) / respLimit) : 0
      }
    });
  } catch (error) {
    console.error('Get diaries error:', error && error.stack ? error.stack : error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * ?��??��??��?
 * @route GET /api/v1/diaries/:id
 * @access Private/Public (?��??��???
 */
exports.getDiaryById = async (req, res) => {
  try {
    const { id } = req.params;

    const diary = await Diary.findById(id);

    if (!diary) {
      return res.status(404).json({
        error: 'Diary not found',
        code: 'DIARY_NOT_FOUND'
      });
    }

    // 檢查權�?：�?密日記只?��??�可以�?
    if (diary.visibility === 'private') {
      if (!req.user || diary.user_id !== req.user.user_id) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
          message: '此日記為私�?，�?作者可?��?'
        });
      }
    }

    const tags = await Diary.getTags(id);
    const media = await Diary.getMedia(id);

    // Get social stats
    const likeCount = await Like.count('diary', id);
    const isLiked = req.user?.user_id ? await Like.isLiked('diary', id, req.user.user_id) : false;
    const comments = await Comment.findByDiary(id);

    res.json({
      diary: {
        ...diary,
        tags,
        media,
        like_count: likeCount,
        is_liked: isLiked,
        comment_count: comments.length
      }
    });
  } catch (error) {
    console.error('Get diary by id error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * ?�新?��?
 * @route PUT /api/v1/diaries/:id
 * @access Private
 */
exports.updateDiary = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, visibility, status, tags, media } = req.body;

    // 檢查?��??�否存在
    const diary = await Diary.findById(id);
    if (!diary) {
      return res.status(404).json({
        error: 'Diary not found',
        code: 'DIARY_NOT_FOUND'
      });
    }

    // 檢查?�?��?
    const isOwner = await Diary.isOwner(id, req.user.user_id);
    if (!isOwner) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED',
        message: '?��??��??�編輯此?��?'
      });
    }

    // ?�新?��?
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (visibility !== undefined) updates.visibility = visibility;
    if (status !== undefined) updates.status = status;

    await Diary.update(id, updates);

    // ?�新標籤
    if (tags && Array.isArray(tags)) {
      await Diary.deleteTags(id);
      for (const tag of tags) {
        await Diary.addTag(id, tag.type || tag.tag_type, tag.value || tag.tag_value);
      }
    }

    // ?�新?�件
    if (media && Array.isArray(media)) {
      await Diary.deleteAllMedia(id);
      for (const file of media) {
        await Diary.addMedia(id, file.url, file.type || 'image', file.size);
      }
    }

    // ?��??�新後�??��?
    const updatedDiary = await Diary.findById(id);
    const updatedTags = await Diary.getTags(id);
    const updatedMedia = await Diary.getMedia(id);

    res.json({
      message: 'Diary updated successfully',
      diary: {
        ...updatedDiary,
        tags: updatedTags,
        media: updatedMedia
      }
    });
  } catch (error) {
    console.error('Update diary error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 
 * @route DELETE /api/v1/diaries/:id
 * @access Private
 */
exports.deleteDiary = async (req, res) => {
  try {
    const { id } = req.params;

    // 檢查?�?��?
    const isOwner = await Diary.isOwner(id, req.user.user_id);
    if (!isOwner) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED',
        message: '?��??��??�刪?�此?��?'
      });
    }

    // 
    const success = await Diary.delete(id);

    if (!success) {
      return res.status(404).json({
        error: 'Diary not found',
        code: 'DIARY_NOT_FOUND'
      });
    }

    res.json({
      message: 'Diary deleted successfully',
      code: 'DIARY_DELETED'
    });
  } catch (error) {
    console.error('Delete diary error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * ?�索?��??��?
 * @route GET /api/v1/diaries/explore
 * @access Public
 */
exports.exploreDiaries = async (req, res) => {
  try {
    const { page = 1, limit = 20, orderBy = 'created_at', order = 'DESC' } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const pageNum = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
    const limitNum = Math.max(1, Math.min(100, isNaN(parsedLimit) ? 20 : parsedLimit));
    const offset = (pageNum - 1) * limitNum;

    const diaries = await Diary.findPublic({
      limit: limitNum,
      offset: offset,
      orderBy,
      order
    });

    // ?��?篇日記�?得�?籤�??�件
    const diariesWithTags = await Promise.all(
      diaries.map(async (diary) => {
        const tags = await Diary.getTags(diary.diary_id);
        const media = await Diary.getMedia(diary.diary_id);
        const likeCount = await Like.count('diary', diary.diary_id);
        const isLiked = req.user?.user_id ? await Like.isLiked('diary', diary.diary_id, req.user.user_id) : false;
        const comments = await Comment.findByDiary(diary.diary_id);
        return {
          ...diary,
          tags,
          media,
          like_count: likeCount,
          is_liked: isLiked,
          comment_count: comments.length
        };
      })
    );

    res.json({
      diaries: diariesWithTags,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    // log full stack locally but don't leak details to clients
    console.error('Explore diaries error:', error && error.stack ? error.stack : error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 
 * @route GET /api/v1/diaries/search
 * @access Public
 */
exports.searchDiaries = async (req, res) => {
  try {
    const {
      keyword,
      emotion,
      weather,
      dateFrom,
      dateTo,
      sortBy = 'created_at',
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    const diaries = await Diary.search({
      keyword,
      emotion,
      weather,
      dateFrom,
      dateTo,
      sortBy,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });


    const diariesWithDetails = await Promise.all(
      diaries.map(async (diary) => {
        const tags = await Diary.getTags(diary.diary_id);
        const media = await Diary.getMedia(diary.diary_id);
        const likeCount = await Like.count('diary', diary.diary_id);
        const isLiked = req.user?.user_id ? await Like.isLiked('diary', diary.diary_id, req.user.user_id) : false;
        const comments = await Comment.findByDiary(diary.diary_id);
        return {
          ...diary,
          tags,
          media,
          like_count: likeCount,
          is_liked: isLiked,
          comment_count: comments.length
        };
      })
    );

    res.json({
      diaries: diariesWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      },
      filters: {
        keyword,
        emotion,
        weather,
        dateFrom,
        dateTo,
        sortBy
      }
    });
  } catch (error) {
    console.error('Search diaries error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};
