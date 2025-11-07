const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route   POST /api/v1/auth/register
 * @desc    使用者註冊
 * @access  Public
 */
router.post('/register', validateRegister, authController.register);

// POST /api/v1/auth/check-userid - 即時檢查 user_id 可用性
router.post('/check-userid', authController.checkUserId);

// POST /api/v1/auth/check-email - 即時檢查 email 是否已被註冊 (用於註冊頁面)
router.post('/check-email', authController.checkEmail);

// 發送驗證碼
router.post('/send-verification', authController.sendVerificationCode);

// 驗證驗證碼
router.post('/verify-email', authController.verifyEmailCode);

// 忘記密碼流程
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);

/**
 * @route   POST /api/v1/auth/login
 * @desc    使用者登入
 * @access  Public
 */
router.post('/login', validateLogin, authController.login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    使用者登出
 * @access  Private
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    取得當前使用者資料
 * @access  Private
 */
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
