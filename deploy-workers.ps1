# Cloudflare Workers 部署脚本
# 运行前请确保已安装 Node.js 和 npm

Write-Host "📦 开始部署文章管理系统 Workers API..." -ForegroundColor Green

# 设置变量 - 请替换为你自己的值
$CloudflareToken = "YOUR_CLOUDFLARE_API_TOKEN"
$AccountId = "YOUR_ACCOUNT_ID"
$DatabaseId = "YOUR_DATABASE_ID"
$WorkersName = "wenzhang-api"

# 切换到脚本目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 1. 检查wrangler
Write-Host "`n1️⃣ 检查 Wrangler CLI..." -ForegroundColor Yellow
try {
    $wranglerVersion = npx wrangler --version
    Write-Host "   Wrangler 版本: $wranglerVersion" -ForegroundColor Green
} catch {
    Write-Host "   错误: 请先安装 Node.js 和 npm" -ForegroundColor Red
    exit 1
}

# 2. 配置wrangler
Write-Host "`n2️⃣ 配置 Wrangler..." -ForegroundColor Yellow
@"
[vars]
API_NAME = "$WorkersName"

[[d1_databases]]
binding = "DB"
database_name = "wenzhang"
database_id = "$DatabaseId"
"@ | Out-File -FilePath "$ScriptDir/wrangler.toml" -Encoding UTF8

Write-Host "   wrangler.toml 已更新" -ForegroundColor Green

# 3. 安装依赖
Write-Host "`n3️⃣ 安装依赖..." -ForegroundColor Yellow
npm install

# 4. 部署
Write-Host "`n4️⃣ 部署 Workers..." -ForegroundColor Yellow
$env:CLOUDFLARE_API_TOKEN = $CloudflareToken
npx wrangler deploy --name $WorkersName

# 5. 获取Workers URL
Write-Host "`n5️⃣ 获取 Workers URL..." -ForegroundColor Yellow
$workersUrl = "https://$WorkersName.$AccountId.workers.dev"
Write-Host "`n✅ 部署成功！" -ForegroundColor Green
Write-Host "`nWorkers URL: $workersUrl" -ForegroundColor Cyan
Write-Host "`n请将此URL配置到 js/config.js 文件中：" -ForegroundColor Yellow
Write-Host "const API_BASE = '$workersUrl/api';" -ForegroundColor White
