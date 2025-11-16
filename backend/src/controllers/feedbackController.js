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
    console.error('Get feedbacks error:', error && error.stack ? error.stack : error);
    const body = { error: 'Server error', code: 'SERVER_ERROR', detail: error && error.message ? String(error.message) : String(error) };
    res.status(500).json(body);
  }
};

// 管理員：查詢所有回饋
exports.adminList = async (req, res) => {
  try {
    const { limit, offset } = req.query || {};
    const feedbacks = await Feedback.findAll({ limit, offset });
    res.json({ feedbacks });
  } catch (error) {
    console.error('Admin get feedbacks error:', error && error.stack ? error.stack : error);
    const body = { error: 'Server error', code: 'SERVER_ERROR', detail: error && error.message ? String(error.message) : String(error) };
    res.status(500).json(body);
  }
};

// 管理員：回覆回饋
const Notification = require('../models/Notification');

exports.adminReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_reply, status } = req.body || {};
    if (!admin_reply || typeof admin_reply !== 'string' || admin_reply.trim().length < 1) {
      return res.status(400).json({ error: 'Invalid reply' });
    }

    // Ensure feedback exists and fetch its owner
    const feedback = await Feedback.findById(id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    const ok = await Feedback.reply(id, admin_reply.trim(), status);
    if (!ok) return res.status(404).json({ message: 'Feedback not found' });

    // Create a system notification for the feedback owner
    let createdNotificationId = null;
    try {
      const targetUserId = feedback.user_id;
      const title = `管理者回覆：${feedback.subject || '使用者回饋'}`;
      // Compose full content: original subject, original description, and admin reply separated by newlines
      const contentParts = [];
      if (feedback.subject) contentParts.push(`問題標題：${feedback.subject}`);
      if (feedback.description) contentParts.push(`問題內容：${feedback.description}`);
      contentParts.push(`回覆：${admin_reply.trim()}`);
      const content = contentParts.join('\n\n');

      // Use existing 'system' enum type for feedback replies to match DB schema
      createdNotificationId = await Notification.create(targetUserId, 'system', title, content, req.user.user_id, null);
      console.log('Notification created for feedback reply, id=', createdNotificationId);
    } catch (notifyErr) {
      console.error('Failed to create notification for feedback reply:', notifyErr && notifyErr.stack ? notifyErr.stack : notifyErr);
      createdNotificationId = null;
      // Non-fatal: continue
    }

    // Indicate whether notification was created (if any)
    res.json({ message: 'Replied', notification_created: !!createdNotificationId, notification_id: createdNotificationId || null });
  } catch (error) {
    console.error('Admin reply error:', error);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};