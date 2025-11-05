-- 好友關係表
CREATE TABLE IF NOT EXISTS `friends` (
  `friend_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `user_id` CHAR(36) NOT NULL COMMENT '使用者 ID',
  `friend_user_id` CHAR(36) NOT NULL COMMENT '好友使用者 ID',
  `status` ENUM('pending', 'accepted', 'blocked') NOT NULL DEFAULT 'accepted' COMMENT '好友狀態',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`friend_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_friend_user_id` (`friend_user_id`),
  UNIQUE KEY `uk_user_friend` (`user_id`, `friend_user_id`),
  CONSTRAINT `fk_friends_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_friends_friend` FOREIGN KEY (`friend_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_no_self_friend` CHECK (`user_id` != `friend_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='好友關係表';
