# Resonote 專案結構

> **版本**: v1.0  
> **更新日期**: 2025-10-26  
> **專案**: Resonote 日記互動系統

---

## 📁 專案目錄樹

```
diary_sys/
├── backend/                    # 後端 Node.js + Express 應用
│   ├── src/
│   │   ├── config/            # 配置文件
│   │   │   ├── db.js          # MySQL 連線池配置
│   │   │   └── jwt.js         # JWT 配置
│   │   ├── controllers/       # 控制器層
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── diaryController.js
│   │   │   ├── commentController.js
│   │   │   ├── likeController.js
│   │   │   ├── friendController.js
│   │   │   ├── messageController.js
│   │   │   ├── cardController.js
│   │   │   ├── notificationController.js
│   │   │   ├── announcementController.js
│   │   │   ├── feedbackController.js
│   │   │   └── adminController.js
│   │   ├── middleware/        # 中介層
│   │   │   ├── auth.js        # JWT 驗證中介層
│   │   │   ├── validation.js  # 資料驗證中介層
│   │   │   ├── errorHandler.js # 錯誤處理中介層
│   │   │   ├── upload.js      # 檔案上傳中介層
│   │   │   └── rateLimit.js   # 速率限制中介層
│   │   ├── models/            # 資料模型層
│   │   │   ├── User.js
│   │   │   ├── Diary.js
│   │   │   ├── Comment.js
│   │   │   ├── Like.js
│   │   │   ├── Friend.js
│   │   │   ├── Message.js
│   │   │   ├── Card.js
│   │   │   ├── Notification.js
│   │   │   ├── Announcement.js
│   │   │   └── Feedback.js
│   │   ├── routes/            # 路由定義
│   │   │   ├── auth.js        # 認證路由
│   │   │   ├── users.js       # 使用者路由
│   │   │   ├── diaries.js     # 日記路由
│   │   │   ├── comments.js    # 留言路由
│   │   │   ├── likes.js       # 按讚路由
│   │   │   ├── friends.js     # 追蹤/好友路由
│   │   │   ├── messages.js    # 私訊路由
│   │   │   ├── cards.js       # 抽卡路由
│   │   │   ├── notifications.js
│   │   │   ├── announcements.js
│   │   │   ├── feedbacks.js
│   │   │   └── admin.js       # 後台路由
│   │   ├── services/          # 業務邏輯層
│   │   │   ├── authService.js
│   │   │   ├── emailService.js
│   │   │   ├── uploadService.js
│   │   │   └── notificationService.js
│   │   ├── utils/             # 工具函數
│   │   │   ├── validators.js  # 驗證工具
│   │   │   ├── helpers.js     # 輔助函數
│   │   │   └── constants.js   # 常數定義
│   │   ├── index.js           # 應用入口
│   │   └── server.js          # 伺服器配置
│   ├── uploads/               # 上傳檔案儲存目錄
│   │   ├── avatars/          # 使用者頭像
│   │   ├── diaries/          # 日記附件
│   │   └── temp/             # 臨時檔案
│   ├── .env                   # 環境變數 (不提交到 Git)
│   ├── .env.example           # 環境變數範例
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── setup-db.js            # 資料庫建立腳本
│   └── test-connection.js     # 資料庫連線測試
│
├── frontend/                  # 前端 React + Vite 應用
│   ├── public/               # 靜態資源
│   │   ├── favicon.ico
│   │   └── robots.txt
│   ├── src/
│   │   ├── assets/           # 資源檔案
│   │   │   ├── images/
│   │   │   │   ├── logo.png
│   │   │   │   └── illustrations/
│   │   │   └── fonts/
│   │   ├── components/       # 元件
│   │   │   ├── common/       # 通用元件
│   │   │   │   ├── Button/
│   │   │   │   │   ├── Button.jsx
│   │   │   │   │   └── Button.css
│   │   │   │   ├── Input/
│   │   │   │   │   ├── Input.jsx
│   │   │   │   │   └── Input.css
│   │   │   │   ├── Card/
│   │   │   │   ├── Modal/
│   │   │   │   ├── Toast/
│   │   │   │   └── Loading/
│   │   │   ├── layout/       # 佈局元件
│   │   │   │   ├── Navbar/
│   │   │   │   │   ├── Navbar.jsx
│   │   │   │   │   └── Navbar.css
│   │   │   │   ├── Footer/
│   │   │   │   ├── Sidebar/
│   │   │   │   └── Container/
│   │   │   └── features/     # 功能元件
│   │   │       ├── DiaryCard/
│   │   │       ├── CommentList/
│   │   │       ├── UserCard/
│   │   │       ├── TagSelector/
│   │   │       └── RichTextEditor/
│   │   ├── pages/            # 頁面元件
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── LoginPage.css
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   ├── RegisterPage.css
│   │   │   │   └── ForgotPasswordPage.jsx
│   │   │   ├── diaries/
│   │   │   │   ├── DiaryListPage.jsx
│   │   │   │   ├── DiaryDetailPage.jsx
│   │   │   │   ├── DiaryFormPage.jsx
│   │   │   │   └── ExplorePage.jsx
│   │   │   ├── profile/
│   │   │   │   ├── ProfilePage.jsx
│   │   │   │   ├── SettingsPage.jsx
│   │   │   │   └── ChangePasswordPage.jsx
│   │   │   ├── social/
│   │   │   │   ├── FriendsPage.jsx
│   │   │   │   ├── MessagesPage.jsx
│   │   │   │   └── NotificationsPage.jsx
│   │   │   ├── fun/
│   │   │   │   ├── LuckyCardPage.jsx
│   │   │   │   └── AnalyticsPage.jsx
│   │   │   ├── system/
│   │   │   │   ├── AnnouncementsPage.jsx
│   │   │   │   ├── FeedbackPage.jsx
│   │   │   │   └── FAQPage.jsx
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── UserManagement.jsx
│   │   │   │   ├── ContentModeration.jsx
│   │   │   │   └── AnalyticsAdmin.jsx
│   │   │   ├── HomePage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── routes/           # 路由配置
│   │   │   ├── index.jsx     # 路由主配置
│   │   │   ├── ProtectedRoute.jsx  # 需認證路由
│   │   │   └── AdminRoute.jsx      # 管理員路由
│   │   ├── services/         # API 服務層
│   │   │   ├── api.js        # Axios 實例配置
│   │   │   ├── authService.js
│   │   │   ├── userService.js
│   │   │   ├── diaryService.js
│   │   │   ├── commentService.js
│   │   │   ├── likeService.js
│   │   │   ├── friendService.js
│   │   │   ├── messageService.js
│   │   │   ├── cardService.js
│   │   │   └── notificationService.js
│   │   ├── store/            # Zustand 狀態管理
│   │   │   ├── authStore.js
│   │   │   ├── diaryStore.js
│   │   │   ├── userStore.js
│   │   │   ├── notificationStore.js
│   │   │   └── uiStore.js
│   │   ├── hooks/            # 自訂 Hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useDiary.js
│   │   │   ├── useDebounce.js
│   │   │   ├── useInfiniteScroll.js
│   │   │   └── useLocalStorage.js
│   │   ├── utils/            # 工具函數
│   │   │   ├── validation.js # 表單驗證
│   │   │   ├── formatters.js # 格式化工具
│   │   │   ├── constants.js  # 常數定義
│   │   │   └── helpers.js    # 輔助函數
│   │   ├── App.jsx           # 根元件
│   │   ├── main.jsx          # 入口文件
│   │   └── index.css         # 全域樣式
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── README.md
│
├── docs/                      # 文件目錄
│   ├── api/                  # API 文件
│   │   └── openapi.yaml      # OpenAPI 3.0 規格
│   ├── database/             # 資料庫文件
│   │   ├── ERD.md            # 實體關係圖
│   │   ├── schema.sql        # 資料表結構
│   │   └── seeds.sql         # 測試資料
│   ├── design/               # 設計文件
│   │   ├── route-map.md      # 路由地圖
│   │   ├── field-dictionary.md  # 欄位字典
│   │   └── permission-matrix.md # 權限矩陣
│   ├── architecture/         # 架構文件
│   │   ├── tech-stack.md     # 技術棧文件
│   │   ├── coding-standards.md # 編碼標準
│   │   └── source-tree.md    # 專案結構 (本文件)
│   ├── stories/              # 開發故事 (BMad 框架)
│   ├── qa/                   # QA 問題追蹤
│   └── README.md             # 文件總覽
│
├── .bmad-core/               # BMad 框架配置
│   └── core-config.yaml      # 核心配置文件
│
├── .github/                  # GitHub 配置
│   ├── workflows/            # CI/CD 工作流程
│   └── ISSUE_TEMPLATE/       # Issue 模板
│
├── .gitignore                # Git 忽略規則
├── README.md                 # 專案說明
├── SETUP_GUIDE.md           # 安裝指南
├── PROJECT_STATUS.md        # 專案狀態
└── package.json             # 根目錄 package.json (Monorepo 用)
```

---

## 📂 目錄說明

### Backend (`backend/`)
後端 Node.js + Express 應用，採用 MVC 架構模式。

#### 核心目錄
- **`src/config/`**: 配置文件，包含資料庫連線、JWT 設定等
- **`src/controllers/`**: 控制器層，處理 HTTP 請求與回應
- **`src/middleware/`**: 中介層，包含認證、驗證、錯誤處理等
- **`src/models/`**: 資料模型層，封裝資料庫操作
- **`src/routes/`**: 路由定義，將 URL 映射到控制器
- **`src/services/`**: 業務邏輯層，處理複雜業務邏輯
- **`src/utils/`**: 工具函數與常數定義
- **`uploads/`**: 上傳檔案儲存目錄 (頭像、日記附件等)

#### 重要文件
- **`src/index.js`**: 應用程式入口，初始化 Express 應用
- **`src/server.js`**: 伺服器配置，設定中介層、路由等
- **`.env`**: 環境變數配置 (需從 `.env.example` 複製並填寫)
- **`package.json`**: 依賴管理與腳本定義

### Frontend (`frontend/`)
前端 React + Vite 應用，採用元件化開發模式。

#### 核心目錄
- **`src/components/`**: React 元件
  - `common/`: 通用基礎元件 (Button, Input, Card 等)
  - `layout/`: 佈局元件 (Navbar, Footer, Sidebar)
  - `features/`: 功能相關元件 (DiaryCard, CommentList 等)
- **`src/pages/`**: 頁面元件，對應路由
- **`src/routes/`**: 路由配置與守衛
- **`src/services/`**: API 服務層，封裝 HTTP 請求
- **`src/store/`**: Zustand 狀態管理
- **`src/hooks/`**: 自訂 React Hooks
- **`src/utils/`**: 工具函數與常數

#### 重要文件
- **`src/main.jsx`**: 應用程式入口
- **`src/App.jsx`**: 根元件，配置路由
- **`src/index.css`**: 全域樣式，包含 Figma 設計系統
- **`vite.config.js`**: Vite 建置配置

### Documentation (`docs/`)
專案文件集中管理目錄。

- **`api/`**: API 文件，使用 OpenAPI 3.0 規格
- **`database/`**: 資料庫設計文件 (ERD, Schema, Seeds)
- **`design/`**: 設計規格文件 (路由地圖、欄位字典、權限矩陣)
- **`architecture/`**: 架構文件 (技術棧、編碼標準、專案結構)
- **`stories/`**: 開發故事 (BMad 框架使用)
- **`qa/`**: QA 問題追蹤

### BMad Framework (`.bmad-core/`)
BMad 框架配置目錄，支援故事驅動開發。

- **`core-config.yaml`**: 核心配置，定義 PRD、架構文件、QA 位置等

---

## 🔄 資料流向

### 前端請求流程
```
User Action → Page Component → Service Layer → Axios (HTTP Request) 
→ Backend API → Response → Store Update → UI Re-render
```

### 後端請求處理流程
```
HTTP Request → Express Router → Middleware (Auth, Validation) 
→ Controller → Model (Database Query) → Response (JSON)
```

---

## 📦 關鍵檔案清單

### 配置文件
| 檔案路徑 | 用途 |
|---------|------|
| `backend/.env` | 後端環境變數 (資料庫、JWT、埠號等) |
| `backend/src/config/db.js` | MySQL 連線池配置 |
| `frontend/vite.config.js` | Vite 建置工具配置 |
| `.bmad-core/core-config.yaml` | BMad 框架配置 |

### 入口文件
| 檔案路徑 | 用途 |
|---------|------|
| `backend/src/index.js` | 後端應用入口 |
| `frontend/src/main.jsx` | 前端應用入口 |

### 路由配置
| 檔案路徑 | 用途 |
|---------|------|
| `backend/src/routes/` | 後端 API 路由定義 |
| `frontend/src/routes/index.jsx` | 前端頁面路由配置 |

### 樣式文件
| 檔案路徑 | 用途 |
|---------|------|
| `frontend/src/index.css` | 全域樣式與 Figma 設計系統 |
| `frontend/src/pages/*.css` | 頁面專屬樣式 |
| `frontend/src/components/**/*.css` | 元件專屬樣式 |

---

## 🚀 快速導航

### 開發新功能時
1. **查看需求**: `docs/design/route-map.md` 確認路由與頁面
2. **資料庫設計**: `docs/database/ERD.md` 確認資料表結構
3. **API 設計**: `docs/api/openapi.yaml` 確認 API 端點
4. **後端實作**: `backend/src/` 建立 Model → Controller → Route
5. **前端實作**: `frontend/src/` 建立 Service → Page → Component
6. **測試**: 使用 Thunder Client 或 Postman 測試 API

### 修復 Bug 時
1. **檢查錯誤**: 瀏覽器 Console 或伺服器 Log
2. **定位問題**: 根據錯誤訊息找到對應檔案
3. **修復**: 遵循 `docs/architecture/coding-standards.md` 規範
4. **測試**: 確認修復後功能正常

### 查看文件時
- **技術棧**: `docs/architecture/tech-stack.md`
- **編碼規範**: `docs/architecture/coding-standards.md`
- **專案結構**: `docs/architecture/source-tree.md` (本文件)
- **API 文件**: `docs/api/openapi.yaml`

---

## 📋 檔案數量統計

### Backend
- Controllers: 12 個
- Models: 10 個
- Routes: 12 個
- Middleware: 5 個
- Services: 4 個

### Frontend
- Pages: 20+ 個
- Components: 30+ 個
- Services: 9 個
- Stores: 5 個
- Hooks: 5 個

### Documentation
- API 文件: 1 個 (OpenAPI YAML)
- 資料庫文件: 3 個
- 設計文件: 3 個
- 架構文件: 3 個

---

## 🔗 相關文件

- [技術棧文件](./tech-stack.md)
- [編碼標準](./coding-standards.md)
- [資料庫 ERD](../database/ERD.md)
- [API 文件](../api/openapi.yaml)
- [路由地圖](../design/route-map.md)

---

**維護者**: Resonote Team  
**最後更新**: 2025-10-26
