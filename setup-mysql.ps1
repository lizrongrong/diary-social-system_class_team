# ========================================
# MySQL 安裝後驗證與設定腳本
# ========================================

Write-Host "`n=== MySQL 安裝驗證 ===" -ForegroundColor Cyan
Write-Host ""

# 步驟 1: 檢查 MySQL 服務
Write-Host "步驟 1: 檢查 MySQL 服務..." -ForegroundColor Yellow
$service = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($service) {
    Write-Host "  ✅ MySQL 服務已安裝: $($service.DisplayName)" -ForegroundColor Green
    Write-Host "  服務名稱: $($service.Name)" -ForegroundColor White
    Write-Host "  狀態: $($service.Status)" -ForegroundColor $(if($service.Status -eq 'Running'){'Green'}else{'Yellow'})
    
    if ($service.Status -ne 'Running') {
        Write-Host "`n  ⚠️  服務未運行，正在啟動..." -ForegroundColor Yellow
        Start-Service $service.Name -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        $service.Refresh()
        if ($service.Status -eq 'Running') {
            Write-Host "  ✅ 服務已成功啟動" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  ❌ 未找到 MySQL 服務" -ForegroundColor Red
    Write-Host "  請確認安裝是否完成" -ForegroundColor Yellow
    exit
}

Write-Host ""

# 步驟 2: 測試 MySQL 連線
Write-Host "步驟 2: 測試資料庫連線..." -ForegroundColor Yellow
Write-Host "  提示: 請輸入您剛才設定的 MySQL root 密碼" -ForegroundColor Cyan
Write-Host ""

# 步驟 3: 下一步指示
Write-Host "=== 下一步操作 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 更新後端環境變數:" -ForegroundColor Green
Write-Host "   編輯檔案: backend\.env" -ForegroundColor White
Write-Host "   將 DB_PASSWORD 改為您設定的密碼" -ForegroundColor White
Write-Host ""
Write-Host "2. 建立資料庫:" -ForegroundColor Green
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   node create-database.js" -ForegroundColor White
Write-Host ""
Write-Host "3. 測試連線:" -ForegroundColor Green
Write-Host "   node test-db.js" -ForegroundColor White
Write-Host ""
Write-Host "4. 啟動開發伺服器:" -ForegroundColor Green
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
