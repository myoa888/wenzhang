#!/usr/bin/env pwsh
# 自动推送脚本 - 在项目根目录执行
# 用法: .\auto-push-all.ps1

$ErrorActionPreference = "Continue"

# 获取当前分支
$branch = git rev-parse --abbrev-ref HEAD

Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "开始自动推送..." -ForegroundColor Cyan
Write-Host "分支: $branch" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# 推送到 GitHub
Write-Host "`n正在推送到 GitHub..." -ForegroundColor Yellow
git push origin $branch 2>&1

# 推送到 Gitee
if (git remote | Select-String "gitee" -Quiet) {
    Write-Host "`n正在推送到 Gitee..." -ForegroundColor Yellow
    git push gitee $branch 2>&1
}

Write-Host "`n" + ("=" * 50) -ForegroundColor Green
Write-Host "推送完成!" -ForegroundColor Green
Write-Host ("=" * 50) -ForegroundColor Green
