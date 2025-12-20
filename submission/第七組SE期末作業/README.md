# Resonote 日記互動系統

一個現代化的日記互動平台，支援情緒追蹤、社交分享等功能。

## 系統 Demo 影片連結
[請在此處貼上您的 Demo 影片連結]

## 🚀 快速開始

### 前置需求

- Node.js >= 18.x
- MySQL >= 8.0
- npm 或 yarn

### 安裝步驟

#### 1. 進入程式碼目錄

請在 VS Code 中開啟本專案根目錄 (`第七組SE期末作業`)，並在終端機執行以下指令進入程式碼目錄：

```bash
cd code
```

#### 2. 安裝後端

```bash
cd backend
npm install
```

#### 3. 安裝前端

```bash
cd ../frontend
npm install
```

#### 4. 設定資料庫

**4.1 建立 MySQL 資料庫**

請登入您的 MySQL：

```sql
CREATE DATABASE resonote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**4.2 匯入資料庫結構**

請確認您位於 `code` 目錄下，執行以下指令匯入資料表結構：

```bash
mysql -u root -p resonote < backend/sql/schema.sql
```

#### 5. 配置環境變數

**後端配置**

```bash
cd backend
cp .env.example .env
```

編輯 `backend/.env` 並填入您的資料庫密碼：

```properties
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的MySQL密碼
DB_NAME=resonote
JWT_SECRET=請更改為隨機字串
```

#### 6. 啟動專案

**啟動後端**

```bash
cd backend
npm run dev
```

後端將運行在 http://localhost:3000

**啟動前端**

開啟一個新的終端機視窗，進入 `code/frontend` 目錄：

```bash
cd frontend
npm run dev
```

前端將運行在 http://localhost:5173

## 📁 專案結構

```
diary_sys/
├── backend/                # 後端 API
│   ├── src/
│   │   ├── config/        # 配置檔案
│   │   ├── controllers/   # 控制器
│   │   ├── middleware/    # 中介軟體
│   │   ├── models/        # 資料模型
│   │   ├── routes/        # 路由
│   │   └── utils/         # 工具函數
│   ├── .env.example       # 環境變數範本
│   └── package.json
├── frontend/              # 前端應用
│   ├── src/
│   │   ├── components/   # React 組件
│   │   ├── pages/        # 頁面
│   │   ├── services/     # API 服務
│   │   └── store/        # 狀態管理
│   └── package.json
├── docs/                  # 文檔
│   ├── api/              # API 文檔
│   └── database/         # 資料庫文檔
│       └── schema.sql    # 資料庫結構
└── README.md
```

## 🛠️ 技術棧

### 後端
- Node.js + Express
- MySQL + mysql2
- JWT 認證
- bcryptjs 密碼加密

### 前端
- React 18
- Vite
- React Router
- Axios
- Zustand

## 📝 API 文檔

啟動後端後，訪問 http://localhost:3000/health 檢查服務狀態

詳細 API 文檔請參考 `docs/api/openapi.yaml`

## 🗄️ 資料庫

資料庫結構包含 15 張表：
- 使用者管理（users, follows）
- 日記管理（diaries, emotions, weather）
- 互動功能（comments, likes）
- 系統功能（notifications, reports）

詳細設計請參考 `docs/database/ERD.md`

## 🔒 安全性

- ✅ 密碼使用 bcrypt 加密
- ✅ JWT Token 認證
- ✅ SQL 注入防護
- ✅ XSS 防護
- ✅ CORS 配置
- ✅ 速率限制

## 🤝 貢獻

歡迎提交 Pull Request！

## 📄 授權

MIT License

## 📧 聯絡方式

如有問題請開 Issue
