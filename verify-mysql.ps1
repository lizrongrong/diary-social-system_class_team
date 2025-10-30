# MySQL 安裝驗證腳本

Write-Host "=== MySQL 安裝驗證 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 檢查 MySQL 服務
Write-Host "1. 檢查 MySQL 服務狀態..." -ForegroundColor Yellow
$mysqlService = Get-Service -Name MySQL* -ErrorAction SilentlyContinue

if ($mysqlService) {
    Write-Host "   ✅ 找到 MySQL 服務: $($mysqlService.Name)" -ForegroundColor Green
    Write-Host "   狀態: $($mysqlService.Status)" -ForegroundColor $(if($mysqlService.Status -eq 'Running'){'Green'}else{'Red'})
    
    if ($mysqlService.Status -ne 'Running') {
        Write-Host ""
        Write-Host "   正在啟動 MySQL 服務..." -ForegroundColor Yellow
        try {
            Start-Service $mysqlService.Name
            Write-Host "   ✅ MySQL 服務已啟動" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ 無法啟動服務 (需要管理員權限)" -ForegroundColor Red
            Write-Host "   請以管理員身份執行 PowerShell 並執行:" -ForegroundColor Yellow
            Write-Host "   Start-Service $($mysqlService.Name)" -ForegroundColor White
        }
    }
} else {
    Write-Host "   ❌ 未找到 MySQL 服務" -ForegroundColor Red
    Write-Host "   請確認 MySQL 是否已正確安裝" -ForegroundColor Yellow
}

Write-Host ""

# 2. 檢查 MySQL 命令列工具
Write-Host "2. 檢查 MySQL 命令列工具..." -ForegroundColor Yellow
try {
    $mysqlVersion = & mysql --version 2>&1
    Write-Host "   ✅ MySQL 命令列工具可用" -ForegroundColor Green
    Write-Host "   版本: $mysqlVersion" -ForegroundColor White
} catch {
    Write-Host "   ⚠️  MySQL 命令列工具不在 PATH 中" -ForegroundColor Yellow
    Write-Host "   通常位於: C:\Program Files\MySQL\MySQL Server 9.5\bin" -ForegroundColor White
    Write-Host ""
    Write-Host "   建議將 MySQL bin 目錄加入系統 PATH" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 驗證完成 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步:" -ForegroundColor Green
Write-Host "1. 確保 MySQL 服務正在運行" -ForegroundColor White
Write-Host "2. 更新 backend/.env 中的 DB_PASSWORD" -ForegroundColor White
Write-Host "3. 執行: cd backend; node test-db.js" -ForegroundColor White
