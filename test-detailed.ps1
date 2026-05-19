# 详细测试脚本
$headers = @{"Content-Type" = "application/json"}

# 1. 登录获取token
Write-Host "=== 1. 登录 ===" -ForegroundColor Cyan
$loginBody = @{
    username = "admin"
    password = "mima2012"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/auth/login" -Method Post -Headers $headers -Body $loginBody
Write-Host ($loginRes | ConvertTo-Json)
$token = $loginRes.data.token

# 2. 用新slug创建分类
Write-Host "`n=== 2. 创建分类 (new-cat-123) ===" -ForegroundColor Cyan
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}
$catBody = @{
    name = "测试分类123"
    slug = "test-new-123"
} | ConvertTo-Json

try {
    $catRes = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/categories" -Method Post -Headers $authHeaders -Body $catBody
    Write-Host ($catRes | ConvertTo-Json)
} catch {
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    # 获取响应内容
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    $reader.Close()
    Write-Host "响应内容: $responseBody" -ForegroundColor Red
}

# 3. 获取分类列表验证
Write-Host "`n=== 3. 获取分类列表 ===" -ForegroundColor Cyan
$cats = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/categories"
Write-Host ($cats | ConvertTo-Json -Depth 2)

# 4. 测试标签
Write-Host "`n=== 4. 获取标签列表 ===" -ForegroundColor Cyan
$tags = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/tags"
Write-Host ($tags | ConvertTo-Json -Depth 2)

Write-Host "`n=== 测试完成 ===" -ForegroundColor Green
