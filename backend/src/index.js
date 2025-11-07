const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Global process-level error logging to surface startup issues
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 提供靜態檔案存取 (uploads 資料夾)
app.use('/uploads', express.static('uploads'));

// Initialize database (logs success/failure on startup)
require('./config/db');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Resonote API is running' });
});

// API version endpoint
app.get('/api/v1', (req, res) => {
  res.json({ 
    message: 'Resonote API v1.0',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      diaries: '/api/v1/diaries',
      upload: '/api/v1/upload',
      likes: '/api/v1/likes',
      comments: '/api/v1/comments',
      followers: '/api/v1/followers',
      announcements: '/api/v1/announcements',
      notifications: '/api/v1/notifications',
      cards: '/api/v1/cards',
      admin: '/api/v1/admin'
    }
  });
});

// Routes (with defensive require to log any import errors)
const safeRequire = (path) => {
  try {
    return require(path);
  } catch (err) {
    console.error(`🚨 Failed to load route module: ${path}`);
    console.error(err);
    throw err;
  }
};

const authRoutes = safeRequire('./routes/auth');
const userRoutes = safeRequire('./routes/users');
const diaryRoutes = safeRequire('./routes/diaries');
const uploadRoutes = safeRequire('./routes/upload');
const likeRoutes = safeRequire('./routes/like');
const commentRoutes = safeRequire('./routes/comment');
const friendRoutes = safeRequire('./routes/friendRoutes');
const notificationRoutes = safeRequire('./routes/notification');
const announcementRoutes = safeRequire('./routes/announcement');
const cardRoutes = safeRequire('./routes/card');
const adminRoutes = safeRequire('./routes/admin');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/diaries', diaryRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/likes', likeRoutes);
app.use('/api/v1/comments', commentRoutes);
// Mount followers routes (previously exposed under /api/v1/friends)
app.use('/api/v1/followers', friendRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/cards', cardRoutes);
app.use('/api/v1/admin', adminRoutes);

// Error handling
const { errorHandler, notFound } = require('./middleware/errorHandler');
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at /api/v1`);
});

