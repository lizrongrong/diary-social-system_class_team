/**
 * 全域錯誤處理中介層
 * 捕捉所有未處理的錯誤
 */
exports.errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // 資料庫錯誤
  if (err.code && err.code.startsWith('ER_')) {
    const payload = {
      error: 'Database error',
      code: 'DATABASE_ERROR',
      message: '資料庫錯誤'
    };
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      payload.detail = err.sqlMessage || err.message;
      payload.stack = err.stack;
      if (err.sql) payload.sql = err.sql;
    }
    return res.status(500).json(payload);
  }

  // 驗證錯誤
  if (err.name === 'ValidationError') {
    const payload = {
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.details
    };
    if ((process.env.NODE_ENV || 'development') !== 'production') payload.stack = err.stack;
    return res.status(400).json(payload);
  }

  // JWT 錯誤
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
      ...((process.env.NODE_ENV || 'development') !== 'production' ? { stack: err.stack } : {})
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
      ...((process.env.NODE_ENV || 'development') !== 'production' ? { stack: err.stack } : {})
    });
  }

  // 預設錯誤回應
  const defaultPayload = {
    error: err.message || 'Internal server error',
    code: err.code || 'SERVER_ERROR'
  };
  if ((process.env.NODE_ENV || 'development') !== 'production') {
    defaultPayload.stack = err.stack;
    if (err.sql) defaultPayload.sql = err.sql;
  }
  res.status(err.status || 500).json(defaultPayload);
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
