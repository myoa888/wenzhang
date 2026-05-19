# API测试脚本
$headers = @{"Content-Type" = "application/json"}

Write-Host "=== TC-AUTH-001: 用户登录 ===" -ForegroundColor Cyan
$loginBody = @{
    username = "admin"
    password = "mima2012"
} | ConvertTo-Json

try {
    $loginRes = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/auth/login" -Method Post -Headers $headers -Body $loginBody
    $loginRes | ConvertTo-Json -Depth 3
    
    if ($loginRes.success) {
        $token = $loginRes.data.token
        Write-Host "登录成功! Token: $($token.Substring(0, [Math]::Min(20, $token.Length)))..." -ForegroundColor Green
        
        # 测试需要认证的接口
        Write-Host "`n=== 测试需要认证的接口 ===" -ForegroundColor Cyan
        
        # 创建分类
        Write-Host "`n=== TC-CATEGORY-002: 创建分类 ===" -ForegroundColor Cyan
        $catBody = @{ name = "测试分类"; slug = "test-cat" } | ConvertTo-Json
        $authHeaders = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $token"
        }
        try {
            $catRes = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/categories" -Method Post -Headers $authHeaders -Body $catBody
            $catRes | ConvertTo-Json
        } catch {
            $_.Exception.Response.StatusDescription
        }
        
        # 创建文章
        Write-Host "`n=== TC-ARTICLE-006: 创建文章 ===" -ForegroundColor Cyan
        $articleBody = @{
            title = "API测试文章"
            content = "# 测试标题`n`n这是测试内容"
            summary = "测试摘要"
            status = "published"
        } | ConvertTo-Json
        try {
            $articleRes = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/articles" -Method Post -Headers $authHeaders -Body $articleBody
            $articleRes | ConvertTo-Json
        } catch {
            $_.Exception.Response.StatusDescription
        }
        
    } else {
        Write-Host "登录失败: $($loginRes.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "请求失败: $_" -ForegroundColor Red
}

Write-Host "`n=== 测试公开接口 ===" -ForegroundColor Cyan

Write-Host "`n=== TC-ARTICLE-001: 获取文章列表 ===" -ForegroundColor Cyan
try {
    $articles = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/articles"
    $articles | ConvertTo-Json -Depth 2
} catch {
    Write-Host "失败: $_" -ForegroundColor Red
}

Write-Host "`n=== TC-CATEGORY-001: 获取分类列表 ===" -ForegroundColor Cyan
try {
    $categories = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/categories"
    $categories | ConvertTo-Json -Depth 2
} catch {
    Write-Host "失败: $_" -ForegroundColor Red
}

Write-Host "`n=== TC-SEARCH-001: 搜索 ===" -ForegroundColor Cyan
try {
    $search = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/search?keyword=测试"
    $search | ConvertTo-Json -Depth 2
} catch {
    Write-Host "失败: $_" -ForegroundColor Red
}

Write-Host "`n=== TC-FRONT-001: 首页检查 ===" -ForegroundColor Cyan
try {
    $html = Invoke-WebRequest -Uri "https://wenzhang.dingdingoa.cn/index.html"
    if ($html.Content -match "footer-placeholder") {
        Write-Host "✓ 首页有 footer-placeholder" -ForegroundColor Green
    }
    if ($html.Content -match "version") {
        Write-Host "✓ 首页有 version 元素" -ForegroundColor Green
    }
} catch {
    Write-Host "失败: $_" -ForegroundColor Red
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Green
