# Resonote 編碼標準

> **版本**: v1.0  
> **更新日期**: 2025-10-26  
> **專案**: Resonote 日記互動系統

---

## 📋 通用原則

### 1. 程式碼風格
- **縮排**: 2 空格 (JavaScript/JSX/CSS)
- **引號**: 單引號 `'` (JavaScript), 雙引號 `"` (JSX 屬性)
- **分號**: 必須使用
- **檔案命名**:
  - React 元件: PascalCase (`LoginPage.jsx`, `DiaryCard.jsx`)
  - 一般模組: camelCase (`authService.js`, `validation.js`)
  - 樣式檔案: 與元件同名 (`LoginPage.css`)
  - 常數檔案: camelCase (`constants.js`)

### 2. 變數命名規範
```javascript
// 變數和函數: camelCase
const userName = 'John';
function getUserData() {}

// 常數: UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:3000';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// React 元件: PascalCase
function LoginPage() {}
const DiaryCard = () => {};

// 私有方法/變數: 前綴底線
const _privateMethod = () => {};
let _internalState = {};

// Boolean: is/has/should 前綴
const isLoggedIn = true;
const hasPermission = false;
const shouldRender = true;
```

### 3. 註解規範
```javascript
/**
 * 函數說明 (多行註解用於函數/類別)
 * @param {string} userId - 使用者 ID
 * @param {Object} options - 選項物件
 * @returns {Promise<Object>} 使用者資料
 */
async function getUserById(userId, options) {
  // 單行註解說明邏輯
  const user = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
  return user;
}

// TODO: 待辦事項
// FIXME: 需要修復的問題
// HACK: 臨時解決方案
// NOTE: 重要說明
```

---

## 🎨 前端規範 (React)

### 1. 元件結構
```jsx
// 1. Imports
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import './ComponentName.css';

// 2. 常數定義
const DEFAULT_VALUE = 'default';

// 3. 元件定義
function ComponentName({ prop1, prop2 }) {
  // 3.1 Hooks (依序: useState, useEffect, useContext, 自訂 hooks)
  const [state, setState] = useState(initialValue);
  const navigate = useNavigate();
  
  useEffect(() => {
    // 副作用邏輯
  }, [dependencies]);
  
  // 3.2 事件處理器
  const handleClick = () => {
    // 處理邏輯
  };
  
  // 3.3 輔助函數
  const formatData = (data) => {
    return data.toString();
  };
  
  // 3.4 條件渲染邏輯
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  // 3.5 JSX 返回
  return (
    <div className="component-name">
      {/* 內容 */}
    </div>
  );
}

// 4. PropTypes 定義
ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
};

// 5. 預設 Props
ComponentName.defaultProps = {
  prop2: 0,
};

// 6. Export
export default ComponentName;
```

### 2. 狀態管理 (Zustand)
```javascript
// store/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  // 狀態
  user: null,
  token: null,
  isAuthenticated: false,
  
  // Actions
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    set({ 
      user: response.data.user, 
      token: response.data.token,
      isAuthenticated: true 
    });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  // Getters
  getUser: () => get().user,
}));
```

### 3. API 服務層
```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
});

// Request 攔截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response 攔截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 處理未授權
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 4. CSS 規範
```css
/* 使用 BEM 命名法: Block__Element--Modifier */
.login-page {
  /* 佈局 */
  display: flex;
  justify-content: center;
  align-items: center;
  
  /* 尺寸 */
  width: 100%;
  height: 100vh;
  
  /* 顏色 */
  background: var(--primary-pink);
  
  /* 字體 */
  font-family: 'Inter', sans-serif;
  
  /* 其他 */
  transition: all 0.3s ease;
}

.login-page__form {
  /* 子元素樣式 */
}

.login-page__button--disabled {
  /* 修飾符樣式 */
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## 🖥️ 後端規範 (Node.js + Express)

### 1. 路由結構
```javascript
// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validation');

// POST /api/v1/auth/register
router.post('/register', validateRegister, authController.register);

// POST /api/v1/auth/login
router.post('/login', validateLogin, authController.login);

// POST /api/v1/auth/logout (需認證)
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
```

### 2. 控制器結構
```javascript
// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * 使用者註冊
 * @route POST /api/v1/auth/register
 * @access Public
 */
exports.register = async (req, res) => {
  try {
    const { email, password, username, display_name, gender, birth_date } = req.body;
    
    // 1. 檢查使用者是否已存在
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email already registered',
        code: 'EMAIL_EXISTS' 
      });
    }
    
    // 2. 密碼加密
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 3. 建立使用者
    const userId = await User.create({
      email,
      password_hash: hashedPassword,
      username,
      display_name,
      gender,
      birth_date,
    });
    
    // 4. 生成 JWT
    const token = jwt.sign(
      { user_id: userId, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // 5. 返回結果
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { user_id: userId, email, username, display_name }
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      error: 'Server error',
      code: 'SERVER_ERROR' 
    });
  }
};
```

### 3. 模型層結構
```javascript
// models/User.js
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class User {
  /**
   * 建立新使用者
   * @param {Object} userData - 使用者資料
   * @returns {Promise<string>} 使用者 ID
   */
  static async create(userData) {
    const userId = uuidv4();
    const query = `
      INSERT INTO users (user_id, email, password_hash, username, display_name, gender, birth_date, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'member', 'active')
    `;
    
    const values = [
      userId,
      userData.email,
      userData.password_hash,
      userData.username,
      userData.display_name,
      userData.gender,
      userData.birth_date,
    ];
    
    await db.execute(query, values);
    return userId;
  }
  
  /**
   * 根據 Email 查找使用者
   * @param {string} email - Email
   * @returns {Promise<Object|null>}
   */
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ? AND status != "deleted"';
    const [rows] = await db.execute(query, [email]);
    return rows[0] || null;
  }
  
  /**
   * 根據 ID 查找使用者
   * @param {string} userId - 使用者 ID
   * @returns {Promise<Object|null>}
   */
  static async findById(userId) {
    const query = 'SELECT * FROM users WHERE user_id = ? AND status != "deleted"';
    const [rows] = await db.execute(query, [userId]);
    return rows[0] || null;
  }
}

module.exports = User;
```

### 4. 中介層結構
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT 認證中介層
 */
exports.authMiddleware = async (req, res, next) => {
  try {
    // 1. 取得 Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'NO_TOKEN' 
      });
    }
    
    const token = authHeader.substring(7);
    
    // 2. 驗證 Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. 查找使用者
    const user = await User.findById(decoded.user_id);
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      });
    }
    
    if (user.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Account suspended',
        code: 'ACCOUNT_SUSPENDED' 
      });
    }
    
    // 4. 附加使用者資料到 req
    req.user = user;
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED' 
      });
    }
    res.status(500).json({ 
      error: 'Server error',
      code: 'SERVER_ERROR' 
    });
  }
};

/**
 * 管理員權限中介層
 */
exports.adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'FORBIDDEN' 
    });
  }
  next();
};
```

### 5. 驗證中介層
```javascript
// middleware/validation.js
const { body, validationResult } = require('express-validator');

/**
 * 驗證結果處理
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array() 
    });
  }
  next();
};

/**
 * 註冊驗證規則
 */
exports.validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 20 })
    .withMessage('Password must be 8-20 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])/)
    .withMessage('Password must contain letters, numbers and special characters'),
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  body('display_name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Display name must be 2-100 characters'),
  body('gender')
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender value'),
  body('birth_date')
    .isDate()
    .withMessage('Invalid date format')
    .custom((value) => {
      const age = (new Date() - new Date(value)) / (1000 * 60 * 60 * 24 * 365);
      if (age < 13) throw new Error('Must be at least 13 years old');
      return true;
    }),
  handleValidationErrors,
];

/**
 * 登入驗證規則
 */
exports.validateLogin = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];
```

---

## 🗄️ 資料庫規範

### 1. SQL 查詢規範
```javascript
// ✅ 使用參數化查詢 (防止 SQL Injection)
const query = 'SELECT * FROM users WHERE email = ?';
const [rows] = await db.execute(query, [email]);

// ❌ 不要使用字串拼接
const query = `SELECT * FROM users WHERE email = '${email}'`; // 危險！

// ✅ 使用 Transaction 處理關聯操作
const connection = await db.getConnection();
await connection.beginTransaction();
try {
  await connection.execute('INSERT INTO diaries ...');
  await connection.execute('INSERT INTO diary_tags ...');
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

### 2. 資料庫命名規範
- 表名: 複數小寫蛇形 (`users`, `diary_tags`)
- 欄位名: 小寫蛇形 (`user_id`, `created_at`)
- 主鍵: `{table}_id` (例如: `user_id`, `diary_id`)
- 外鍵: 參考表的主鍵名稱
- 索引: `idx_{column}` 或 `idx_{table}_{column}`
- 唯一約束: `uk_{column}`

---

## 🔒 安全規範

### 1. 密碼處理
```javascript
// ✅ 使用 bcrypt 加密 (成本因子 10)
const hashedPassword = await bcrypt.hash(password, 10);

// ✅ 驗證密碼
const isValid = await bcrypt.compare(inputPassword, user.password_hash);

// ❌ 不要明文儲存密碼
// ❌ 不要使用 MD5 或 SHA1
```

### 2. JWT 處理
```javascript
// ✅ 使用強密鑰
process.env.JWT_SECRET = 'your_super_secret_key_at_least_32_characters';

// ✅ 設定適當的過期時間
jwt.sign(payload, secret, { expiresIn: '7d' });

// ✅ 驗證 Token
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
} catch (error) {
  // 處理過期或無效的 Token
}
```

### 3. 檔案上傳
```javascript
// ✅ 限制檔案類型
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

// ✅ 限制檔案大小
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});
```

### 4. 環境變數
```javascript
// ✅ 使用 dotenv
require('dotenv').config();

// ✅ 不要將 .env 提交到 Git
// 將 .env 加入 .gitignore

// ✅ 提供 .env.example
// DB_HOST=localhost
// DB_USER=root
// DB_PASSWORD=
// JWT_SECRET=your_secret_key_here
```

---

## 🧪 測試規範

### 1. 測試檔案命名
- 單元測試: `*.test.js`
- 整合測試: `*.integration.test.js`
- E2E 測試: `*.e2e.test.js`

### 2. 測試結構 (Jest)
```javascript
describe('AuthController', () => {
  describe('register', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const userData = { email: 'test@example.com', password: 'Test123!' };
      
      // Act
      const result = await authController.register(userData);
      
      // Assert
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(userData.email);
    });
    
    it('should return error when email already exists', async () => {
      // Test implementation
    });
  });
});
```

---

## 📝 版本控制

### 1. Commit 訊息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**:
- `feat`: 新功能
- `fix`: 修復 Bug
- `docs`: 文件更新
- `style`: 程式碼格式調整
- `refactor`: 重構
- `test`: 測試相關
- `chore`: 建置/工具相關

**範例**:
```
feat(auth): implement user registration

- Add registration form validation
- Create POST /api/v1/auth/register endpoint
- Add bcrypt password hashing

Closes #123
```

### 2. 分支命名
- `feature/user-authentication`
- `bugfix/login-error-handling`
- `hotfix/security-vulnerability`

---

## 📚 相關文件

- [技術棧文件](./tech-stack.md)
- [專案結構](./source-tree.md)

---

**維護者**: Resonote Team  
**最後更新**: 2025-10-26
