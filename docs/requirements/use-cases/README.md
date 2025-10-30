# 日記互動系統 - Use Case 使用案例文件

**文件資訊**
- 建立日期: 2025-10-29
- 最後更新: 2025-10-29
- 版本: v1.1 *(已修正不準確部分)*
- 填表人: 李芝瑢  
- 專案: 日記互動系統 (Resonote)
- 文件類型: Use Case 使用案例規格書

**版本更新記錄**
- v1.1 (2025-10-29): 修正好友追蹤機制、完善 AI 分析流程、優化標籤設定說明、改善錯誤處理
- v1.0 (2025-10-29): 初始版本,建立 33 個 Use Case

---

## 系統概念

### 系統名稱
**日記互動系統**

### 系統概念
是一個整合日記記錄、AI 情緒分析、趣味互動與社交功能的平台,旨在幫助使用者自我反思、掌握心理情緒變化,並透過社交與趣味互動提升使用黏著度。

---

## Use Case 索引

### 1.0 帳號與使用者管理模組
- [UC-1.1 註冊](1-account-management/UC-1.1-register.md)
- [UC-1.2 登入/登出](1-account-management/UC-1.2-login-logout.md)
- [UC-1.3 修改個人資料](1-account-management/UC-1.3-edit-profile.md)
- [UC-1.4 刪除帳號](1-account-management/UC-1.4-delete-account.md)
- [UC-1.5 通知中心](1-account-management/UC-1.5-notification-center.md) *(已更新:訊息→通知)*
- [UC-1.6 管理好友名單](1-account-management/UC-1.6-manage-friends.md) *(已更新:單向追蹤機制)*
- [UC-1.7 問題回饋](1-account-management/UC-1.7-feedback.md)
- [UC-1.8 搜尋](1-account-management/UC-1.8-search.md)

### 2.0 日記管理模組
- [UC-2.1 新增日記資料](2-diary-management/UC-2.1-create-diary.md) *(已更新:網路中斷處理)*
- [UC-2.2 編輯日記資料](2-diary-management/UC-2.2-edit-diary.md)
- [UC-2.3 刪除日記資料](2-diary-management/UC-2.3-delete-diary.md)
- [UC-2.4 查看日記資料](2-diary-management/UC-2.4-view-diary.md)
- [UC-2.5 留言日記資料](2-diary-management/UC-2.5-comment-diary.md)
- [UC-2.6 點讚日記資料](2-diary-management/UC-2.6-like-diary.md)
- [UC-2.7 日記關鍵字設定](2-diary-management/UC-2.7-set-keywords.md) *(已更新:詳細流程)*
- [UC-2.8 日記情緒標籤設定](2-diary-management/UC-2.8-set-mood.md) *(已更新:詳細流程)*
- [UC-2.9 日記天氣標籤設定](2-diary-management/UC-2.9-set-weather.md) *(已更新:詳細流程)*
- [UC-2.10 AI日記內容分析](2-diary-management/UC-2.10-ai-analysis.md) *(已更新:完整分析流程)*
- [UC-2.11 每月日記回顧](2-diary-management/UC-2.11-monthly-review.md)
- [UC-2.12 分享日記資料](2-diary-management/UC-2.12-share-diary.md)
- [UC-2.13 私密日記資料](2-diary-management/UC-2.13-private-diary.md)
- [UC-2.14 公開日記資料](2-diary-management/UC-2.14-public-diary.md)

### 3.0 趣味互動模組
- [UC-3.1 每日一次抽取卡牌](3-fun-interaction/UC-3.1-draw-card.md) *(已更新:完整抽卡邏輯)*
- [UC-3.2 解釋卡牌](3-fun-interaction/UC-3.2-explain-card.md)
- [UC-3.3 分享卡牌](3-fun-interaction/UC-3.3-share-card.md)

### 4.0 社交互動模組
- [UC-4.1 日記查看](4-social-interaction/UC-4.1-view-others-diary.md)
- [UC-4.2 日記留言](4-social-interaction/UC-4.2-comment-others-diary.md)
- [UC-4.3 日記點讚](4-social-interaction/UC-4.3-like-others-diary.md)
- [UC-4.4 追蹤/取消追蹤他人](4-social-interaction/UC-4.4-follow-user.md) *(已更新:單向追蹤機制)*

### 5.0 後台管理模組
- [UC-5.1 管理使用者資料](5-admin-management/UC-5.1-manage-users.md)
- [UC-5.2 系統訊息發布](5-admin-management/UC-5.2-publish-announcement.md)
- [UC-5.3 問題回饋處理](5-admin-management/UC-5.3-handle-feedback.md)
- [UC-5.4 每位使用者日記總數](5-admin-management/UC-5.4-diary-statistics.md)

---

## 系統功能清單摘要

本系統以「日記情緒互動平台」為核心,整合日記紀錄分析、社交互動與趣味占卜等模組,提供使用者一個兼具情緒表達、回顧反思與社群交流的整合性平台。

**主要功能**: 面向一般使用者,提供帳號管理、日記紀錄、情緒標籤設定、AI智慧分析、好友互動及趣味卡牌占卜等功能。

**管理功能**: 由管理員操作,用於維護使用者資料、發布公告、處理問題回饋、監控使用情況與系統活躍度。
