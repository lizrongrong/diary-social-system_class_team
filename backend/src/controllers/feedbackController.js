const Feedback = require('../models/Feedback');

const ALLOWED_CATEGORIES = new Set([
  'general',
  'feature',
  'account',
  'diary',
  'followers',
  'card',
  'analysis',
  'other'
]);

const normalizeText = (value = '') => value.replace(/\s+/g, ' ').trim();

exports.createFeedback = async (req, res) => {
  try {
    const { subject, category, description } = req.body || {};

    const trimmedSubject = normalizeText(subject || '');
    const trimmedDescription = (description || '').trim();
    const normalizedCategory = typeof category === 'string' ? category.trim().toLowerCase() : '';

    if (!trimmedSubject || trimmedSubject.length < 3) {
      return res.status(400).json({
        error: 'Invalid subject',
        code: 'INVALID_SUBJECT',
        message: '請輸入至少 3 個字的問題主旨'
      });
    }

    if (trimmedSubject.length > 200) {
      return res.status(400).json({
        error: 'Subject too long',
        code: 'SUBJECT_TOO_LONG',
        message: '問題主旨長度不可超過 200 個字'
      });
    }

    if (!trimmedDescription || trimmedDescription.length < 10) {
      return res.status(400).json({
        error: 'Invalid description',
        code: 'INVALID_DESCRIPTION',
        message: '請提供至少 10 個字的詳細描述'
      });
    }

    if (trimmedDescription.length > 2000) {
      return res.status(400).json({
        error: 'Description too long',
        code: 'DESCRIPTION_TOO_LONG',
        message: '詳細描述長度不可超過 2000 個字'
      });
    }

    if (!ALLOWED_CATEGORIES.has(normalizedCategory)) {
      return res.status(400).json({
        error: 'Invalid category',
        code: 'INVALID_CATEGORY',
        message: '請選擇有效的問題類別'
      });
    }

    const feedbackId = await Feedback.create({
      user_id: req.user.user_id,
      category: normalizedCategory,
      subject: trimmedSubject,
      description: trimmedDescription
    });

    res.status(201).json({
      message: '回饋已送出，感謝您的協助',
      feedback: {
        feedback_id: feedbackId,
        category: normalizedCategory,
        subject: trimmedSubject,
        description: trimmedDescription
      }
    });
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

exports.getMyFeedbacks = async (req, res) => {
  try {
    const { limit, offset } = req.query || {};
    const feedbacks = await Feedback.findByUser(req.user.user_id, { limit, offset });
    res.json({ feedbacks });
  } catch (error) {
    console.error('Get feedbacks error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};