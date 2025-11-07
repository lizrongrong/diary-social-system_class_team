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
  const { email, password, username, gender, birth_date, user_id } = req.body;
    
    // 1. 檢查 Email 是否已存在
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(400).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS',
        message: '此 Email 已被註冊'
      });
    }
    
  // 2. 檢查 Username 是否已存在
  const usernameExists = await User.usernameExists(username);
    if (usernameExists) {
      return res.status(400).json({
        error: 'Username already taken',
        code: 'USERNAME_EXISTS',
        message: '此使用者 ID 已被使用'
      });
    }
    
    // 3. 檢查前端提供的 user_id 是否已存在
    if (user_id && await User.userIdExists(user_id)) {
      return res.status(400).json({
        error: 'User ID already taken',
        code: 'USERID_EXISTS',
        message: '此使用者代號已被使用'
      });
    }

    // 4. 驗證年齡 (必須 >= 13 歲)
    const birthDate = new Date(birth_date);
    const today = new Date();
    const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    
    if (age < 13) {
      return res.status(400).json({
        error: 'Age requirement not met',
        code: 'AGE_REQUIREMENT',
        message: '您必須年滿 13 歲才能註冊'
      });
    }
    
    // 4. 密碼加密 (bcrypt, cost factor 10)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 5. 建立使用者 (接受前端提供的 user_id)
    const userId = await User.create({
      user_id,
      email,
      password_hash: hashedPassword,
      username,
      gender,
      birth_date
    });
    
    // 6. 生成 JWT Token
    const token = jwt.sign(
      {
        user_id: userId,
        email,
        role: 'member'
      },
      process.env.JWT_SECRET || 'your_super_secret_key_change_this_in_production',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );
    
    // 7. 返回成功回應
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        user_id: userId,
        email,
        username,
        role: 'member'
      }
    });
    
  } catch (error) {
    console.error('Register error:', error);
    
    if (error.message === 'EMAIL_EXISTS') {
      return res.status(400).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }
    
    if (error.message === 'USERNAME_EXISTS') {
      return res.status(400).json({
        error: 'Username already taken',
        code: 'USERNAME_EXISTS'
      });
    }
    
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR',
      message: '註冊失敗，請稍後再試'
    });
  }
};

/**
 * 即時檢查 user_id 是否可用
 * @route POST /api/v1/auth/check-userid
 * @access Public
 */
exports.checkUserId = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }

    // 基本格式驗證（與 middleware 保持一致）
    const userIdRegex = /^[a-zA-Z0-9_]{3,10}$/;
    if (!userIdRegex.test(user_id)) {
      return res.status(400).json({ message: 'Invalid user_id format' });
    }

    const exists = await User.userIdExists(user_id);
    res.json({ available: !exists });
  } catch (error) {
    console.error('Check user_id error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
/**
 * 使用者登入
 * @route POST /api/v1/auth/login
 * @access Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password, remember_me } = req.body;
    console.log('🔐 Login attempt:', { email, remember_me: !!remember_me, time: new Date().toISOString() });
    
    // 1. 查找使用者
    const user = await User.findByEmail(email);
    
    if (!user) {
      console.log('❌ Login failed: user not found for', email);
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        message: '帳號或密碼錯誤'
      });
    }
    
    // 2. 檢查帳號狀態
    if (user.status === 'suspended') {
      console.log('⛔ Suspended account login attempt:', email);
      return res.status(403).json({
        error: 'Account suspended',
        code: 'ACCOUNT_SUSPENDED',
        message: '您的帳號已被暫停使用，請聯繫客服'
      });
    }
    
    // 3. 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log('❌ Login failed: invalid password for', email);
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        message: '帳號或密碼錯誤'
      });
    }
    
    // 4. 生成 JWT Token
    const expiresIn = remember_me ? '30d' : (process.env.JWT_EXPIRES_IN || '7d');
    
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your_super_secret_key_change_this_in_production',
      {
        expiresIn
      }
    );
    
    // 5. 更新最後登入時間
    await User.updateLastLogin(user.user_id);
    
    // 6. 返回成功回應
    console.log('✅ Login success:', email);
    res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('💥 Login error (server):', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR',
      message: '登入失敗，請稍後再試'
    });
  }
};

/**
 * 使用者登出
 * @route POST /api/v1/auth/logout
 * @access Private
 */
exports.logout = async (req, res) => {
  try {
    // JWT 是無狀態的，登出由前端處理 (刪除 localStorage 中的 token)
    // 這裡可以記錄登出事件或執行清理工作
    
    res.json({
      message: 'Logout successful',
      code: 'LOGOUT_SUCCESS'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 取得當前使用者資料
 * @route GET /api/v1/auth/me
 * @access Private
 */
exports.getCurrentUser = async (req, res) => {
  try {
    // req.user 由 authMiddleware 提供
    const user = await User.findById(req.user.user_id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // 返回使用者資料 (不包含密碼)
    res.json({
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        gender: user.gender,
        birth_date: user.birth_date,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      }
    });
    
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};
