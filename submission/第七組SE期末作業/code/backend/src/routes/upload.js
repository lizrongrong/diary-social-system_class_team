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

const sanitizeForFilename = (value = '') => {
  return value
    .toString()
    .trim()
    .replace(/[^0-9a-zA-Z_-]/g, '')
    .slice(0, 80);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const requestedNameRaw = req.body?.fileName;
    let baseName = '';

    if (requestedNameRaw) {
      const withoutExt = requestedNameRaw.toString().replace(/\.[^/.]+$/, '');
      const safeRequested = sanitizeForFilename(withoutExt);
      if (safeRequested) {
        baseName = safeRequested;
      }
    }

    if (!baseName) {
      const originalBase = sanitizeForFilename(path.basename(file.originalname, ext));
      if (originalBase) {
        baseName = originalBase;
      }
    }

    if (!baseName) {
      const userId = sanitizeForFilename(req.user?.user_id || 'anon');
      const randomId = uuidv4().split('-')[0];
      baseName = `${userId}_${Date.now()}_${randomId}`;
    }

    cb(null, `${baseName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  // 擴充允許的檔案格式：圖片、文件、音訊、影片、壓縮檔
  const allowedExts = [
    // Images
    '.jpg', '.jpeg', '.png', '.svg', '.gif', '.webp',
    // Documents
    '.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx', '.csv',
    // Archives
    '.zip', '.rar', '.7z',
    // Audio/Video
    '.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.webm'
  ];

  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`不支援的檔案格式: ${ext}`));
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
