/**
 * 全域錯誤處理中介層
 * 捕捉所有未處理的錯誤
 */
exports.errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // 資料庫錯誤
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(500).json({
      error: 'Database error',
      code: 'DATABASE_ERROR',
      message: '資料庫錯誤'
    });
  }
  
  // 驗證錯誤
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.details
    });
  }
  
  // JWT 錯誤
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  // 預設錯誤回應
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'SERVER_ERROR'
  });
};

/**
 * 404 Not Found 處理
 */
exports.notFound = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
};
