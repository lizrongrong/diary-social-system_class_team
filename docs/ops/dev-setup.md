# Resonote 本機開發設置指南

> **版本**: v1.0  
> **更新日期**: 2025-10-29  
> **目標**: 30 分鐘內完成前後端開發環境設置

---

##  前置需求

### 必要軟體
- **Node.js**: v18.x 或更高版本 (LTS 推薦)
- **MySQL**: 8.0 或更高版本
- **Git**: 最新版本
- **編輯器**: VS Code (推薦)

### 確認安裝
\\\powershell
node --version    # 應顯示 v18.x 或更高
npm --version     # 應顯示 9.x 或更高
mysql --version   # 應顯示 8.x 或更高
git --version     # 應顯示 2.x 或更高
\\\

---

##  快速開始 (5 分鐘)

### 1. Clone 專案
\\\powershell
git clone <repository-url>
cd diary_sys
\\\

### 2. 安裝依賴
\\\powershell
# 後端依賴
cd backend
npm install

# 前端依賴
cd ../frontend
npm install
\\\

### 3. 設置環境變數
\\\powershell
# 後端
cd ../backend
Copy-Item .env.example .env
# 編輯 .env 填入你的資料庫密碼
\\\

### 4. 初始化資料庫
\\\powershell
# 連線到 MySQL
mysql -u root -p

# 建立資料庫
CREATE DATABASE resonote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE resonote;

# 執行 schema
source docs/database/schema.sql;

# 退出 MySQL
exit;
\\\

### 5. 啟動服務
\\\powershell
# 後端 (在 backend 目錄)
npm start
# 或使用開發模式 (自動重啟)
npm run dev

# 前端 (在 frontend 目錄，另開終端)
npm run dev
\\\

### 6. 驗證安裝
- **後端**: http://localhost:3000/health 應返回 \{"status":"OK"}\
- **前端**: http://localhost:5173 應顯示登入頁面

---

##  資料庫設置詳細說明

### 方法一：使用 SQL 腳本 (推薦)
\\\powershell
# 從專案根目錄
mysql -u root -p resonote < docs/database/schema.sql
\\\

### 方法二：使用 PowerShell 腳本
\\\powershell
.\setup-mysql.ps1
\\\

### 驗證資料表
\\\sql
USE resonote;
SHOW TABLES;
-- 應該看到 users, diaries, friends, notifications 等表
\\\

### 建立測試資料 (可選)
\\\powershell
mysql -u root -p resonote < docs/database/seeds.sql
\\\

---

##  環境變數設定

### 後端 (.env)
\\\properties
# 資料庫配置
DB_HOST=localhost          # 資料庫主機
DB_USER=root              # 資料庫使用者
DB_PASSWORD=你的密碼       # 資料庫密碼
DB_NAME=resonote          # 資料庫名稱

# JWT 配置
JWT_SECRET=請改成隨機字串   # 生產環境必須更改！
JWT_EXPIRES_IN=7d         # Token 有效期

# 伺服器配置
PORT=3000                 # 後端埠號
NODE_ENV=development      # 環境 (development/production)
\\\

### 前端 (.env.local)
\\\properties
VITE_API_BASE_URL=http://localhost:3000/api/v1
\\\

---

##  常用開發指令

### 後端 (backend/)
\\\powershell
npm start              # 啟動伺服器
npm run dev            # 開發模式 (nodemon 自動重啟)
npm test               # 執行測試 (待實作)
\\\

### 前端 (frontend/)
\\\powershell
npm run dev            # 啟動開發伺服器
npm run build          # 建置生產版本
npm run preview        # 預覽建置結果
npm run lint           # 執行 ESLint
\\\

---

##  疑難排解

### 後端無法啟動
**症狀**: \
ode src/index.js\ 退出碼 1

**可能原因與解決方案**:
1. **資料庫連線失敗**
   \\\powershell
   # 檢查 MySQL 是否執行中
   Get-Service MySQL*
   
   # 測試連線
   mysql -u root -p -e "SELECT 1;"
   \\\

2. **環境變數未設定**
   \\\powershell
   # 確認 .env 存在
   Test-Path backend\.env
   
   # 檢查內容
   Get-Content backend\.env
   \\\

3. **埠號被佔用**
   \\\powershell
   # 檢查 3000 port
   netstat -ano | findstr :3000
   
   # 變更 .env 中的 PORT
   \\\

### 資料庫外鍵錯誤
**症狀**: \Cannot add foreign key constraint\

**解決方案**:
\\\sql
-- 確認資料表建立順序
-- 1. users (無依賴)
-- 2. diaries (依賴 users)
-- 3. friends (依賴 users)
-- 4. comments (依賴 users, diaries)

-- 重建資料庫
DROP DATABASE IF EXISTS resonote;
CREATE DATABASE resonote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE resonote;
SOURCE docs/database/schema.sql;
\\\

### 前端 API 請求失敗
**症狀**: Network Error 或 CORS 錯誤

**解決方案**:
1. 確認後端已啟動
   \\\powershell
   curl http://localhost:3000/health
   \\\

2. 檢查 CORS 設定 (backend/src/index.js)
   \\\javascript
   app.use(cors({
     origin: 'http://localhost:5173',
     credentials: true
   }));
   \\\

### Node Modules 問題
**症狀**: Module not found 或版本衝突

**解決方案**:
\\\powershell
# 清除並重新安裝
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
\\\

---

##  開發工作流程

### 1. 建立新功能
\\\powershell
# 切換到開發分支
git checkout -b feature/功能名稱

# 開發完成後
git add .
git commit -m "feat: 新增功能描述"
git push origin feature/功能名稱
\\\

### 2. 資料庫變更
\\\powershell
# 建立 migration 檔案
# docs/database/migrations/YYYYMMDD_description.sql

# 執行 migration
mysql -u root -p resonote < docs/database/migrations/20251029_add_new_table.sql
\\\

### 3. API 測試
推薦使用 Thunder Client (VS Code 擴充套件) 或 Postman

**範例請求**:
\\\http
### 註冊
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@1234",
  "username": "testuser",
  "display_name": "測試使用者",
  "gender": "other",
  "birth_date": "2000-01-01"
}

### 登入
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@1234"
}

### 取得日記列表 (需 Token)
GET http://localhost:3000/api/v1/diaries
Authorization: Bearer YOUR_TOKEN_HERE
\\\

---

##  安全注意事項

1. **絕不提交 .env 到 Git**
   - 已加入 .gitignore
   - 使用 .env.example 作為範本

2. **生產環境 JWT_SECRET**
   - 使用強隨機字串 (至少 32 字元)
   - 定期輪換

3. **資料庫密碼**
   - 開發環境使用強密碼
   - 生產環境使用專用帳號，限制權限

---

##  相關文件

- [技術棧文件](../architecture/tech-stack.md)
- [專案結構](../architecture/source-tree.md)
- [API 文件](../api/openapi.yaml)
- [資料庫 ERD](../database/ERD.md)
- [編碼標準](../architecture/coding-standards.md)

---

##  檢查清單

啟動前確認:
- [ ] Node.js 已安裝 (v18+)
- [ ] MySQL 已安裝並執行中
- [ ] 資料庫 resonote 已建立
- [ ] schema.sql 已執行
- [ ] backend/.env 已設定
- [ ] backend/node_modules 已安裝
- [ ] frontend/node_modules 已安裝

首次啟動驗證:
- [ ] 後端 health check 正常 (http://localhost:3000/health)
- [ ] 前端可訪問 (http://localhost:5173)
- [ ] 可成功註冊測試帳號
- [ ] 可成功登入
- [ ] 可建立日記

---

**維護者**: Resonote Team  
**最後更新**: 2025-10-29
