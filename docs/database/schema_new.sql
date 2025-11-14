-- =========================================================
-- Diary System 資料庫 Schema (整合版)
-- 統一 UTF-8 編碼、整合 migrations 與 friends 表修正版
-- =========================================================

-- 設定字元集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------
-- 1. 使用者資料表
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` VARCHAR(10) NOT NULL UNIQUE COMMENT '使用者自訂ID (唯一)',
  `username` VARCHAR(10) NOT NULL COMMENT '使用者名稱',
  `email` VARCHAR(50) NOT NULL UNIQUE COMMENT '電子郵件',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '密碼雜湊值',
  `role` ENUM('guest', 'member', 'admin') NOT NULL DEFAULT 'member' COMMENT '角色',
  `status` ENUM('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active' COMMENT '狀態',
  `gender` ENUM('male', 'female', 'other', 'prefer_not_to_say') NOT NULL DEFAULT 'prefer_not_to_say' COMMENT '性別',
  `birth_date` DATE NOT NULL COMMENT '生日 (需 ≥13歲)',
  `profile_image` VARCHAR(500) DEFAULT NULL COMMENT '個人頭貼圖片 (Base64/URL，<=9MB)',
  `signature` VARCHAR(50) DEFAULT NULL COMMENT '個性簽名',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  `reset_token` VARCHAR(255) DEFAULT NULL COMMENT '密碼重設 Token',
  `reset_token_expiry` DATETIME DEFAULT NULL COMMENT '重設 Token 到期時間',
  `email_verified` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Email 是否驗證',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_created_at` (`created_at`)
  /* CONSTRAINT `chk_age` CHECK (TIMESTAMPDIFF(YEAR, `birth_date`, CURDATE()) >= 13) */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用者資料表';


-- ---------------------------------------------------------
-- 2. 追蹤名單表
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `followers` (
  `follow_id` CHAR(36) NOT NULL COMMENT '追蹤Id',
  `follower_id` VARCHAR(10) NOT NULL COMMENT '追蹤者 ID',
  `following_id` VARCHAR(10) NOT NULL COMMENT '被追蹤者 ID',
  `status` ENUM('active', 'blocked') NOT NULL DEFAULT 'active' COMMENT '追蹤狀態',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`follow_id`),
  UNIQUE KEY `uk_follower_following` (`follower_id`, `following_id`),
  KEY `idx_follower` (`follower_id`),
  KEY `idx_following` (`following_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_followers_follower` FOREIGN KEY (`follower_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_followers_following` FOREIGN KEY (`following_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_no_self_follow` CHECK (`follower_id` != `following_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='追蹤名單表';


-- ---------------------------------------------------------
-- 3. 日記主表
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `diaries` (
  `diary_id` CHAR(36) NOT NULL COMMENT '日記ID',
  `user_id` VARCHAR(10) NOT NULL COMMENT '使用者 ID(作者)',
  `title` VARCHAR(50) NOT NULL COMMENT '日記標題',
  `content` TEXT NOT NULL COMMENT '日記內容',
  `visibility` ENUM('private', 'followers', 'public') NOT NULL DEFAULT 'private' COMMENT '可見範圍',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  PRIMARY KEY (`diary_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at` DESC),
  CONSTRAINT `fk_diaries_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日記資料表';


-- =========================================================
-- 4. 情緒標籤表
-- =========================================================
DROP TABLE IF EXISTS `emotion_tags`;
CREATE TABLE `emotion_tags` (
  `emotion_id` CHAR(36) NOT NULL COMMENT '情緒ID',
  `emotion_name` VARCHAR(50) NOT NULL COMMENT '情緒名稱',
  `color_code` VARCHAR(7) DEFAULT NULL COMMENT 'HEX 顏色 #RRGGBB',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`emotion_id`),
  UNIQUE KEY `uk_emotion_name` (`emotion_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='情緒標籤定義';


-- =========================================================
-- 5. 天氣標籤表
-- =========================================================
DROP TABLE IF EXISTS `weather_tags`;
CREATE TABLE `weather_tags` (
  `weather_id` CHAR(36) NOT NULL COMMENT '天氣ID',
  `weather_name` VARCHAR(50) NOT NULL COMMENT '天氣名稱',
  `color_code` VARCHAR(7) DEFAULT NULL COMMENT 'HEX 顏色 #RRGGBB',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`weather_id`),
  UNIQUE KEY `uk_weather_name` (`weather_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='天氣標籤定義';


-- =========================================================
-- 6. 日記標籤關聯表
-- =========================================================
DROP TABLE IF EXISTS `diary_tags`;
CREATE TABLE `diary_tags` (
  `tag_id` CHAR(36) NOT NULL COMMENT '標籤ID',
  `diary_id` CHAR(36) NOT NULL COMMENT '日記ID',
  `tag_type` ENUM('emotion', 'weather', 'keyword') NOT NULL COMMENT '標籤類型',
  `tag_ref_id` CHAR(36) DEFAULT NULL COMMENT '對應 emotion_id 或 weather_id, keyword 為 NULL',
  `tag_value` VARCHAR(50) DEFAULT NULL COMMENT '自訂文字標籤，keyword 類型使用',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`tag_id`),
  KEY `idx_diary_id` (`diary_id`),
  KEY `idx_tag_type_ref` (`tag_type`, `tag_ref_id`),
  CONSTRAINT `fk_diary_tags_diary` FOREIGN KEY (`diary_id`) REFERENCES `diaries` (`diary_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日記標籤表';


-- ---------------------------------------------------------
-- 7. 日記媒體檔案表
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `diary_media` (
  `media_id` CHAR(36) NOT NULL COMMENT '媒體ID',
  `diary_id` CHAR(36) NOT NULL COMMENT '日記ID',
  `file_url` VARCHAR(500) NOT NULL COMMENT '檔案 URL',
  `file_type` ENUM('image', 'video', 'audio', 'document') NOT NULL COMMENT '檔案類型',
  `file_size` INT NOT NULL COMMENT '檔案大小 (bytes)',
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上傳時間',
  PRIMARY KEY (`media_id`),
  KEY `idx_diary_id` (`diary_id`),
  CONSTRAINT `fk_diary_media_diary` FOREIGN KEY (`diary_id`) REFERENCES `diaries` (`diary_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_file_size` CHECK (`file_size` > 0 AND `file_size` <= 5242880)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日記媒體檔案';


-- ---------------------------------------------------------
-- 8. 留言表 (支援回覆與狀態管理)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `comment_id` CHAR(36) NOT NULL COMMENT '留言ID',
  `diary_id` CHAR(36) NOT NULL COMMENT '所屬日記 ID',
  `user_id` VARCHAR(10) NOT NULL COMMENT '留言者 ID',
  `content` TEXT NOT NULL COMMENT '留言內容 (上限 1000 字)',
  `parent_comment_id` CHAR(36) DEFAULT NULL COMMENT '回覆對象 (一層)',
  `status` ENUM('active', 'deleted', 'flagged') NOT NULL DEFAULT 'active' COMMENT '留言狀態',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  PRIMARY KEY (`comment_id`),
  KEY `idx_diary_id` (`diary_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_parent_comment_id` (`parent_comment_id`),
  CONSTRAINT `fk_comments_diary` FOREIGN KEY (`diary_id`) REFERENCES `diaries` (`diary_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_parent` FOREIGN KEY (`parent_comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_comment_length` CHECK (CHAR_LENGTH(`content`) <= 1000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言表（支援回覆與狀態管理）';


-- ---------------------------------------------------------
-- 9. 按讚紀錄表
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `likes` (
  `like_id` CHAR(36) NOT NULL COMMENT '按讚ID',
  `target_type` ENUM('diary', 'comment') NOT NULL COMMENT '按讚對象類型',
  `target_id` CHAR(36) NOT NULL COMMENT 'diary_id 或 comment_id',
  `user_id` VARCHAR(10) NOT NULL COMMENT '按讚者',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '按讚時間',
  PRIMARY KEY (`like_id`),
  UNIQUE KEY `uk_target_user` (`target_type`, `target_id`, `user_id`),
  KEY `idx_target` (`target_type`, `target_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='按讚表';


-- ---------------------------------------------------------
-- 10. 私訊紀錄表
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `message_id` CHAR(36) NOT NULL COMMENT '私訊ID',
  `sender_id` VARCHAR(10) NOT NULL COMMENT '發送者',
  `receiver_id` VARCHAR(10) NOT NULL COMMENT '接收者',
  `message_type` ENUM('text', 'image', 'audio', 'file', 'emoji') NOT NULL DEFAULT 'text' COMMENT '訊息類型',
  `content` TEXT NOT NULL COMMENT '訊息內容',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已讀',
  `read_at` TIMESTAMP NULL DEFAULT NULL COMMENT '已讀時間',
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否刪除（邏輯刪除）',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '刪除時間',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '發送時間',
  PRIMARY KEY (`message_id`),
  KEY `idx_sender_receiver` (`sender_id`, `receiver_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at` DESC),
  KEY `idx_receiver_is_read_created` (`receiver_id`, `is_read`, `created_at`),
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_no_self_msg` CHECK (`sender_id` != `receiver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私訊表';

-- ---------------------------------------------------------
-- 11. 幸運小卡抽卡紀錄表
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_card_draws` (
  `draw_id` CHAR(36) NOT NULL COMMENT '抽卡紀錄ID',
  `user_id` VARCHAR(10) NOT NULL COMMENT '使用者ID (users.user_id)',
  `fortune_id` INT NOT NULL COMMENT '簽文ID (對應 fortunes.js)',
  `fortune_title` VARCHAR(120) NOT NULL COMMENT '簽文標題',
  `fortune_text` TEXT NOT NULL COMMENT '簽文內容',
  `card_slot` TINYINT UNSIGNED DEFAULT NULL COMMENT '抽取的卡片位置 (1~4)',
  `draw_date` DATE NOT NULL COMMENT '抽卡日期',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`draw_id`),
  UNIQUE KEY `uk_user_draw_date` (`user_id`, `draw_date`),
  KEY `idx_user_date` (`user_id`, `draw_date`),
  CONSTRAINT `fk_user_card_draws_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='幸運小卡抽卡紀錄表';


-- ---------------------------------------------------------
-- 12. AI 分析結果表
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_analysis` (
  `analysis_id` CHAR(36) NOT NULL COMMENT '分析結果ID',
  `diary_id` CHAR(36) NOT NULL COMMENT '日記 ID (一篇日記對應一筆分析結果)',
  `emotion_score` JSON NULL COMMENT 'AI 計算各情緒分數 (多維度)',
  `dominant_emotion` VARCHAR(50) NULL COMMENT '主要情緒',
  `keywords` JSON NULL COMMENT '日記關鍵字與 AI 自動抽取的關鍵詞',
  `summary` TEXT NULL COMMENT 'AI 自動生成日記摘要',
  `suggestion` TEXT NULL COMMENT 'AI 提供的建議或心理提醒',
  `analyzed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分析時間',
  `model_version` VARCHAR(20) NULL COMMENT 'AI 分析模型版本',
  `status` ENUM('pending','completed','failed') NOT NULL DEFAULT 'completed' COMMENT '分析狀態',
  PRIMARY KEY (`analysis_id`),
  UNIQUE KEY `uk_diary_id` (`diary_id`),
  CONSTRAINT `fk_ai_analysis_diary` FOREIGN KEY (`diary_id`) REFERENCES `diaries` (`diary_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 分析結果表';


-- ---------------------------------------------------------
-- 13. 月度回顧報告表
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `monthly_reviews`;
CREATE TABLE `monthly_reviews` (
  `review_id` CHAR(36) NOT NULL COMMENT '每筆月度回顧ID',
  `user_id` VARCHAR(10) NOT NULL COMMENT '使用者 ID，對應 users 表',
  `year_month` VARCHAR(7) NOT NULL COMMENT '統計年月 (YYYY-MM)',
  `total_diaries` INT NOT NULL DEFAULT 0 COMMENT '當月日記總數',
  `emotion_distribution` JSON NOT NULL COMMENT '情緒分佈統計，例如各情緒比例',
  `weather_distribution` JSON NULL COMMENT '天氣分佈統計，例如晴天/雨天比例',
  `most_active_day` DATE NULL COMMENT '當月最活躍日期',
  `dominant_emotion` VARCHAR(50) NULL COMMENT '當月主要情緒',
  `most_common_weather` VARCHAR(20) NULL COMMENT '當月最常出現的天氣',
  `mood_trend` JSON NULL COMMENT '每日情緒走勢，用於折線圖',
  `diary_ids` JSON NULL COMMENT '當月所有日記的 ID 列表',
  `chart_data` JSON NULL COMMENT '前端圖表資料，直接渲染用',
  `generated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '報告生成時間',
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uk_user_year_month` (`user_id`, `year_month`),
  KEY `idx_year_month` (`year_month`),
  CONSTRAINT `fk_monthly_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每月回顧報告表';


-- ---------------------------------------------------------
-- 14.15. 系統通知與公告
-- ---------------------------------------------------------

-- 系統通知表
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `notification_id` CHAR(36) NOT NULL COMMENT 'UUID，通知唯一識別',
  `user_id` VARCHAR(10) NOT NULL COMMENT '接收者 ID',
  `type` ENUM('like', 'comment', 'follow', 'system') NOT NULL COMMENT '通知類型',
  `title` VARCHAR(200) NOT NULL COMMENT '通知標題',
  `content` TEXT NULL COMMENT '通知內容，可為 NULL',
  `source_user_id` VARCHAR(10) NULL COMMENT '觸發者 ID（如按讚、留言的使用者）',
  `related_diary_id` CHAR(36) DEFAULT NULL COMMENT '相關日記 ID（若通知與日記有關）',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '已讀狀態',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`notification_id`),
  KEY `idx_user_is_read` (`user_id`, `is_read`),
  KEY `idx_created_at` (`created_at` DESC),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_source` FOREIGN KEY (`source_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notifications_diary` FOREIGN KEY (`related_diary_id`) REFERENCES `diaries` (`diary_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系統通知表';

-- 系統公告表
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `announcement_id` CHAR(36) NOT NULL COMMENT '公告ID',
  `admin_id` VARCHAR(10) NOT NULL COMMENT '發布者 ID（管理員）',
  `title` VARCHAR(200) NOT NULL COMMENT '公告標題',
  `content` TEXT NOT NULL COMMENT '公告內容',
  `priority` ENUM('low', 'normal', 'high') NOT NULL DEFAULT 'normal' COMMENT '優先級',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否啟用',
  `published_at` TIMESTAMP NULL COMMENT '發布時間，可為 NULL',
  `expires_at` TIMESTAMP NULL COMMENT '過期時間，可為 NULL',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`announcement_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_published_at` (`published_at` DESC),
  CONSTRAINT `fk_announcements_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系統公告表';


-- ---------------------------------------------------------
-- 16. 問題回饋表
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `feedbacks`;

CREATE TABLE `feedbacks` (
  `feedback_id` CHAR(36) NOT NULL COMMENT '問題ID',
  `user_id` VARCHAR(10) NOT NULL COMMENT '提交者',
  `category` ENUM('general', 'feature', 'account', 'diary', 'followers', 'card', 'analysis', 'other') NOT NULL COMMENT '問題類別',
  `subject` VARCHAR(200) NOT NULL COMMENT '問題主旨',
  `description` TEXT NOT NULL COMMENT '詳細描述',
  `status` ENUM('pending', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'pending' COMMENT '狀態',
  `admin_reply` TEXT NULL COMMENT '管理員回覆',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交時間',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  `resolved_at` TIMESTAMP NULL COMMENT '解決時間',
  PRIMARY KEY (`feedback_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at` DESC),
  CONSTRAINT `fk_feedbacks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='問題回饋表';


-- ============================================
-- 17. 系統統計 (含活躍用戶與圖表數據)
-- ============================================

DROP TABLE IF EXISTS `system_stats`;
CREATE TABLE `system_stats` (
  `stat_id` CHAR(36) NOT NULL COMMENT '系統統計ID',
  `date` DATE NOT NULL COMMENT '統計日期',

  -- 使用者統計
  `total_users` INT NOT NULL DEFAULT 0 COMMENT '總使用者數',
  `active_users` INT NOT NULL DEFAULT 0 COMMENT '活躍使用者',
  `new_users_male` INT NOT NULL DEFAULT 0 COMMENT '新增男性會員',
  `new_users_female` INT NOT NULL DEFAULT 0 COMMENT '新增女性會員',
  `new_users_other` INT NOT NULL DEFAULT 0 COMMENT '新增其他性別會員',
  `existing_users_male` INT NOT NULL DEFAULT 0 COMMENT '原有男性會員',
  `existing_users_female` INT NOT NULL DEFAULT 0 COMMENT '原有女性會員',

  -- 日記統計
  `total_diaries` INT NOT NULL DEFAULT 0 COMMENT '日記總數',
  `new_diaries_today` INT NOT NULL DEFAULT 0 COMMENT '當日新增日記',

  -- 情緒統計
  `emotion_happy` INT NOT NULL DEFAULT 0 COMMENT '快樂日記數',
  `emotion_sad` INT NOT NULL DEFAULT 0 COMMENT '悲傷日記數',
  `emotion_angry` INT NOT NULL DEFAULT 0 COMMENT '生氣日記數',
  `emotion_neutral` INT NOT NULL DEFAULT 0 COMMENT '中性日記數',

  -- 抽卡統計
  `total_card_draws` INT NOT NULL DEFAULT 0 COMMENT '抽卡總數',
  `card_draws_today` INT NOT NULL DEFAULT 0 COMMENT '當日抽卡數',
  `card_draws_none` INT NOT NULL DEFAULT 0 COMMENT '未抽卡用戶數',

  -- 活躍用戶
  `most_active_user_id` CHAR(36) NULL COMMENT '當日最活躍用戶 ID',
  `most_active_user_diary_count` INT NOT NULL DEFAULT 0 COMMENT '當日最活躍用戶日記數',

  -- 圖表資料 (JSON)
  `chart_user_distribution` JSON NULL COMMENT '會員數圓餅圖資料 (四個族群: 原男/原女/新男/新女)',
  `chart_diary_count` JSON NULL COMMENT '日記總數長條圖資料 (年/月/週)',
  `chart_card_distribution` JSON NULL COMMENT '卡牌抽卡比例圓餅圖資料 (已抽/未抽)',

  `snapshot_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '快照時間',

  PRIMARY KEY (`stat_id`),
  UNIQUE KEY `uk_date` (`date`),
  KEY `idx_date` (`date` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系統統計快照';


-- ============================================
-- 初始資料
-- ============================================

-- 情緒標籤預設資料
INSERT INTO `emotion_tags` (`emotion_id`, `emotion_name`, `color_code`) VALUES
(UUID(), '開心', '#FFD700'),
(UUID(), '難過', '#4169E1'),
(UUID(), '焦慮', '#FF6347'),
(UUID(), '平靜', '#98FB98'),
(UUID(), '興奮', '#FF69B4'),
(UUID(), '疲憊', '#A9A9A9');

-- 天氣標籤預設資料
INSERT INTO `weather_tags` (`weather_id`, `weather_name`, `color_code`) VALUES
(UUID(), '晴天', '#FFD700'),
(UUID(), '陰天', '#A9A9A9'),
(UUID(), '雨天', '#4169E1'),
(UUID(), '雷雨', '#FF6347'),
(UUID(), '雪天', '#FF69B4');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 完成
-- ============================================