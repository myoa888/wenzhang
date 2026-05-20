# D1 数据库迁移脚本 - 添加缺失的 is_default 列
# Cloudflare D1 Database ID: e377f52f-f9aa-4d0d-936e-5e2b3a3994dd

Write-Host "开始数据库迁移..." -ForegroundColor Cyan

# 执行 ALTER TABLE 添加 is_default 列
npx wrangler d1 execute wenzhang --database-id=e377f52f-f9aa-4d0d-936e-5e2b3a3994dd --command="ALTER TABLE ai_config ADD COLUMN is_default INTEGER DEFAULT 0;"

if ($LASTEXITCODE -eq 0) {
    Write-Host "迁移成功！" -ForegroundColor Green
} else {
    Write-Host "迁移失败，请检查错误信息" -ForegroundColor Red
}
