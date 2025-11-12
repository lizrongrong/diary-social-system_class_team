const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.user_id || 'anon';
    const ext = path.extname(file.originalname);
    const randomId = uuidv4().split('-')[0];
    cb(null, `${userId}_${Date.now()}_${randomId}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedExt = ['.jpg', '.jpeg', '.png', '.svg'].includes(ext);
  const mime = (file.mimetype || '').toLowerCase();
  const isAllowedMime = ['image/jpeg', 'image/png', 'image/svg+xml'].includes(mime);

  if (isAllowedExt && isAllowedMime) {
    cb(null, true);
  } else {
    cb(new Error('僅支援副檔名 .jpg .jpeg .png .svg 的圖片'));
  }
};

const upload = multer({ storage, limits: { fileSize: 9437184 }, fileFilter });

router.post('/', authMiddleware, (req, res) => {
  upload.array('files', 9)(req, res, (err) => {
    if (err) {
      const message = err.message || '檔案上傳失敗';
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: message, code: 'UPLOAD_ERROR' });
    }

    try {
      if (!req.files || !req.files.length) {
        return res.status(400).json({ error: '請選擇檔案', code: 'NO_FILES' });
      }

      const files = req.files.map((f) => ({
        filename: f.filename,
        size: f.size,
        url: `/uploads/${f.filename}`
      }));

      res.json({
        message: '上傳成功',
        files
      });
    } catch (error) {
      console.error('Upload handler error:', error);
      res.status(500).json({ error: '上傳失敗，請稍後再試', code: 'UPLOAD_ERROR' });
    }
  });
});

module.exports = router;
