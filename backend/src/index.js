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

// NOTE: dotenv config will be loaded after determining project root so we can
// prefer a local `.env.local` file when present.

const path = require('path');
const fs = require('fs');
// Load environment variables: prefer .env.local (dev) then fallback to .env
try {
  const projectRoot = path.join(__dirname, '..', '..');
  const envLocalPath = path.join(projectRoot, '.env.local');
  const envPath = path.join(projectRoot, '.env');
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
    console.log(`[dotenv] loaded ${envLocalPath}`);
  } else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`[dotenv] loaded ${envPath}`);
  } else {
    dotenv.config();
    console.log('[dotenv] no .env files found, relying on process env');
  }
} catch (e) {
  console.warn('[dotenv] failed to load .env files:', e && e.message ? e.message : e);
}
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 提供靜態檔案存取 (uploads 資料夾)
app.use('/uploads', express.static('uploads'));

// Initialize database (logs success/failure on startup) and export pool for diagnostics
const pool = require('./config/db');
// Mailer init (verify SMTP if configured)
try {
  const emailVerification = require('./services/emailVerification');
  // call initMailer but don't block startup; log result
  (async () => {
    try {
      const r = await emailVerification.initMailer();
      if (r && r.ok) {
        console.log('[index] Mailer initialized (SMTP ok)');
      } else if (r && r.info === 'no-transporter') {
        console.log('[index] Mailer: no SMTP configured; using test-account fallback for development');
      } else {
        console.warn('[index] Mailer init reported error; check MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASSWORD');
      }
    } catch (e) {
      console.error('[index] Mailer init error:', e && e.message ? e.message : e);
    }
  })();
} catch (e) {
  console.warn('[index] Could not initialize mailer:', e && e.message ? e.message : e);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Resonote API is running' });
});

// Root route - give a helpful response or redirect to API docs
app.get('/', (req, res) => {
  // If browser requesting HTML, show a small HTML page
  if (req.accepts('html')) {
    return res.send(`<html><head><title>Resonote API</title></head><body><h1>Resonote API</h1><p>API root: <a href="/api/v1">/api/v1</a></p><p>Health: <a href="/health">/health</a></p></body></html>`);
  }
  // Otherwise return JSON
  res.json({ message: 'Resonote API', api: '/api/v1', health: '/health' });
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

// Diagnostics page - HTML summary to help debug local environment
app.get('/diagnostics', async (req, res) => {
  const checks = [];

  // Node / env info
  checks.push({ name: 'Node Version', ok: true, info: process.version });
  checks.push({ name: 'Environment', ok: true, info: process.env.NODE_ENV || 'development' });

  // Database check
  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT VERSION() as version, DATABASE() as db');
      const v = rows && rows[0] ? rows[0].version : 'unknown';
      const db = rows && rows[0] ? rows[0].db : process.env.DB_NAME || '';
      checks.push({ name: 'MySQL Connection', ok: true, info: `version=${v}, database=${db}` });
    } finally {
      conn.release();
    }
  } catch (err) {
    checks.push({ name: 'MySQL Connection', ok: false, info: err.message });
  }

  // Build simple HTML
  const html = [`<html><head><title>Diagnostics - Resonote</title></head><body><h1>Resonote Diagnostics</h1><ul>`];
  for (const c of checks) {
    html.push(`<li><strong>${c.name}:</strong> ${c.ok ? '<span style="color:green">OK</span>' : '<span style="color:red">FAIL</span>'} - ${c.info}</li>`);
  }
  html.push('</ul>');
  html.push('<p><a href="/">Back to root</a> | <a href="/health">/health</a> | <a href="/api/v1">/api/v1</a></p>');
  html.push('</body></html>');

  res.send(html.join('\n'));
});

// Serve interactive API tester page
app.get('/tester', (req, res) => {
  const file = path.join(__dirname, 'public', 'api-tester.html');
  res.sendFile(file);
});

// Serve Swagger UI for OpenAPI spec (docs/api/openapi.yaml)
try {
  const openapiPath = path.join(__dirname, '..', '..', 'docs', 'api', 'openapi.yaml');
  if (fs.existsSync(openapiPath)) {
    // Read raw buffer and detect encoding to handle files saved as UTF-16 or with BOMs
    const raw = fs.readFileSync(openapiPath);
    let enc = 'utf8';
    let content = null;
    // BOM detection
    if (raw.length >= 2 && raw[0] === 0xFF && raw[1] === 0xFE) {
      enc = 'utf16le';
    } else if (raw.length >= 2 && raw[0] === 0xFE && raw[1] === 0xFF) {
      enc = 'utf16be';
    } else if (raw.length >= 3 && raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) {
      enc = 'utf8';
    }

    try {
      if (enc === 'utf16be') {
        // Node doesn't support utf16be directly; swap bytes then decode as utf16le
        const swapped = Buffer.alloc(raw.length);
        for (let i = 0; i + 1 < raw.length; i += 2) {
          swapped[i] = raw[i + 1];
          swapped[i + 1] = raw[i];
        }
        content = swapped.toString('utf16le');
      } else {
        content = raw.toString(enc);
      }

      // Trim any leading null chars sometimes introduced by editors
      content = content.replace(/^\u0000+/, '');

      const spec = yaml.load(content);
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
      console.log(`📚 Swagger UI mounted at /api-docs (from ${openapiPath}) — detected encoding: ${enc}`);
    } catch (err) {
      console.error('❌ Failed to parse OpenAPI YAML:', err && err.message ? err.message : err);
      throw err;
    }
  } else {
    console.warn('⚠️ OpenAPI file not found at docs/api/openapi.yaml — Swagger UI will not be mounted.');
  }
} catch (err) {
  console.error('❌ Failed to mount Swagger UI:', err.message);
}

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
const followRoutes = safeRequire('./routes/follow');
const notificationRoutes = safeRequire('./routes/notification');
const announcementRoutes = safeRequire('./routes/announcement');
const messagesRoutes = safeRequire('./routes/messages');
const cardRoutes = safeRequire('./routes/card');
const adminRoutes = safeRequire('./routes/admin');
const feedbackRoutes = safeRequire('./routes/feedback');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/diaries', diaryRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/likes', likeRoutes);
app.use('/api/v1/comments', commentRoutes);
// Mount followers routes (previously exposed under /api/v1/friends)
app.use('/api/v1/followers', followRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/messages', messagesRoutes);
app.use('/api/v1/cards', cardRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/feedbacks', feedbackRoutes);

// Development-only helper: create/find a test user and return a JWT for quick testing
if ((process.env.NODE_ENV || 'development') !== 'production') {
  const User = require('./models/User');
  app.post('/api/v1/dev/create-test-user', async (req, res) => {
    try {
      const { email, username, user_id, password } = req.body || {};
      if (!email || !username) return res.status(400).json({ error: 'email and username required' });

      // If user exists, return token for existing user
      let user = await User.findByEmail(email);
      if (!user) {
        // Create a user bypassing email verification for development
        const pwd = password || 'DevPass@123';
        const hash = await bcrypt.hash(pwd, 10);
        try {
          const createdId = await User.create({ email, password_hash: hash, username, user_id, gender: 'other', birth_date: '1990-01-01' });
          user = await User.findById(createdId);
        } catch (err) {
          // If creation failed due to existing constraints, try to find by username
          user = await User.findByEmail(email) || await User.findByUsername(username);
        }
      }

      if (!user) return res.status(500).json({ error: 'Failed to create or find test user' });
      const token = jwt.sign({ user_id: user.user_id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
      return res.json({ message: 'Dev token generated', token, user: { user_id: user.user_id, email: user.email, username: user.username } });
    } catch (err) {
      console.error('Dev create-test-user error:', err);
      return res.status(500).json({ error: 'Server error', details: err.message });
    }
  });
  // Convenience GET version for quick browser testing (dev only)
  app.get('/api/v1/dev/create-test-user', async (req, res) => {
    try {
      const { email, username, user_id, password } = req.query || {};
      if (!email || !username) return res.status(400).json({ error: 'email and username required' });
      let user = await User.findByEmail(email);
      if (!user) {
        const pwd = password || 'DevPass@123';
        const hash = await bcrypt.hash(pwd, 10);
        try {
          const createdId = await User.create({ email, password_hash: hash, username, user_id, gender: 'other', birth_date: '1990-01-01' });
          user = await User.findById(createdId);
        } catch (err) {
          user = await User.findByEmail(email) || await User.findByUsername(username);
        }
      }
      if (!user) return res.status(500).json({ error: 'Failed to create or find test user' });
      const token = jwt.sign({ user_id: user.user_id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
      return res.json({ message: 'Dev token generated', token, user: { user_id: user.user_id, email: user.email, username: user.username } });
    } catch (err) {
      console.error('Dev create-test-user GET error:', err);
      return res.status(500).json({ error: 'Server error', details: err.message });
    }
  });
}

// Error handling
const { errorHandler, notFound } = require('./middleware/errorHandler');
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at /api/v1`);
});

