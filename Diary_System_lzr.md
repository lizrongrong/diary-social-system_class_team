# 💬 日記交友系統 (Diary Social System)

這是一個由 **Copilot + BMAD 協同開發** 的全端專案，包含：
- 🧠 **Backend**：Node.js / Express.js API 伺服器  
- 💻 **Frontend**：React 前端應用程式  
- 🗄️ **MySQL**：本地端資料庫  
- 📚 **Docs**：API 規格與資料庫設計  
- 🎒 **Web-bundles**：擴充角色與團隊設定

backend/ ← 後端伺服器與 API
frontend/ ← 前端 React 網頁應用
docs/ ← 文件與資料庫設計
web-bundles/ ← 擴充內容、團隊設定

---

## 🚀 專案結構


---

## ⚙️ 環境需求
- Node.js 18+
- MySQL 8+
- npm / yarn
- VS Code（建議使用 Copilot 與 BMAD 插件）

---

## 📦 安裝步驟

### 1️⃣ 下載專案
<!-- ```bash
# git clone https://github.com/<你的帳號>/<repo-name>.git
# cd <repo-name>
### 2️⃣ 建立環境設定
# cp .env.example .env
# 並編輯 .env，設定你的 MySQL 帳號、密碼與資料庫名稱。 -->

🧩 後端啟動
<!-- cd backend
npm install
npm run dev -->
後端預設執行於：
<!-- http://localhost:3000 -->

🪄 前端啟動
<!-- cd frontend
npm install
npm run dev -->
前端預設執行於：
<!-- http://localhost:5173 -->

🗄️ 資料庫初始化
請先在 MySQL 中建立資料庫：
<!-- CREATE DATABASE my_diary_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; -->
可參考：
<!-- docs/database/schema.sql -->

🧠 開發工具與擴充
Copilot：自動完成與智能代碼提示
BMAD Agent：協作任務分工與情境模擬
web-bundles/：自定義角色、團隊或應用情境設定

👥 協作指南
Fork 專案
新建分支（例如：feature/add-login）
提交 PR
專案維護者審核後合併