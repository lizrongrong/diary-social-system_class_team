// Clean, single-file auth controller
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailVerification = require('../services/emailVerification');
const { generateAvatar } = require('../services/avatarGenerator');
const { isValidEmail } = require('../middleware/validation');

function serverError(res, err) {
  console.error(err);
  return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
}

// POST /auth/send-verification
// If email already exists, return code EMAIL_EXISTS (frontend depends on this)
exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (await User.emailExists(email)) {
      return res.status(400).json({ error: 'Email already registered', code: 'EMAIL_EXISTS', message: '此 Email 已被註冊，請更換 Email 或前往忘記密碼' });
    }

    // Ensure we attempt to send via configured SMTP. If SMTP is not configured the
    // mailer will throw and we return a 503 instructing the operator to configure SMTP.
    await emailVerification.sendVerificationCode(email);
    return res.json({ message: 'Verification code sent' });
  } catch (err) {
    // Surface a clear error when SMTP is not set up
    if (err && typeof err.message === 'string' && err.message.includes('SMTP not configured')) {
      return res.status(503).json({ error: 'Mail service not configured', message: '請在後端設定 MAIL_HOST / MAIL_PORT / MAIL_USER / MAIL_PASSWORD 等 SMTP 參數以便寄送真實郵件' });
    }
    return serverError(res, err);
  }
};

// POST /auth/verify-email
exports.verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
    const ok = await emailVerification.verifyCode(email, code);
    if (!ok) return res.status(400).json({ error: 'Invalid or expired code' });
    return res.json({ message: 'Email verified' });
  } catch (err) {
    return serverError(res, err);
  }
};

// POST /auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, username, gender, birth_date, user_id, profile_image } = req.body;
    if (!email || !password || !username) return res.status(400).json({ error: 'Missing parameters' });

    const isVerified = await emailVerification.isEmailVerified(email);
    if (!isVerified) return res.status(400).json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED', message: '請先完成 Email 驗證' });

    if (await User.emailExists(email)) return res.status(400).json({ error: 'Email already registered', code: 'EMAIL_EXISTS', message: '此 Email 已被註冊' });
    if (await User.usernameExists(username)) return res.status(400).json({ error: 'Username already taken', code: 'USERNAME_EXISTS', message: '此使用者 ID 已被使用' });
    if (user_id && await User.userIdExists(user_id)) return res.status(400).json({ error: 'User ID already taken', code: 'USERID_EXISTS', message: '此使用者代號已被使用' });

    if (birth_date) {
      const birthDate = new Date(birth_date);
      const today = new Date();
      const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 13) return res.status(400).json({ error: 'Age requirement not met', code: 'AGE_REQUIREMENT', message: '您必須年滿 13 歲才能註冊' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedProfileImage = typeof profile_image === 'string' && profile_image.trim().length > 0 ? profile_image.trim() : null;
    const finalProfileImage = normalizedProfileImage || generateAvatar(username);
    const createdUserId = await User.create({ user_id, email, password_hash: hashedPassword, username, gender, birth_date, profile_image: finalProfileImage });
    const token = jwt.sign({ user_id: createdUserId, email, role: 'member' }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    return res.status(201).json({ message: 'Registration successful', token, user: { user_id: createdUserId, email, username, role: 'member', profile_image: finalProfileImage } });
  } catch (err) {
    return serverError(res, err);
  }
};

// POST /auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await User.findByEmail(email);
    if (!user) return res.status(400).json({ error: 'Email not found' });
    await emailVerification.sendResetCode(email);
    return res.json({ message: 'Reset code sent' });
  } catch (err) {
    return serverError(res, err);
  }
};

// POST /auth/verify-reset-code
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
    const ok = await emailVerification.verifyResetCode(email, code);
    if (!ok) return res.status(400).json({ error: 'Invalid or expired code' });
    return res.json({ message: 'Code verified' });
  } catch (err) {
    return serverError(res, err);
  }
};

// POST /auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, new_password } = req.body;
    if (!email || !code || !new_password) return res.status(400).json({ error: 'Missing parameters' });
    const ok = await emailVerification.verifyResetCode(email, code);
    if (!ok) return res.status(400).json({ error: 'Invalid or expired code' });
    const user = await User.findByEmail(email);
    if (!user) return res.status(400).json({ error: 'Email not found' });
    const hashed = await bcrypt.hash(new_password, 10);
    const success = await User.updatePassword(user.user_id, hashed);
    if (!success) return res.status(500).json({ error: 'Failed to update password' });
    if (typeof emailVerification.consumeResetCode === 'function') {
      try { emailVerification.consumeResetCode(email); } catch (e) { /* ignore */ }
    }
    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    return serverError(res, err);
  }
};

// POST /auth/check-user-id
exports.checkUserId = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: 'user_id is required' });
    const userIdRegex = /^[a-zA-Z0-9_]{3,10}$/;
    if (!userIdRegex.test(user_id)) return res.status(400).json({ message: 'Invalid user_id format' });
    const exists = await User.userIdExists(user_id);
    return res.json({ available: !exists });
  } catch (err) {
    return serverError(res, err);
  }
};

// POST /auth/check-email
// Body: { email }
// Returns { exists: true } when the email is already registered.
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });
    const exists = await User.emailExists(email);
    return res.json({ exists });
  } catch (err) {
    return serverError(res, err);
  }
};

// POST /auth/login
exports.login = async (req, res) => {
  try {
    const { email, password, remember_me } = req.body;
    console.log('🔐 Login attempt:', { email, remember_me: !!remember_me, time: new Date().toISOString() });
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS', message: '帳號或密碼錯誤' });
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended', code: 'ACCOUNT_SUSPENDED', message: '您的帳號已被暫停使用，請聯繫客服' });
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS', message: '帳號或密碼錯誤' });
    const expiresIn = remember_me ? '30d' : (process.env.JWT_EXPIRES_IN || '7d');
    const token = jwt.sign({ user_id: user.user_id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn });
    await User.updateLastLogin(user.user_id);
    return res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        signature: user.signature ?? null,
        role: user.role,
        profile_image: user.profile_image
      }
    });
  } catch (err) {
    return serverError(res, err);
  }
};

// POST /auth/logout
exports.logout = async (req, res) => {
  try {
    return res.json({ message: 'Logout successful', code: 'LOGOUT_SUCCESS' });
  } catch (err) {
    return serverError(res, err);
  }
};

// GET /auth/me
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    return res.json({
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        signature: user.signature ?? null,
        gender: user.gender,
        birth_date: user.birth_date,
        role: user.role,
        status: user.status,
        profile_image: user.profile_image,
        created_at: user.created_at
      }
    });
  } catch (err) {
    return serverError(res, err);
  }
};
