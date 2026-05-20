# ================================================
# 自媒体创作系统 - 一键导出脚本
# 导出所有数据：文章、创意、待办、附件
# ================================================

param(
    [string]$ApiUrl = "https://wenzhang.dingdingoa.cn",
    [string]$Token = "",
    [string]$ExportDir = "$PSScriptRoot\exports"
)

# 创建导出目录
if (-not (Test-Path $ExportDir)) {
    New-Item -ItemType Directory -Path $ExportDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dataFile = "$ExportDir\wenzhang_data_$timestamp.json"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  自媒体创作系统 - 一键导出" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查Token
if ([string]::IsNullOrEmpty($Token)) {
    Write-Host "请输入你的Token: " -NoNewline
    $Token = Read-Host
}

if ([string]::IsNullOrEmpty($Token)) {
    Write-Host "Token不能为空!" -ForegroundColor Red
    exit 1
}

# 获取用户信息
Write-Host "[1/4] 获取用户信息..." -NoNewline
try {
    $userRes = Invoke-RestMethod -Uri "$ApiUrl/api/user" -Method Get -Headers @{"Authorization" = "Bearer $Token"}
    $username = $userRes.username
    Write-Host " OK ($username)" -ForegroundColor Green
} catch {
    Write-Host " 失败" -ForegroundColor Red
    Write-Host "错误: $_" -ForegroundColor Red
    exit 1
}

# 导出所有数据
Write-Host "[2/4] 导出文章..." -NoNewline
try {
    $articles = Invoke-RestMethod -Uri "$ApiUrl/api/my/articles?limit=1000" -Method Get -Headers @{"Authorization" = "Bearer $Token"}
    Write-Host " OK ($(($articles.articles | Measure-Object).Count) 篇)" -ForegroundColor Green
} catch {
    $articles = @{articles = @()}
    Write-Host " 失败或无文章" -ForegroundColor Yellow
}

Write-Host "[3/4] 导出创意..." -NoNewline
try {
    $ideas = Invoke-RestMethod -Uri "$ApiUrl/api/ideas" -Method Get -Headers @{"Authorization" = "Bearer $Token"}
    Write-Host " OK ($(($ideas.data | Measure-Object).Count) 个)" -ForegroundColor Green
} catch {
    $ideas = @{data = @()}
    Write-Host " 失败或无创意" -ForegroundColor Yellow
}

Write-Host "[4/4] 导出待办..." -NoNewline
try {
    $tasks = Invoke-RestMethod -Uri "$ApiUrl/api/tasks?assignee=all" -Method Get -Headers @{"Authorization" = "Bearer $Token"}
    Write-Host " OK ($(($tasks.data | Measure-Object).Count) 项)" -ForegroundColor Green
} catch {
    $tasks = @{data = @()}
    Write-Host " 失败或无待办" -ForegroundColor Yellow
}

# 打包导出数据
$exportData = @{
    export_time = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    export_by = $username
    version = "1.0"
    articles = $articles.articles
    ideas = $ideas.data
    tasks = $tasks.data
}

# 保存JSON
$exportData | ConvertTo-Json -Depth 10 | Out-File -FilePath $dataFile -Encoding UTF8
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  导出完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "导出文件: $dataFile" -ForegroundColor White
Write-Host ""

# 统计信息
$totalArticles = ($articles.articles | Measure-Object).Count
$publishedArticles = ($articles.articles | Where-Object { $_.status -eq "published" } | Measure-Object).Count
$pendingArticles = ($articles.articles | Where-Object { $_.status -eq "pending_review" } | Measure-Object).Count
$totalIdeas = ($ideas.data | Measure-Object).Count
$pendingIdeas = ($ideas.data | Where-Object { $_.status -eq "pending" } | Measure-Object).Count
$totalTasks = ($tasks.data | Measure-Object).Count
$pendingTasks = ($tasks.data | Where-Object { $_.status -eq "pending" } | Measure-Object).Count

Write-Host "📊 数据统计:" -ForegroundColor Yellow
Write-Host "  ├─ 文章总数: $totalArticles"
Write-Host "  │  ├─ 已发布: $publishedArticles"
Write-Host "  │  └─ 待审核: $pendingArticles"
Write-Host "  ├─ 创意总数: $totalIdeas"
Write-Host "  │  └─ 待生成: $pendingIdeas"
Write-Host "  └─ 待办总数: $totalTasks"
Write-Host "     └─ 待处理: $pendingTasks"
Write-Host ""

# 打开导出目录
Write-Host "按任意键打开导出目录..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Start-Process explorer.exe -ArgumentList $ExportDir
