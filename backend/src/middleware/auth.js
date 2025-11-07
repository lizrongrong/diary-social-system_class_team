const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT 認證中介層
 * 驗證請求中的 JWT Token 並附加使用者資料到 req.user
 */
exports.authMiddleware = async (req, res, next) => {
  try {
    // 1. 取得 Authorization Header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }
    
    // 2. 提取 Token (移除 "Bearer " 前綴)
    const token = authHeader.substring(7);
    
    // 3. 驗證 Token
    let decoded;
    try {
      // Use the same default dev secret as the auth controller to avoid
      // invalid-token 401s in development when JWT_SECRET is not set.
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      throw error;
    }
    
    // 4. 查找使用者
    const user = await User.findById(decoded.user_id);
    
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // 5. 檢查帳號狀態
    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Account suspended',
        code: 'ACCOUNT_SUSPENDED',
        message: '您的帳號已被暫停使用，請聯繫客服'
      });
    }
    
    if (user.status === 'deleted') {
      return res.status(403).json({
        error: 'Account deleted',
        code: 'ACCOUNT_DELETED'
      });
    }
    
    // 6. 附加使用者資料到 req 物件 (移除敏感資料)
    req.user = {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status
    };
    
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 管理員權限中介層
 * 需要先通過 authMiddleware
 */
exports.adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'FORBIDDEN',
      message: '此功能僅限管理員使用'
    });
  }
  
  next();
};

/**
 * 選擇性認證中介層
 * Token 存在時驗證，但不強制要求
 * 用於公開/私密混合的路由 (例如: 探索頁面)
 */
exports.optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 沒有 Token，繼續但不附加 user
    return next();
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_change_this_in_production');
    const user = await User.findById(decoded.user_id);
    
    if (user && user.status === 'active') {
      req.user = {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        role: user.role
      };
    }
  } catch (error) {
    // Token 無效，忽略錯誤繼續
  }
  
  next();
};
