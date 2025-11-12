const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateAvatar } = require('../services/avatarGenerator');

/**
 * 取得使用者個人資料
 * @route GET /api/v1/users/profile
 * @access Private
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.user_id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        gender: user.gender,
        birth_date: user.birth_date,
        role: user.role,
        status: user.status,
        profile_image: user.profile_image,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 更新使用者個人資料
 * @route PUT /api/v1/users/profile
 * @access Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const { username, gender, birth_date, profile_image } = req.body;

    const currentUser = await User.findById(req.user.user_id);

    if (!currentUser) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const updates = {};
    let nextUsername = currentUser.username;

    if (username !== undefined) {
      const trimmedUsername = typeof username === 'string' ? username.trim() : username;

      if (trimmedUsername !== currentUser.username) {
        const exists = await User.usernameExists(trimmedUsername);
        if (exists) {
          return res.status(400).json({
            error: 'Username already exists',
            code: 'USERNAME_EXISTS',
            message: '使用者名稱已被使用，請換一個試試'
          });
        }
      }

      updates.username = trimmedUsername;
      nextUsername = trimmedUsername;
    }
    if (gender !== undefined) updates.gender = gender;
    if (birth_date !== undefined) updates.birth_date = birth_date;
    if (profile_image !== undefined) {
      updates.profile_image = typeof profile_image === 'string' && profile_image.trim().length > 0
        ? profile_image.trim()
        : generateAvatar(nextUsername || req.user.user_id);
    }

    const success = await User.update(req.user.user_id, updates);

    if (!success) {
      return res.status(400).json({
        error: 'Update failed',
        code: 'UPDATE_FAILED'
      });
    }

    // 取得更新後的使用者資料
    const updatedUser = await User.findById(req.user.user_id);

    res.json({
      message: 'Profile updated successfully',
      user: {
        user_id: updatedUser.user_id,
        email: updatedUser.email,
        username: updatedUser.username,
        gender: updatedUser.gender,
        birth_date: updatedUser.birth_date,
        role: updatedUser.role,
        profile_image: updatedUser.profile_image
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 修改密碼
 * @route PUT /api/v1/users/password
 * @access Private
 */
exports.changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    // 1. 取得使用者資料（包含密碼）
    const user = await User.findByEmail(req.user.email);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // 2. 驗證舊密碼
    const isValidPassword = await bcrypt.compare(old_password, user.password_hash);

    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Incorrect old password',
        code: 'INCORRECT_PASSWORD',
        message: '舊密碼錯誤'
      });
    }

    // 3. 加密新密碼
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // 4. 更新密碼
    const success = await User.updatePassword(req.user.user_id, newPasswordHash);

    if (!success) {
      return res.status(400).json({
        error: 'Password update failed',
        code: 'UPDATE_FAILED'
      });
    }

    res.json({
      message: 'Password changed successfully',
      code: 'PASSWORD_CHANGED'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 搜尋使用者
 * @route GET /api/v1/users/search
 * @access Private
 */
exports.searchUsers = async (req, res) => {
  try {
    const keyword = (req.query.keyword || '').trim();

    if (!keyword) {
      return res.json({ users: [] });
    }

    const options = {
      excludeUserId: req.user?.user_id
    };

    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!Number.isNaN(limit)) {
        options.limit = limit;
      }
    }

    const users = await User.search(keyword, options);
    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 取得指定使用者的公開資料
 * @route GET /api/v1/users/:username
 * @access Public
 */
exports.getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findByUsername(username);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // 只返回公開資料
    res.json({
      user: {
        user_id: user.user_id,
        username: user.username,
        profile_image: user.profile_image,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user by username error:', error);
    res.status(500).json({
      error: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};
