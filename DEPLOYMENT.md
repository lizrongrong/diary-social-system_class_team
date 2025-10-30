# Resonote 專案部署指南

## 🏠 本地開發環境

### 資料庫設定
- **類型**: MySQL 本地端
- **連線**: localhost:3306
- **資料庫名**: resonote

### 環境變數
複製 `backend/.env.example` 為 `backend/.env` 並設定您的密碼

---

## ☁️ 生產環境部署選項

### 選項 1: Vercel (前端) + Railway (後端 + 資料庫)

**前端部署 (Vercel)**
```bash
cd frontend
npm run build
# 在 Vercel 中連接 GitHub repo
```

**後端 + 資料庫 (Railway)**
1. 訪問 https://railway.app/
2. 連接 GitHub repository
3. 部署 MySQL 服務
4. 部署 Node.js 後端
5. 設定環境變數

---

### 選項 2: 全部部署到 Render

1. 訪問 https://render.com/
2. 建立 PostgreSQL 資料庫（或 MySQL）
3. 建立 Web Service（後端）
4. 建立 Static Site（前端）

---

### 選項 3: AWS / GCP / Azure

適合企業級應用，需要更多配置

---

## 🔐 環境變數管理

### 開發環境
- 使用 `.env` 檔案（不上傳到 Git）

### 生產環境
- 在部署平台設定環境變數
- 不要在程式碼中硬編碼密碼

---

## 📦 其他開發者如何使用您的專案

1. Clone 專案
2. 安裝本地 MySQL
3. 複製 `.env.example` 為 `.env`
4. 填入自己的資料庫密碼
5. 執行 `schema.sql` 建立資料表
6. 啟動開發伺服器

**每個開發者的 `.env` 都不同，但程式碼相同！**
