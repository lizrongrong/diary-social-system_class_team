/**
 * 表單驗證中介層
 * 使用簡單的 JavaScript 驗證規則
 */

/**
 * 驗證 Email 格式
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Export helper so other modules can reuse email validation
exports.isValidEmail = isValidEmail;

const MAX_PROFILE_IMAGE_BYTES = 9 * 1024 * 1024; // 9MB limit

const parseImageDataUri = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const match = /^data:image\/(png|jpe?g|svg\+xml);base64,(.+)$/i.exec(value.trim());
  if (!match) {
    return null;
  }
  return {
    mime: match[1].toLowerCase(),
    base64: match[2]
  };
};

const estimateBase64Size = (base64String = '') => {
  const cleaned = base64String.trim();
  if (!cleaned) {
    return 0;
  }
  const padding = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
  return cleaned.length * 0.75 - padding;
};

const validateProfileImageValue = (value) => {
  if (value === undefined) {
    return null;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return 'Profile image must be a string value';
  }

  const trimmed = value.trim();

  const dataUri = parseImageDataUri(trimmed);
  if (dataUri) {
    const size = estimateBase64Size(dataUri.base64);
    if (size > MAX_PROFILE_IMAGE_BYTES) {
      return 'Profile image must be 9MB or smaller';
    }
    return null;
  }

  if (trimmed.length > 500) {
    return 'Profile image path must be 500 characters or fewer';
  }

  const urlRegex = /^(https?:\/\/|\/)/i;
  if (!urlRegex.test(trimmed)) {
    return 'Profile image must be a data URI, absolute URL, or server path';
  }

  return null;
};

/**
 * 驗證密碼強度
 * 8-20 字元，包含字母、數字、特殊符號
 */
const isValidPassword = (password) => {
  if (!password || password.length < 8 || password.length > 20) {
    return false;
  }

  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*#?&]/.test(password);

  return hasLetter && hasNumber && hasSpecial;
};

/**
 * 驗證 Username
 * schema: VARCHAR(10) => 3-10 字元，僅允許英數字與底線
 */
const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,10}$/;
  return usernameRegex.test(username);
};

/**
 * 驗證日期格式
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * 註冊驗證
 */
exports.validateRegister = (req, res, next) => {
  const { email, password, username, gender, birth_date, user_id, profile_image } = req.body;
  const errors = {};

  // Email 驗證
  if (!email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Invalid email format';
  }

  // 密碼驗證
  if (!password) {
    errors.password = 'Password is required';
  } else if (!isValidPassword(password)) {
    errors.password = 'Password must be 8-20 characters with letters, numbers and special characters';
  }

  // Username 驗證
  if (!username) {
    errors.username = 'Username is required';
  } else if (!isValidUsername(username)) {
    errors.username = 'Username must be 3-50 characters (letters, numbers, underscores only)';
  }

  // User ID 驗證 (前端填寫的短 ID)
  if (!user_id) {
    errors.user_id = 'User ID is required';
  } else {
    const userIdRegex = /^[a-zA-Z0-9_]{3,10}$/;
    if (!userIdRegex.test(user_id)) {
      errors.user_id = 'User ID must be 3-10 characters (letters, numbers, underscores only)';
    }
  }

  // Username 已在上方驗證，schema 中沒有 display_name 欄位

  // Gender 驗證
  const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
  if (!gender) {
    errors.gender = 'Gender is required';
  } else if (!validGenders.includes(gender)) {
    errors.gender = 'Invalid gender value';
  }

  // Birth Date 驗證
  if (!birth_date) {
    errors.birth_date = 'Birth date is required';
  } else if (!isValidDate(birth_date)) {
    errors.birth_date = 'Invalid date format';
  }

  const profileImageError = validateProfileImageValue(profile_image);
  if (profileImageError) {
    errors.profile_image = profileImageError;
  }

  // 如果有錯誤，返回 400
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};

/**
 * 登入驗證
 */
exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = {};

  // Email 驗證
  if (!email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Invalid email format';
  }

  // 密碼驗證
  if (!password) {
    errors.password = 'Password is required';
  }

  // 如果有錯誤，返回 400
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};

/**
 * 修改密碼驗證
 */
exports.validateChangePassword = (req, res, next) => {
  const { old_password, new_password, new_password_confirm } = req.body;
  const errors = {};

  // 舊密碼驗證
  if (!old_password) {
    errors.old_password = 'Old password is required';
  }

  // 新密碼驗證
  if (!new_password) {
    errors.new_password = 'New password is required';
  } else if (!isValidPassword(new_password)) {
    errors.new_password = 'Password must be 8-20 characters with letters, numbers and special characters';
  }

  // 確認密碼驗證
  if (!new_password_confirm) {
    errors.new_password_confirm = 'Password confirmation is required';
  } else if (new_password !== new_password_confirm) {
    errors.new_password_confirm = 'Passwords do not match';
  }

  // 如果有錯誤，返回 400
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};

/**
 * 更新個人資料驗證
 */
exports.validateUpdateProfile = (req, res, next) => {
  const { username, gender, birth_date, profile_image } = req.body;
  const errors = {};

  // Username 驗證 (選填)
  if (username !== undefined) {
    if (!isValidUsername(username)) {
      errors.username = 'Username must be 3-10 characters (letters, numbers, underscores only)';
    }
  }

  // Gender 驗證 (選填)
  if (gender !== undefined) {
    const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    if (!validGenders.includes(gender)) {
      errors.gender = 'Invalid gender value';
    }
  }

  // Birth date 驗證 (選填)
  if (birth_date !== undefined) {
    if (!isValidDate(birth_date)) {
      errors.birth_date = 'Invalid date format';
    }
  }

  const profileImageError = validateProfileImageValue(profile_image);
  if (profileImageError) {
    errors.profile_image = profileImageError;
  }

  // 如果有錯誤，返回 400
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};

/**
 * 日記驗證 (基礎版)
 */
exports.validateDiary = (req, res, next) => {
  const { title, content, visibility } = req.body;
  const errors = {};

  // 標題驗證
  if (!title) {
    errors.title = 'Title is required';
  } else if (title.length < 1 || title.length > 200) {
    errors.title = 'Title must be 1-200 characters';
  }

  // 內容驗證
  if (!content) {
    errors.content = 'Content is required';
  } else if (content.length < 1 || content.length > 10000) {
    errors.content = 'Content must be 1-10,000 characters';
  }

  // 可見性驗證
  const validVisibility = ['private', 'followers', 'public'];
  if (visibility && !validVisibility.includes(visibility)) {
    errors.visibility = "Invalid visibility value (private/followers/public)";
  }

  // 如果有錯誤，返回 400
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};
