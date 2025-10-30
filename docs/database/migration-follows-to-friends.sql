-- ============================================
-- 資料庫遷移腳本: follows  friends
-- 版本: v1.0  v1.1
-- 日期: 2025-10-29
-- ============================================

-- 注意: 此腳本用於將現有的 follows 表遷移到 friends 表
-- 請在執行前備份資料庫!

-- Step 1: 創建新的 friends 表
CREATE TABLE IF NOT EXISTS `friends` (
  `friend_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `user_id` CHAR(36) NOT NULL COMMENT '追蹤者 (發起追蹤的人)',
  `friend_user_id` CHAR(36) NOT NULL COMMENT '被追蹤者 (被追蹤的人)',
  `status` ENUM('accepted', 'blocked') NOT NULL DEFAULT 'accepted' COMMENT '狀態',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '追蹤時間',
  PRIMARY KEY (`friend_id`),
  UNIQUE KEY `uk_user_friend` (`user_id`, `friend_user_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_friend_user` (`friend_user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_friends_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_friends_friend` FOREIGN KEY (`friend_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_no_self_follow` CHECK (`user_id` != `friend_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: 如果 follows 表存在,遷移數據
-- INSERT INTO friends (friend_id, user_id, friend_user_id, status, created_at)
-- SELECT follow_id, follower_id, following_id, 'accepted', created_at
-- FROM follows;

-- Step 3: 驗證數據遷移
-- SELECT COUNT(*) FROM friends;
-- SELECT COUNT(*) FROM follows;

-- Step 4: 確認無誤後,刪除舊表 (謹慎操作!)
-- DROP TABLE IF EXISTS follows;

-- ============================================
-- 說明:
-- 1. 程式碼已使用 friends 表,此腳本僅供文檔參考
-- 2. 實際資料庫已在 backend/src/config/db.js 自動創建 friends 表
-- 3. 如需從舊資料庫遷移,請先備份後執行 Step 2-4
-- ============================================
