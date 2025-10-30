-- ============================================
-- Resonote 日記互動系統 - MySQL Schema (UTF-8)
-- 版本: v1.1 (更新 follows → friends)
-- 建立日期: 2025-10-26
-- 最後更新: 2025-10-29
-- ============================================

-- 設定字元集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. 使用者管理
-- ============================================

-- 1.1 使用者表
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `username` VARCHAR(50) NOT NULL COMMENT '使用者自訂ID (唯一)',
  `email` VARCHAR(255) NOT NULL COMMENT 'Email 帳號',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'BCrypt 雜湊',
  `display_name` VARCHAR(100) NOT NULL COMMENT '顯示名稱',
  `avatar_url` VARCHAR(500) NULL COMMENT '頭像 URL',
  `gender` ENUM('male', 'female', 'other', 'prefer_not_to_say') NOT NULL DEFAULT 'prefer_not_to_say' COMMENT '性別',
  `birth_date` DATE NOT NULL COMMENT '生日 (需 ≥13歲)',
  `role` ENUM('guest', 'member', 'admin') NOT NULL DEFAULT 'member' COMMENT '角色',
  `status` ENUM('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active' COMMENT '狀態',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  `last_login` TIMESTAMP NULL COMMENT '最後登入',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_status` (`status`),
  CONSTRAINT `chk_age` CHECK (TIMESTAMPDIFF(YEAR, `birth_date`, CURDATE()) >= 13)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用者表';

-- 1.2 好友追蹤關係表 (單向追蹤)
DROP TABLE IF EXISTS `friends`;
CREATE TABLE `friends` (
  `friend_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `user_id` CHAR(36) NOT NULL COMMENT '追蹤者 (發起追蹤的人)',
  `friend_user_id` CHAR(36) NOT NULL COMMENT '被追蹤者 (被追蹤的人)',
  `status` ENUM('accepted', 'blocked') NOT NULL DEFAULT 'accepted' COMMENT '狀態 (單向追蹤預設 accepted)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '追蹤時間',
  PRIMARY KEY (`friend_id`),
  UNIQUE KEY `uk_user_friend` (`user_id`, `friend_user_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_friend_user` (`friend_user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_friends_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_friends_friend` FOREIGN KEY (`friend_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_no_self_follow` CHECK (`user_id` != `friend_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='好友追蹤關係表 (單向追蹤機制)';

-- ============================================
-- 2. 日記管理
-- ============================================

-- 2.1 日記表
DROP TABLE IF EXISTS `diaries`;
CREATE TABLE `diaries` (
  `diary_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `user_id` CHAR(36) NOT NULL COMMENT '作者',
  `title` VARCHAR(200) NOT NULL COMMENT '標題',
  `content` TEXT NOT NULL COMMENT '內容 (上限 10,000 字)',
  `visibility` ENUM('private', 'public') NOT NULL DEFAULT 'private' COMMENT '可見性',
  `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft' COMMENT '狀態',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  `published_at` TIMESTAMP NULL COMMENT '發布時間',
  PRIMARY KEY (`diary_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_visibility_status` (`visibility`, `status`),
  KEY `idx_created_at` (`created_at` DESC),
  CONSTRAINT `fk_diaries_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_content_length` CHECK (CHAR_LENGTH(`content`) <= 10000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日記表';

-- 2.2 情緒標籤定義
DROP TABLE IF EXISTS `emotion_tags`;
CREATE TABLE `emotion_tags` (
  `emotion_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `emotion_name` VARCHAR(50) NOT NULL COMMENT '情緒名稱',
  `emotion_icon` VARCHAR(100) NULL COMMENT 'Icon 路徑',
  `color_code` VARCHAR(7) NULL COMMENT 'HEX 顏色',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`emotion_id`),
  UNIQUE KEY `uk_emotion_name` (`emotion_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='情緒標籤定義';

-- 2.3 天氣標籤定義
DROP TABLE IF EXISTS `weather_tags`;
CREATE TABLE `weather_tags` (
  `weather_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `weather_name` VARCHAR(50) NOT NULL COMMENT '天氣名稱',
  `weather_icon` VARCHAR(100) NULL COMMENT 'Icon 路徑',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`weather_id`),
  UNIQUE KEY `uk_weather_name` (`weather_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='天氣標籤定義';

-- 2.4 日記標籤表
DROP TABLE IF EXISTS `diary_tags`;
CREATE TABLE `diary_tags` (
  `tag_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `diary_id` CHAR(36) NOT NULL COMMENT '日記',
  `tag_type` ENUM('emotion', 'weather', 'keyword') NOT NULL COMMENT '標籤類型',
  `tag_value` VARCHAR(50) NOT NULL COMMENT '標籤值',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`tag_id`),
  KEY `idx_diary_id` (`diary_id`),
  KEY `idx_tag_type_value` (`tag_type`, `tag_value`),
  CONSTRAINT `fk_diary_tags_diary` FOREIGN KEY (`diary_id`) REFERENCES `diaries` (`diary_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日記標籤表';

-- 2.5 日記媒體檔案
DROP TABLE IF EXISTS `diary_media`;
CREATE TABLE `diary_media` (
  `media_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `diary_id` CHAR(36) NOT NULL COMMENT '日記',
  `file_url` VARCHAR(500) NOT NULL COMMENT '檔案 URL',
  `file_type` ENUM('image', 'video', 'audio', 'document') NOT NULL COMMENT '檔案類型',
  `file_size` INT NOT NULL COMMENT '檔案大小 (bytes)',
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上傳時間',
  PRIMARY KEY (`media_id`),
  KEY `idx_diary_id` (`diary_id`),
  CONSTRAINT `fk_diary_media_diary` FOREIGN KEY (`diary_id`) REFERENCES `diaries` (`diary_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_file_size` CHECK (`file_size` <= 5242880)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日記媒體檔案';

-- ============================================
-- 3. 社交互動
-- ============================================

-- 3.1 留言表
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `comment_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `diary_id` CHAR(36) NOT NULL COMMENT '日記',
  `user_id` CHAR(36) NOT NULL COMMENT '留言者',
  `content` TEXT NOT NULL COMMENT '留言內容 (上限 1,000 字)',
  `parent_comment_id` CHAR(36) NULL COMMENT '回覆對象 (一層)',
  `status` ENUM('active', 'deleted', 'flagged') NOT NULL DEFAULT 'active' COMMENT '狀態',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  PRIMARY KEY (`comment_id`),
  KEY `idx_diary_id` (`diary_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_parent_comment_id` (`parent_comment_id`),
  CONSTRAINT `fk_comments_diary` FOREIGN KEY (`diary_id`) REFERENCES `diaries` (`diary_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_parent` FOREIGN KEY (`parent_comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_comment_length` CHECK (CHAR_LENGTH(`content`) <= 1000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言表';

-- 3.2 按讚表
DROP TABLE IF EXISTS `likes`;
CREATE TABLE `likes` (
  `like_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `target_type` ENUM('diary', 'comment') NOT NULL COMMENT '按讚對象類型',
  `target_id` CHAR(36) NOT NULL COMMENT 'diary_id 或 comment_id',
  `user_id` CHAR(36) NOT NULL COMMENT '按讚者',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '按讚時間',
  PRIMARY KEY (`like_id`),
  UNIQUE KEY `uk_target_user` (`target_type`, `target_id`, `user_id`),
  KEY `idx_target` (`target_type`, `target_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='按讚表';

-- 3.3 私訊表
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `message_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `sender_id` CHAR(36) NOT NULL COMMENT '發送者',
  `receiver_id` CHAR(36) NOT NULL COMMENT '接收者',
  `content` TEXT NOT NULL COMMENT '訊息內容',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '已讀狀態',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '發送時間',
  PRIMARY KEY (`message_id`),
  KEY `idx_sender_receiver` (`sender_id`, `receiver_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at` DESC),
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私訊表';

-- ============================================
-- 4. AI 分析
-- ============================================

-- 4.1 AI 分析結果
DROP TABLE IF EXISTS `ai_analysis`;
CREATE TABLE `ai_analysis` (
  `analysis_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `diary_id` CHAR(36) NOT NULL COMMENT '日記 (一對一)',
  `emotion_score` JSON NULL COMMENT '情緒分數',
  `keywords` JSON NULL COMMENT '關鍵字',
  `sentiment` ENUM('positive', 'neutral', 'negative') NULL COMMENT '情感傾向',
  `summary` TEXT NULL COMMENT 'AI 摘要',
  `analyzed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分析時間',
  PRIMARY KEY (`analysis_id`),
  UNIQUE KEY `uk_diary_id` (`diary_id`),
  CONSTRAINT `fk_ai_analysis_diary` FOREIGN KEY (`diary_id`) REFERENCES `diaries` (`diary_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 分析結果';

-- 4.2 每月回顧
DROP TABLE IF EXISTS `monthly_reviews`;
CREATE TABLE `monthly_reviews` (
  `review_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `user_id` CHAR(36) NOT NULL COMMENT '使用者',
  `year_month` VARCHAR(7) NOT NULL COMMENT '年月 (2025-10)',
  `total_diaries` INT NOT NULL DEFAULT 0 COMMENT '日記總數',
  `emotion_distribution` JSON NOT NULL COMMENT '情緒分佈',
  `weather_distribution` JSON NOT NULL COMMENT '天氣分佈',
  `most_active_day` DATE NULL COMMENT '最活躍日期',
  `chart_data` JSON NULL COMMENT '圖表資料',
  `generated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '產生時間',
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uk_user_year_month` (`user_id`, `year_month`),
  KEY `idx_year_month` (`year_month`),
  CONSTRAINT `fk_monthly_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每月回顧';

-- ============================================
-- 5. 趣味互動
-- ============================================

-- 5.1 卡牌資料庫
DROP TABLE IF EXISTS `cards`;
CREATE TABLE `cards` (
  `card_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `card_name` VARCHAR(100) NOT NULL COMMENT '卡牌名稱',
  `card_image_url` VARCHAR(500) NOT NULL COMMENT '圖片 URL',
  `description` TEXT NULL COMMENT '卡牌描述',
  `lucky_color` VARCHAR(50) NULL COMMENT '幸運顏色',
  `lucky_number` INT NULL COMMENT '幸運數字',
  `interpretation` TEXT NULL COMMENT '解釋說明',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否啟用',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`card_id`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='卡牌資料庫';

-- 5.2 抽卡紀錄
DROP TABLE IF EXISTS `card_draws`;
CREATE TABLE `card_draws` (
  `draw_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `user_id` CHAR(36) NOT NULL COMMENT '使用者',
  `card_id` CHAR(36) NOT NULL COMMENT '抽到的卡牌',
  `draw_date` DATE NOT NULL COMMENT '抽卡日期 (UTC+8)',
  `is_shared` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否分享',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '抽卡時間',
  PRIMARY KEY (`draw_id`),
  UNIQUE KEY `uk_user_draw_date` (`user_id`, `draw_date`),
  KEY `idx_user_date` (`user_id`, `draw_date` DESC),
  CONSTRAINT `fk_card_draws_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_card_draws_card` FOREIGN KEY (`card_id`) REFERENCES `cards` (`card_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='抽卡紀錄';

-- ============================================
-- 6. 通知與訊息
-- ============================================

-- 6.1 通知表
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `notification_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `user_id` CHAR(36) NOT NULL COMMENT '接收者',
  `type` ENUM('like', 'comment', 'follow', 'system') NOT NULL COMMENT '通知類型',
  `title` VARCHAR(200) NOT NULL COMMENT '通知標題',
  `content` TEXT NULL COMMENT '通知內容',
  `source_user_id` CHAR(36) NULL COMMENT '觸發者',
  `related_diary_id` CHAR(36) NULL COMMENT '相關日記',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '已讀狀態',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`notification_id`),
  KEY `idx_user_is_read` (`user_id`, `is_read`),
  KEY `idx_created_at` (`created_at` DESC),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_source` FOREIGN KEY (`source_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notifications_diary` FOREIGN KEY (`related_diary_id`) REFERENCES `diaries` (`diary_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- 6.2 系統公告
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `announcement_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `admin_id` CHAR(36) NOT NULL COMMENT '發布者',
  `title` VARCHAR(200) NOT NULL COMMENT '公告標題',
  `content` TEXT NOT NULL COMMENT '公告內容',
  `priority` ENUM('low', 'normal', 'high') NOT NULL DEFAULT 'normal' COMMENT '優先級',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否啟用',
  `published_at` TIMESTAMP NULL COMMENT '發布時間',
  `expires_at` TIMESTAMP NULL COMMENT '過期時間',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`announcement_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_published_at` (`published_at` DESC),
  CONSTRAINT `fk_announcements_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系統公告';

-- ============================================
-- 7. 問題回饋
-- ============================================

-- 7.1 問題回饋表
DROP TABLE IF EXISTS `feedbacks`;
CREATE TABLE `feedbacks` (
  `feedback_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `user_id` CHAR(36) NOT NULL COMMENT '提交者',
  `category` ENUM('bug', 'feature', 'complaint', 'other') NOT NULL COMMENT '問題類別',
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

-- 7.2 常見問題
DROP TABLE IF EXISTS `faq`;
CREATE TABLE `faq` (
  `faq_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `category` VARCHAR(50) NOT NULL COMMENT '分類',
  `question` VARCHAR(500) NOT NULL COMMENT '問題',
  `answer` TEXT NOT NULL COMMENT '回答',
  `display_order` INT NOT NULL DEFAULT 0 COMMENT '顯示順序',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否啟用',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  PRIMARY KEY (`faq_id`),
  KEY `idx_category` (`category`),
  KEY `idx_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='常見問題';

-- ============================================
-- 8. 系統統計
-- ============================================

-- 8.1 系統統計快照
DROP TABLE IF EXISTS `system_stats`;
CREATE TABLE `system_stats` (
  `stat_id` CHAR(36) NOT NULL COMMENT 'UUID',
  `date` DATE NOT NULL COMMENT '統計日期',
  `total_users` INT NOT NULL DEFAULT 0 COMMENT '總使用者數',
  `active_users` INT NOT NULL DEFAULT 0 COMMENT '活躍使用者',
  `new_users_male` INT NOT NULL DEFAULT 0 COMMENT '新增男性會員',
  `new_users_female` INT NOT NULL DEFAULT 0 COMMENT '新增女性會員',
  `total_diaries` INT NOT NULL DEFAULT 0 COMMENT '日記總數',
  `new_diaries_today` INT NOT NULL DEFAULT 0 COMMENT '當日新增日記',
  `total_card_draws` INT NOT NULL DEFAULT 0 COMMENT '抽卡總數',
  `card_draws_today` INT NOT NULL DEFAULT 0 COMMENT '當日抽卡數',
  `snapshot_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '快照時間',
  PRIMARY KEY (`stat_id`),
  UNIQUE KEY `uk_date` (`date`),
  KEY `idx_date` (`date` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系統統計快照';

-- ============================================
-- 初始資料
-- ============================================

-- 情緒標籤預設資料
INSERT INTO `emotion_tags` (`emotion_id`, `emotion_name`, `emotion_icon`, `color_code`) VALUES
(UUID(), '開心', 'happy.svg', '#FFD700'),
(UUID(), '難過', 'sad.svg', '#4169E1'),
(UUID(), '焦慮', 'anxious.svg', '#FF6347'),
(UUID(), '平靜', 'calm.svg', '#98FB98'),
(UUID(), '興奮', 'excited.svg', '#FF69B4'),
(UUID(), '疲憊', 'tired.svg', '#A9A9A9');

-- 天氣標籤預設資料
INSERT INTO `weather_tags` (`weather_id`, `weather_name`, `weather_icon`) VALUES
(UUID(), '晴天', 'sunny.svg'),
(UUID(), '陰天', 'cloudy.svg'),
(UUID(), '雨天', 'rainy.svg'),
(UUID(), '雷雨', 'thunderstorm.svg'),
(UUID(), '雪天', 'snowy.svg');

-- 卡牌預設資料 (7張)
INSERT INTO `cards` (`card_id`, `card_name`, `card_image_url`, `description`, `lucky_color`, `lucky_number`, `interpretation`) VALUES
(UUID(), '愚者', 'card_fool.jpg', '新的開始與無限可能', '白色', 0, '代表純真、冒險與信任直覺'),
(UUID(), '魔術師', 'card_magician.jpg', '創造與行動力', '紅色', 1, '擁有實現目標的能力與資源'),
(UUID(), '女祭司', 'card_priestess.jpg', '智慧與直覺', '藍色', 2, '聆聽內心聲音，保持神秘'),
(UUID(), '皇后', 'card_empress.jpg', '豐盛與創造', '綠色', 3, '象徵豐富、滋養與母性能量'),
(UUID(), '皇帝', 'card_emperor.jpg', '權威與秩序', '橙色', 4, '建立結構，掌控局面'),
(UUID(), '戀人', 'card_lovers.jpg', '選擇與和諧', '粉紅色', 6, '重要決定，關係與價值'),
(UUID(), '星星', 'card_star.jpg', '希望與靈感', '銀色', 17, '帶來希望、平靜與指引');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 完成
-- ============================================

