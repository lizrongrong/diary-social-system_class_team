const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');
const { validateUpdateProfile, validateChangePassword } = require('../middleware/validation');
const Diary = require('../models/Diary');
const User = require('../models/User');
const db = require('../config/db');

// 🔧 開發用：設置管理員權限（生產環境應移除此端點）
router.post('/make-admin', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;
    await User.updateRole(userId, 'admin');
    res.json({ message: '已設置為管理員', role: 'admin' });
  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔧 開發用：查看我的帳號資訊（包括 role）
router.get('/my-info', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [rows] = await db.execute(
      'SELECT user_id, username, email, role, status, created_at FROM users WHERE user_id = ?',
      [userId]
    );
    res.json({ user: rows[0] });
  } catch (error) {
    console.error('Get my info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/search', authMiddleware, userController.searchUsers);

router.get('/id/:userId', userController.getUserByIdPublic);

// 公開路由（不需認證）
// GET /api/v1/users/:userId/diaries - 取得指定使用者的公開日記
router.get('/:userId/diaries', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const diaries = await Diary.findPublicByUser(userId, limit, offset);

    // If there are diaries, attach their tags in a single query to avoid N+1
    if (Array.isArray(diaries) && diaries.length > 0) {
      try {
        const db = require('../config/db');
        const ids = diaries.map(d => d.diary_id).filter(Boolean);
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',')
          const [tagRows] = await db.execute(
            `SELECT * FROM diary_tags WHERE diary_id IN (${placeholders}) ORDER BY created_at ASC`,
            ids
          );

          const tagMap = {}
          tagRows.forEach(tr => {
            if (!tagMap[tr.diary_id]) tagMap[tr.diary_id] = []
            tagMap[tr.diary_id].push({ tag_id: tr.tag_id, tag_type: tr.tag_type, tag_value: tr.tag_value })
          })

          // attach to diaries
          diaries.forEach(d => { d.tags = tagMap[d.diary_id] || [] })
        }
      } catch (tagErr) {
        console.warn('Failed to attach diary tags:', tagErr)
        // continue without tags
        diaries.forEach(d => { if (!d.tags) d.tags = [] })
      }
    }

    res.json({ diaries });
  } catch (error) {
    console.error('Get user public diaries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 需要認證的路由
// GET /api/v1/users/profile - 取得個人資料
router.get('/profile', authMiddleware, userController.getProfile);

// PUT /api/v1/users/profile - 更新個人資料
router.put('/profile', authMiddleware, validateUpdateProfile, userController.updateProfile);

// PUT /api/v1/users/password - 修改密碼
router.put('/password', authMiddleware, validateChangePassword, userController.changePassword);

// DELETE /api/v1/users/account - 刪除帳號
router.delete('/account', authMiddleware, userController.deleteAccount);

// GET /api/v1/users/:username - 取得指定使用者公開資料
router.get('/:username', userController.getUserByUsername);

module.exports = router;
