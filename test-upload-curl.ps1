# 图片上传测试 - 使用 curl
Add-Type -AssemblyName System.Net.Http

$headers = @{ "Content-Type" = "application/json" }
$loginBody = @{ username = "admin"; password = "mima2012" } | ConvertTo-Json

Write-Host "=== 1. 登录 ===" -ForegroundColor Cyan
$login = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/auth/login" -Method Post -Headers $headers -Body $loginBody
$login | ConvertTo-Json -Depth 3

if (-not $login.success) {
    Write-Host "登录失败!" -ForegroundColor Red
    exit
}

$token = $login.data.token
Write-Host "登录成功, Token: $($token.Substring(0, [Math]::Min(30, $token.Length)))..." -ForegroundColor Green

# 创建测试图片
Write-Host "`n=== 2. 创建测试图片 ===" -ForegroundColor Cyan
$imgBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
$imgBytes = [Convert]::FromBase64String($imgBase64)
$testFile = "$env:TEMP\test_upload.png"
[System.IO.File]::WriteAllBytes($testFile, $imgBytes)
Write-Host "图片已创建: $testFile" -ForegroundColor Green

# 使用 curl 上传
Write-Host "`n=== 3. 使用 curl 上传图片 ===" -ForegroundColor Cyan
$curlCmd = "curl.exe -s -X POST `"https://wenzhang.dingdingoa.cn/api/upload`" -H `"Authorization: Bearer $token`" -F `"image=@$testFile`""
Write-Host "命令: $curlCmd" -ForegroundColor Gray
$result = Invoke-Expression $curlCmd
Write-Host "结果: $result" -ForegroundColor Cyan

# 清理
Remove-Item $testFile -ErrorAction SilentlyContinue

Write-Host "`n=== 测试完成 ===" -ForegroundColor Green
