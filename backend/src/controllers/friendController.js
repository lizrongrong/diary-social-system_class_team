const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/Notification');

/**
 * 獲取所有好友列表
 * @route GET /api/v1/friends
 * @access Private
 */
exports.getAll = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    const [rows] = await db.query(
      `SELECT 
        f.friend_id,
        f.user_id,
        f.friend_user_id,
        f.status,
        f.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM friends f
      JOIN users u ON f.friend_user_id = u.user_id
      WHERE f.user_id = ? AND f.status = 'accepted'
      ORDER BY f.created_at DESC`,
      [userId]
    );
    
    res.json({
      message: 'Friends retrieved successfully',
      friends: rows
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      message: 'Failed to get friends',
      error: error.message
    });
  }
};

/**
 * 添加好友
 * @route POST /api/v1/friends
 * @access Private
 */
exports.add = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { friend_id } = req.body;
    
    console.log('=====================================');
    console.log('📝 ADD FRIEND REQUEST');
    console.log('當前用戶:', userId);
    console.log('要追蹤:', friend_id);
    console.log('=====================================');
    
    if (!friend_id) {
      return res.status(400).json({
        message: 'friend_id is required'
      });
    }
    
    if (userId === friend_id) {
      return res.status(400).json({
        message: 'Cannot add yourself as friend'
      });
    }
    
    // 檢查是否已經追蹤此用戶（單向檢查）
    const [existing] = await db.query(
      `SELECT * FROM friends 
       WHERE user_id = ? AND friend_user_id = ?`,
      [userId, friend_id]
    );
    
    console.log('已存在的關係:', existing.length);
    
    if (existing.length > 0) {
      console.log('❌ 已經追蹤過了');
      return res.status(400).json({
        message: 'Already following this user'
      });
    }
    
    // 添加單向好友關係
    const friendshipId = uuidv4();
    
    console.log('✅ 插入新追蹤關係:', userId, '-->', friend_id);
    
    await db.execute(
      `INSERT INTO friends (friend_id, user_id, friend_user_id, status)
       VALUES (?, ?, ?, 'accepted')`,
      [friendshipId, userId, friend_id]
    );
    
    console.log('✅ 插入成功！');
    console.log('=====================================');
    
    // 檢查對方是否也追蹤了你（互相追蹤）
    const [reverseFollow] = await db.query(
      `SELECT * FROM friends 
       WHERE user_id = ? AND friend_user_id = ?`,
      [friend_id, userId]
    );
    
    const isMutual = reverseFollow.length > 0;
    
    // 獲取當前用戶資訊
    const [currentUser] = await db.query(
      'SELECT username, display_name FROM users WHERE user_id = ?',
      [userId]
    );
    
    // 發送通知給被追蹤的用戶
    const displayName = currentUser[0]?.display_name || currentUser[0]?.username || '某位用戶';
    const notificationTitle = isMutual ? '新的互相追蹤' : '新的追蹤者';
    const notificationContent = isMutual 
      ? `${displayName} 也追蹤了你，你們現在互相追蹤了！`
      : `${displayName} 開始追蹤你了`;
    
    await Notification.create(
      friend_id,
      'follow',
      notificationTitle,
      notificationContent,
      userId,
      null
    );
    
    res.status(201).json({
      message: 'Friend added successfully',
      friend_id: friendshipId,
      is_mutual: isMutual
    });
  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({
      message: 'Failed to add friend',
      error: error.message
    });
  }
};

/**
 * 移除好友
 * @route DELETE /api/v1/friends/:friendId
 * @access Private
 */
exports.remove = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { friendId } = req.params;
    
    // 刪除單向關係
    await db.execute(
      `DELETE FROM friends 
       WHERE user_id = ? AND friend_user_id = ?`,
      [userId, friendId]
    );
    
    res.json({
      message: 'Friend removed successfully'
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      message: 'Failed to remove friend',
      error: error.message
    });
  }
};

/**
 * 檢查好友狀態
 * @route GET /api/v1/friends/status/:userId
 * @access Private
 */
exports.checkStatus = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { userId: targetUserId } = req.params;
    
    console.log('=== checkStatus ===');
    console.log('當前用戶:', userId);
    console.log('目標用戶:', targetUserId);
    
    // 檢查你是否追蹤對方
    const [youFollow] = await db.query(
      `SELECT * FROM friends 
       WHERE user_id = ? AND friend_user_id = ?`,
      [userId, targetUserId]
    );
    
    console.log('我追蹤對方?', youFollow.length > 0, youFollow);
    
    // 檢查對方是否追蹤你
    const [theyFollow] = await db.query(
      `SELECT * FROM friends 
       WHERE user_id = ? AND friend_user_id = ?`,
      [targetUserId, userId]
    );
    
    console.log('對方追蹤我?', theyFollow.length > 0, theyFollow);
    
    const isFriend = youFollow.length > 0;
    const followsYou = theyFollow.length > 0;
    const isMutual = isFriend && followsYou;
    
    console.log('結果:', { isFriend, followsYou, isMutual });
    
    res.json({
      isFriend,
      followsYou,
      isMutual,
      status: isFriend ? youFollow[0].status : null
    });
  } catch (error) {
    console.error('Check friend status error:', error);
    res.status(500).json({
      message: 'Failed to check friend status',
      error: error.message
    });
  }
};

/**
 * 取得指定用戶的追蹤中列表（該用戶正在追蹤誰）
 * @route GET /api/v1/friends/:userId/following
 * @access Private
 */
exports.getFollowingByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `SELECT 
        f.friend_id,
        f.user_id,
        f.friend_user_id,
        f.status,
        f.created_at,
        u.username,
        u.display_name,
        u.avatar_url
       FROM friends f
       JOIN users u ON f.friend_user_id = u.user_id
       WHERE f.user_id = ? AND f.status = 'accepted'
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ following: rows });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Failed to get following', error: error.message });
  }
};

/**
 * 取得指定用戶的粉絲列表（誰在追蹤該用戶）
 * @route GET /api/v1/friends/:userId/followers
 * @access Private
 */
exports.getFollowersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `SELECT 
        f.friend_id,
        f.user_id,
        f.friend_user_id,
        f.status,
        f.created_at,
        u.username,
        u.display_name,
        u.avatar_url
       FROM friends f
       JOIN users u ON f.user_id = u.user_id
       WHERE f.friend_user_id = ? AND f.status = 'accepted'
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ followers: rows });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Failed to get followers', error: error.message });
  }
};

/**
 * 取得指定用戶的追蹤統計數
 * @route GET /api/v1/friends/:userId/counts
 * @access Private
 */
exports.getCounts = async (req, res) => {
  try {
    const { userId } = req.params;

    const [[{ count: followingCount }]] = await db.query(
      `SELECT COUNT(*) AS count FROM friends WHERE user_id = ?`,
      [userId]
    );
    const [[{ count: followerCount }]] = await db.query(
      `SELECT COUNT(*) AS count FROM friends WHERE friend_user_id = ?`,
      [userId]
    );

    res.json({ followerCount, followingCount });
  } catch (error) {
    console.error('Get follow counts error:', error);
    res.status(500).json({ message: 'Failed to get follow counts', error: error.message });
  }
};
