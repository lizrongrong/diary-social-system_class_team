param(
    [string]$GroupNumber
)

# 1. Ask for Group Number if not provided
if ([string]::IsNullOrWhiteSpace($GroupNumber)) {
    $GroupNumber = Read-Host "請輸入組別號碼 (例如 1, 2, 3...)"
}

$targetRootName = "第${GroupNumber}組SE期末作業"
$submissionDir = Join-Path $PWD "submission"
$targetDir = Join-Path $submissionDir $targetRootName

Write-Host "正在準備資料夾結構: $targetDir" -ForegroundColor Cyan

# 2. Clean previous run
if (Test-Path $targetDir) {
    Remove-Item -Path $targetDir -Recurse -Force
}
New-Item -Path $targetDir -ItemType Directory -Force | Out-Null

# 3. Create Subdirectories
$docsDir = Join-Path $targetDir "docs"
$codeDir = Join-Path $targetDir "code"
$codeDocsDir = Join-Path $codeDir "docs"

# Create empty docs folder (User request: "裡面目前要是空的")
New-Item -Path $docsDir -ItemType Directory -Force | Out-Null
New-Item -Path $codeDir -ItemType Directory -Force | Out-Null
New-Item -Path $codeDocsDir -ItemType Directory -Force | Out-Null

# 4. Copy Root README.md
Copy-Item -Path "README.md" -Destination $targetDir

# 5. Copy Dependency Lists to Root (User request: "相依套件清單是跟 README.md 一樣的位置")
# Since we have both backend and frontend, we copy both with prefixes to avoid overwriting
if (Test-Path "backend/package.json") {
    Copy-Item -Path "backend/package.json" -Destination (Join-Path $targetDir "backend-package.json")
}
if (Test-Path "frontend/package.json") {
    Copy-Item -Path "frontend/package.json" -Destination (Join-Path $targetDir "frontend-package.json")
}

# 6. Copy Code
Write-Host "複製程式碼 (code)..." -ForegroundColor Green

$excludeDirs = @("node_modules", ".git", ".next", ".venv", "venv", "dist", "build", "coverage", ".vscode", ".idea", "submission")
$excludeFiles = @(".DS_Store", ".env", ".env.local")

function Copy-ProjectCode {
    param (
        $Source,
        $Dest
    )
    if (!(Test-Path $Dest)) { New-Item -Path $Dest -ItemType Directory | Out-Null }
    robocopy $Source $Dest /E /XD $excludeDirs /XF $excludeFiles /NFL /NDL /NJH /NJS
}

# Copy Backend
Write-Host "  - Backend..."
if (Test-Path "backend") { Copy-ProjectCode -Source "backend" -Dest (Join-Path $codeDir "backend") }

# Copy Frontend
Write-Host "  - Frontend..."
if (Test-Path "frontend") { Copy-ProjectCode -Source "frontend" -Dest (Join-Path $codeDir "frontend") }

# Copy Root Config Files to code/ (so the project is buildable inside code/)
Write-Host "  - Root Configs..."
Get-ChildItem -Path . -File | Where-Object { 
    $_.Name -notin @("prepare_submission.ps1", "README.md") -and $_.Name -notmatch "^\." 
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $codeDir
}

# 7. Handle AI Docs
# User request: "code/docs/（AI產生之相關文件）"
if (Test-Path "web-bundles") {
    Write-Host "  - AI Docs (web-bundles)..."
    Copy-ProjectCode -Source "web-bundles" -Dest (Join-Path $codeDocsDir "web-bundles")
}

Write-Host "`n------------------------------------------------"
Write-Host "打包完成！" -ForegroundColor Cyan
Write-Host "輸出位置: $targetDir"
Write-Host "------------------------------------------------"
Write-Host "檢查項目：" -ForegroundColor Yellow
Write-Host "1. [OK] docs/ 資料夾已建立且為空 (待您放入 A-G 文件)。"
Write-Host "2. [OK] 相依套件清單 (package.json) 已複製到根目錄。"
Write-Host "3. [OK] 程式碼已複製到 code/ 並排除 node_modules/.git。"
Write-Host "4. [待辦] 請開啟 $targetDir\README.md 加入 Demo 影片連結。"
Write-Host "5. [待辦] 請確認 code/ 資料夾內的專案可正常建置。"
