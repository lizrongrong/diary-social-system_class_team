const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const userId = req.user?.user_id || 'anon';
    const ext = path.extname(file.originalname);
    const randomId = uuidv4().split('-')[0];
    cb(null, `${userId}_${Date.now()}_${randomId}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  ok ? cb(null, true) : cb(new Error('僅支援 jpg, png, gif'));
};

const upload = multer({ storage, limits: { fileSize: 5242880 }, fileFilter });

router.post('/', authMiddleware, upload.array('files', 9), (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ error: '請選擇檔案', code: 'NO_FILES' });
    }
    res.json({
      message: '上傳成功',
      files: req.files.map(f => ({ filename: f.filename, size: f.size, url: `/uploads/${f.filename}` }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message || '上傳失敗', code: 'UPLOAD_ERROR' });
  }
});

module.exports = router;
