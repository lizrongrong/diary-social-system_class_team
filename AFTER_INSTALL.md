# 🎊 MySQL 安裝完成！接下來做什麼？

## ✅ 安裝完成檢查

MySQL 應該已經：
- ✅ 服務已安裝並運行
- ✅ Root 密碼已設定
- ✅ 系統資料庫已初始化

---

## 🚀 立即執行的步驟

請依序在 VS Code 終端執行以下命令：

### 步驟 1: 驗證 MySQL 安裝

```powershell
# 檢查 MySQL 服務
Get-Service MySQL*
```

應該看到服務狀態為 **Running** ✅

---

### 步驟 2: 測試 MySQL 連線

```powershell
# 測試 MySQL 命令列工具
mysql --version
```

如果顯示版本號（如 9.5.0），代表安裝成功！✅

---

### 步驟 3: 更新環境變數

**重要！** 請編輯這個檔案：

**檔案位置**: `backend\.env`

**找到這一行**:
```properties
DB_PASSWORD=your_password
```

**改成您剛才設定的密碼**:
```properties
DB_PASSWORD=Resonote2025!
```

**儲存檔案** (Ctrl + S)

---

### 步驟 4: 建立 Resonote 資料庫

```powershell
cd c:\Users\u\vs_code\diary_sys\backend
node create-database.js
```

這個腳本會：
- ✅ 建立 `resonote` 資料庫
- ✅ 匯入所有 15 張資料表
- ✅ 驗證資料表結構

預期輸出：
```
🔧 MySQL 資料庫設定工具

步驟 1: 連接到 MySQL 伺服器...
✅ 成功連接到 MySQL

步驟 2: 建立資料庫 "resonote"...
✅ 資料庫 "resonote" 建立成功

步驟 3: 匯入資料庫結構...
✅ 資料庫結構匯入成功

步驟 4: 驗證資料表...
✅ 成功建立 15 個資料表:

    1. users
    2. follows
    3. diaries
    ... (共 15 張表)

🎉 資料庫設定完成！
```

---

### 步驟 5: 測試資料庫連線

```powershell
node test-db.js
```

預期輸出：
```
正在測試資料庫連線...

✅ 資料庫連線成功
📊 MySQL 版本: 9.5.0
📂 當前資料庫: resonote
📋 資料表數量: 15
```

---

### 步驟 6: 啟動開發伺服器

**終端 1 - 後端**:
```powershell
cd backend
npm run dev
```

預期輸出：
```
Server running on http://localhost:3000
✅ Database connected successfully
```

**終端 2 - 前端** (開新終端):
```powershell
cd frontend
npm run dev
```

預期輸出：
```
VITE ready in xxx ms

➜  Local:   http://localhost:5173/
```

---

## 🎯 驗證一切正常

### 測試後端
打開瀏覽器訪問: http://localhost:3000/health

應該看到:
```json
{"status":"OK","message":"Resonote API is running"}
```

### 測試前端
打開瀏覽器訪問: http://localhost:5173

應該看到 Resonote 首頁 🌟

---

## ❌ 遇到問題？

### 問題 1: MySQL 命令找不到
```powershell
# 加入 PATH (需要重新開啟 VS Code)
# 或使用完整路徑
& "C:\Program Files\MySQL\MySQL Server 9.5\bin\mysql.exe" --version
```

### 問題 2: 密碼錯誤
- 再次確認 `backend\.env` 中的密碼
- 確認與安裝時設定的密碼一致

### 問題 3: 連線被拒絕
```powershell
# 啟動 MySQL 服務
Start-Service MySQL95
```

---

## 📋 完成檢查清單

安裝完成後請確認：

- [ ] MySQL 服務正在運行 (`Get-Service MySQL*`)
- [ ] `backend\.env` 密碼已更新
- [ ] 執行 `create-database.js` 成功
- [ ] 執行 `test-db.js` 看到 15 張表
- [ ] 後端啟動成功 (port 3000)
- [ ] 前端啟動成功 (port 5173)
- [ ] 可以訪問 http://localhost:5173

---

## 🎉 恭喜！

一切完成後，您就可以開始開發 Resonote 日記系統了！

**現在請先點擊「執行」完成 MySQL 配置！** ⏳
