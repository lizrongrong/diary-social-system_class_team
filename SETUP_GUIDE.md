# 🚀 MySQL 安裝完成後設定指南

## ✅ 安裝類型建議

**請選擇：典型的 (Typical)**

---

## 📋 重要步驟清單

### 安裝過程中需要記住的資訊

#### Root 密碼設定 ⚠️ 重要！
```
建議密碼: Resonote2025!
```
**📝 請記在這裡：________________**

#### 服務設定
- ✅ Configure MySQL Server as a Windows Service
- ✅ Start the MySQL Server at System Startup
- Service Name: MySQL95 (預設)

---

## 🔧 安裝完成後的設定步驟

### 步驟 1: 驗證 MySQL 安裝

```powershell
cd c:\Users\u\vs_code\diary_sys
.\setup-mysql.ps1
```

### 步驟 2: 更新環境變數

編輯檔案: `backend\.env`

找到這一行：
```properties
DB_PASSWORD=your_password
```

改成您剛才設定的密碼：
```properties
DB_PASSWORD=Resonote2025!
```

### 步驟 3: 建立資料庫

```powershell
cd backend
node create-database.js
```

這個腳本會自動：
- ✅ 建立 `resonote` 資料庫
- ✅ 匯入所有資料表結構 (15 張表)
- ✅ 驗證安裝

### 步驟 4: 測試連線

```powershell
node test-db.js
```

預期輸出：
```
✅ Database connected successfully
📊 MySQL 版本: 9.5.0
📂 當前資料庫: resonote
📋 資料表數量: 15
```

### 步驟 5: 啟動開發伺服器

```powershell
# 終端 1 - 後端
cd backend
npm run dev

# 終端 2 - 前端
cd frontend
npm run dev
```

---

## 🎯 完整的操作流程

```powershell
# 1. 驗證 MySQL
cd c:\Users\u\vs_code\diary_sys
.\setup-mysql.ps1

# 2. 更新 .env (手動編輯)
# 編輯 backend\.env，填入您的密碼

# 3. 建立資料庫
cd backend
node create-database.js

# 4. 測試連線
node test-db.js

# 5. 啟動後端
npm run dev

# 6. 啟動前端 (開新終端)
cd ..\frontend
npm run dev
```

---

## ❌ 常見問題排解

### 問題 1: "ECONNREFUSED"
**原因**: MySQL 服務未運行

**解決方案**:
```powershell
# 檢查服務狀態
Get-Service MySQL*

# 啟動服務 (需要管理員權限)
Start-Service MySQL95
```

### 問題 2: "ER_ACCESS_DENIED_ERROR"
**原因**: 密碼錯誤

**解決方案**:
1. 確認 `.env` 中的 `DB_PASSWORD` 是否正確
2. 確認使用的是安裝時設定的密碼

### 問題 3: MySQL 命令找不到
**原因**: MySQL bin 目錄不在 PATH 中

**解決方案**:
將此路徑加入系統 PATH:
```
C:\Program Files\MySQL\MySQL Server 9.5\bin
```

---

## 📊 驗證檢查清單

完成後請確認：

- [ ] MySQL 服務正在運行
- [ ] `.env` 密碼已更新
- [ ] 資料庫 `resonote` 已建立
- [ ] 15 張資料表都已建立
- [ ] `test-db.js` 執行成功
- [ ] 後端伺服器啟動成功 (port 3000)
- [ ] 前端開發伺服器啟動成功 (port 5173)

---

## 🎉 完成！

一切設定完成後，您就可以：
- 訪問前端: http://localhost:5173
- 訪問後端 API: http://localhost:3000/health
- 開始開發您的日記系統！

---

**下一步**: 繼續完成 MySQL 安裝，記住您的密碼，然後回來執行上述步驟！
