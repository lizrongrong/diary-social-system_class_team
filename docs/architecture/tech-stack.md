# Resonote 技術棧文件

> **版本**: v1.0  
> **更新日期**: 2025-10-26  
> **專案**: Resonote 日記互動系統

---

## 🎯 技術棧概覽

### 前端技術
- **框架**: React 18.3.1
- **建置工具**: Vite 5.4.21
- **路由**: React Router DOM 6.28.0
- **狀態管理**: Zustand 5.0.2
- **HTTP 客戶端**: Axios 1.7.7
- **圖標**: Lucide React
- **樣式**: CSS Modules + Global CSS

### 後端技術
- **執行環境**: Node.js (LTS)
- **框架**: Express 5.1.0
- **資料庫**: MySQL 9.5 Innovation
- **資料庫客戶端**: mysql2 3.15.3 (Promise-based)
- **認證**: JSON Web Token (jsonwebtoken 9.0.2)
- **密碼加密**: bcryptjs 3.0.2
- **檔案上傳**: Multer
- **環境變數**: dotenv
- **唯一 ID**: uuid

### 開發工具
- **開發伺服器**: Nodemon 3.1.10
- **版本控制**: Git + GitHub
- **編輯器**: VS Code
- **Shell**: PowerShell (Windows)

---

## 🏗️ 系統架構

### 前端架構
```
frontend/
├── src/
│   ├── components/        # 共用元件
│   │   ├── common/       # 基礎元件 (Button, Input, Card)
│   │   ├── layout/       # 佈局元件 (Navbar, Footer, Sidebar)
│   │   └── features/     # 功能元件 (DiaryCard, CommentList)
│   ├── pages/            # 頁面元件
│   │   ├── auth/         # 認證頁面 (Login, Register)
│   │   ├── diaries/      # 日記頁面 (List, Detail, Form)
│   │   ├── profile/      # 個人資料頁面
│   │   └── admin/        # 後台頁面
│   ├── services/         # API 服務層
│   │   ├── api.js        # Axios 實例配置
│   │   ├── authService.js
│   │   ├── diaryService.js
│   │   └── userService.js
│   ├── store/            # Zustand 狀態管理
│   │   ├── authStore.js
│   │   ├── diaryStore.js
│   │   └── uiStore.js
│   ├── hooks/            # 自訂 Hooks
│   │   ├── useAuth.js
│   │   ├── useDiary.js
│   │   └── useDebounce.js
│   ├── utils/            # 工具函數
│   │   ├── validation.js
│   │   ├── formatters.js
│   │   └── constants.js
│   ├── routes/           # 路由配置
│   │   ├── index.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── AdminRoute.jsx
│   ├── assets/           # 靜態資源
│   │   ├── images/
│   │   └── fonts/
│   ├── App.jsx           # 根元件
│   ├── main.jsx          # 入口文件
│   └── index.css         # 全域樣式
└── public/               # 公開資源
```

### 後端架構
```
backend/
├── src/
│   ├── config/           # 配置文件
│   │   ├── db.js         # 資料庫連線池
│   │   └── jwt.js        # JWT 配置
│   ├── controllers/      # 控制器層
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── diaryController.js
│   │   ├── commentController.js
│   │   ├── likeController.js
│   │   └── friendController.js
│   ├── models/           # 資料模型層
│   │   ├── User.js
│   │   ├── Diary.js
│   │   ├── Comment.js
│   │   ├── Like.js
│   │   └── Friend.js
│   ├── middleware/       # 中介層
│   │   ├── auth.js       # JWT 驗證
│   │   ├── validation.js # 資料驗證
│   │   ├── errorHandler.js
│   │   └── upload.js     # 檔案上傳
│   ├── routes/           # 路由定義
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── diaries.js
│   │   ├── comments.js
│   │   ├── likes.js
│   │   └── friends.js     # 追蹤/好友路由 (替代舊版 follows.js)
│   ├── utils/            # 工具函數
│   │   ├── validators.js
│   │   ├── helpers.js
│   │   └── constants.js
│   ├── services/         # 業務邏輯層
│   │   ├── authService.js
│   │   ├── emailService.js
│   │   └── uploadService.js
│   ├── index.js          # 應用入口
│   └── server.js         # 伺服器配置
├── uploads/              # 上傳檔案儲存
├── .env                  # 環境變數
└── package.json
```

---

## 🗄️ 資料庫設計

### MySQL 配置
- **版本**: MySQL 9.5 Innovation
- **字元集**: utf8mb4
- **排序規則**: utf8mb4_unicode_ci
- **引擎**: InnoDB
- **資料庫名稱**: resonote
- **連線池大小**: 10

### 核心資料表
1. **users** - 使用者資料
2. **diaries** - 日記主表
3. **diary_tags** - 日記標籤 (情緒、天氣、關鍵字)
4. **emotion_tags** - 情緒標籤定義
5. **weather_tags** - 天氣標籤定義
6. **diary_media** - 日記附件
7. **comments** - 留言
8. **likes** - 按讚記錄
9. **friends** - 追蹤關係 (單向，支援互相追蹤判定)
10. **messages** - 私訊
11. **notifications** - 通知
12. **announcements** - 系統公告
13. **feedbacks** - 問題回饋
14. **cards** - 幸運小卡定義
15. **card_draws** - 抽卡記錄

詳細 ERD 請參考 `docs/database/ERD.md`

---

## 🎨 設計系統

### Figma 設計規範
- **設計寬度**: 1440px
- **設計高度**: 1024px
- **字體家族**:
  - Logo: Italianno (96px)
  - 內容: Inter (400, 500, 700)
- **色彩系統**:
  - Primary Pink: #E1B1E8
  - Primary Purple: #CD79D5
  - Dark Purple: #890589
  - Light Pink: #FFDADA
  - Soft Pink: #FFC7C7
  - Yellow Accent: #FFF3B8
  - Border Gray: #A3A3A3

### 元件規範
- **Input 高度**: 62px (LoginPage) / 48px (其他)
- **Button 圓角**: 22px
- **Input 圓角**: 8px
- **Navbar 高度**: 124px
- **Footer 高度**: 124px
- **Sidebar 寬度**: 295px

---

## 🔐 認證與授權

### JWT Token 架構
```javascript
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "member",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 認證流程
1. 使用者提交 email + password
2. 後端驗證密碼 (bcrypt.compare)
3. 生成 JWT token (7 天有效期)
4. 前端儲存 token 到 localStorage
5. 每次請求攜帶 `Authorization: Bearer <token>`
6. 後端中介層驗證 token 有效性

### 權限等級
- **guest**: 訪客 (僅註冊時使用)
- **member**: 一般會員
- **admin**: 管理員

---

## 📡 API 設計

### RESTful 規範
- **基礎 URL**: `/api/v1`
- **認證方式**: Bearer Token
- **回應格式**: JSON
- **HTTP 狀態碼**:
  - 200 OK - 成功
  - 201 Created - 建立成功
  - 400 Bad Request - 參數錯誤
  - 401 Unauthorized - 未認證
  - 403 Forbidden - 無權限
  - 404 Not Found - 資源不存在
  - 500 Internal Server Error - 伺服器錯誤

### API 端點分組
- **/auth** - 認證 (register, login, logout)
- **/users** - 使用者管理
- **/diaries** - 日記管理
- **/comments** - 留言管理
- **/likes** - 按讚管理
- **/friends** - 追蹤/好友管理 (替代舊版 /follows)
- **/messages** - 私訊
- **/cards** - 抽卡系統
- **/notifications** - 通知
- **/announcements** - 系統公告
- **/feedbacks** - 問題回饋
- **/admin** - 後台管理

詳細 API 文件請參考 `docs/api/openapi.yaml`

---

## 🚀 部署環境

### 開發環境
- **前端**: http://localhost:5174 (Vite Dev Server)
- **後端**: http://localhost:3000 (Nodemon)
- **資料庫**: localhost:3306 (MySQL 9.5)

### 生產環境 (規劃)
- **前端**: 靜態檔案部署 (Vercel/Netlify)
- **後端**: Node.js 伺服器 (AWS EC2/Heroku)
- **資料庫**: MySQL (AWS RDS/PlanetScale)
- **檔案儲存**: AWS S3 或 Cloudinary
- **CDN**: CloudFlare

---

## 📦 依賴版本鎖定

### 前端 package.json
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "axios": "^1.7.7",
    "zustand": "^5.0.2",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^5.4.21"
  }
}
```

### 後端 package.json
```json
{
  "dependencies": {
    "express": "^5.1.0",
    "mysql2": "^3.15.3",
    "bcryptjs": "^3.0.2",
    "jsonwebtoken": "^9.0.2",
    "cors": "latest",
    "dotenv": "latest",
    "multer": "latest",
    "uuid": "latest"
  },
  "devDependencies": {
    "nodemon": "^3.1.10"
  }
}
```

---

## 🔧 開發工具配置

### VS Code 擴充套件建議
- ESLint
- Prettier
- MySQL (cweijan.vscode-mysql-client2)
- Thunder Client (API 測試)
- GitLens

### Git 工作流程
- **main** - 正式環境分支
- **develop** - 開發分支
- **feature/** - 功能分支
- **hotfix/** - 緊急修復分支

---

## 📚 相關文件

- [編碼標準](./coding-standards.md)
- [專案結構](./source-tree.md)
- [資料庫 ERD](../database/ERD.md)
- [API 文件](../api/openapi.yaml)
- [路由地圖](../design/route-map.md)
- [欄位字典](../design/field-dictionary.md)

---

**維護者**: Resonote Team  
**最後更新**: 2025-10-26
