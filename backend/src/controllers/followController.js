const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/Notification');

/**
 * 獲取所有追蹤中 (following) 列表
 * @route GET /api/v1/followers
 * @access Private
 */
exports.getAll = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // 取得目前使用者追蹤中的清單 (following)
    const [rows] = await db.query(
      `SELECT 
        f.follow_id as follow_id,
        f.follower_id as user_id,
        f.following_id as following_user_id,
        f.status,
        f.created_at,
  u.username
      FROM followers f
      JOIN users u ON f.following_id = u.user_id
      WHERE f.follower_id = ? AND f.status = 'active'
      ORDER BY f.created_at DESC`,
      [userId]
    );
    
    res.json({
      message: 'Following retrieved successfully',
      following: rows
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      message: 'Failed to get following',
      error: error.message
    });
  }
};

/**
 * 添加追蹤 (follow)
 * @route POST /api/v1/followers
 * @access Private
 */
exports.add = async (req, res) => {
  try {
  const userId = req.user.user_id;
  const { friend_id, following_id } = req.body; // following_id preferred: 被追蹤者的 user_id
  const targetId = following_id || friend_id;
    
  console.log('=====================================');
  console.log('📝 ADD FOLLOW REQUEST');
    console.log('當前用戶:', userId);
  console.log('要追蹤:', targetId);
    console.log('=====================================');
    
    if (!targetId) {
      return res.status(400).json({
        message: 'following_id (or friend_id) is required'
      });
    }
    
    if (userId === targetId) {
      return res.status(400).json({
        message: 'Cannot follow yourself'
      });
    }
    
    // 檢查是否已經追蹤此用戶（單向檢查）
    const [existing] = await db.query(
      `SELECT * FROM followers 
       WHERE follower_id = ? AND following_id = ?`,
      [userId, targetId]
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
    
  console.log('✅ 插入新追蹤關係:', userId, '-->', targetId);
    
    await db.execute(
      `INSERT INTO followers (follow_id, follower_id, following_id, status)
       VALUES (?, ?, ?, 'active')`,
      [friendshipId, userId, targetId]
    );
    
    console.log('✅ 插入成功！');
    console.log('=====================================');
    
    // 檢查對方是否也追蹤了你（互相追蹤）
    const [reverseFollow] = await db.query(
      `SELECT * FROM followers 
       WHERE follower_id = ? AND following_id = ?`,
      [targetId, userId]
    );
    
    const isMutual = reverseFollow.length > 0;
    
    // 獲取當前用戶資訊
    const [currentUser] = await db.query(
      'SELECT username FROM users WHERE user_id = ?',
      [userId]
    );

    // 發送通知給被追蹤的用戶
  const displayName = currentUser[0]?.username || '某位用戶';
    const notificationTitle = isMutual ? '新的互相追蹤' : '新的追蹤者';
    const notificationContent = isMutual 
      ? `${displayName} 也追蹤了你，你們現在互相追蹤了！`
      : `${displayName} 開始追蹤你了`;
    
    await Notification.create(
      targetId,
      'follow',
      notificationTitle,
      notificationContent,
      userId,
      null
    );
    
    res.status(201).json({
      message: 'Follow added successfully',
      follow_id: friendshipId,
      is_mutual: isMutual
    });
  } catch (error) {
    console.error('Add follow error:', error);
    res.status(500).json({
      message: 'Failed to add follow',
      error: error.message
    });
  }
};

/**
 * 移除追蹤
 * @route DELETE /api/v1/followers/:friendId
 * @access Private
 */
exports.remove = async (req, res) => {
  try {
    const userId = req.user.user_id;
  const { followingId, friendId } = req.params; // followingId preferred
  const targetId = followingId || friendId;

    // 刪除單向追蹤關係
    await db.execute(
      `DELETE FROM followers 
       WHERE follower_id = ? AND following_id = ?`,
      [userId, targetId]
    );
    
    res.json({
      message: 'Follow removed successfully'
    });
  } catch (error) {
    console.error('Remove follow error:', error);
    res.status(500).json({
      message: 'Failed to remove follow',
      error: error.message
    });
  }
};

/**
 * 檢查追蹤狀態
 * @route GET /api/v1/followers/status/:userId
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
      `SELECT * FROM followers 
       WHERE follower_id = ? AND following_id = ?`,
      [userId, targetUserId]
    );
    
    console.log('我追蹤對方?', youFollow.length > 0, youFollow);
    
    // 檢查對方是否追蹤你
    const [theyFollow] = await db.query(
      `SELECT * FROM followers 
       WHERE follower_id = ? AND following_id = ?`,
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
 * @route GET /api/v1/followers/:userId/following
 * @access Private
 */
exports.getFollowingByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `SELECT 
    f.follow_id as follow_id,
    f.follower_id as user_id,
    f.following_id as following_user_id,
        f.status,
        f.created_at,
  u.username
       FROM followers f
       JOIN users u ON f.following_id = u.user_id
       WHERE f.follower_id = ? AND f.status = 'active'
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
 * @route GET /api/v1/followers/:userId/followers
 * @access Private
 */
exports.getFollowersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `SELECT 
    f.follow_id as follow_id,
    f.follower_id as user_id,
    f.following_id as following_user_id,
        f.status,
        f.created_at,
  u.username
       FROM followers f
       JOIN users u ON f.follower_id = u.user_id
       WHERE f.following_id = ? AND f.status = 'active'
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
 * @route GET /api/v1/followers/:userId/counts
 * @access Private
 */
exports.getCounts = async (req, res) => {
  try {
    const { userId } = req.params;

    const [[{ count: followingCount }]] = await db.query(
      `SELECT COUNT(*) AS count FROM followers WHERE follower_id = ?`,
      [userId]
    );
    const [[{ count: followerCount }]] = await db.query(
      `SELECT COUNT(*) AS count FROM followers WHERE following_id = ?`,
      [userId]
    );

    res.json({ followerCount, followingCount });
  } catch (error) {
    console.error('Get follow counts error:', error);
    res.status(500).json({ message: 'Failed to get follow counts', error: error.message });
  }
};
// Legacy follows controller removed. Keep a defensive handler.
exports.notAvailable = (req, res) => {
  res.status(410).json({ message: 'The follows API is removed. Use /api/v1/followers endpoints.' });
};
