# Upload image and create article
$headers = @{ "Content-Type" = "application/json" }

# 1. Login
Write-Host "=== 1. Login ===" -ForegroundColor Cyan
$login = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/auth/login" -Method Post -Headers $headers -Body (@{ username = "admin"; password = "mima2012" } | ConvertTo-Json)
$token = $login.data.token
Write-Host "Login OK" -ForegroundColor Green

# 2. Upload image
Write-Host "`n=== 2. Upload image ===" -ForegroundColor Cyan
$imgFile = "$env:TEMP\test.png"
$curlCmd = "curl.exe -s -X POST `"https://wenzhang.dingdingoa.cn/api/upload`" -H `"Authorization: Bearer $token`" -F `"image=@$imgFile`""
$upload = Invoke-Expression $curlCmd | ConvertFrom-Json
$upload | ConvertTo-Json -Depth 3

if ($upload.url) {
    Write-Host "Upload SUCCESS!" -ForegroundColor Green
    $imgUrl = $upload.url

    # 3. Create article
    Write-Host "`n=== 3. Create article ===" -ForegroundColor Cyan
    $content = "# Test Image Upload`n`nThis is a visible test image:`n`n![Test Image]($imgUrl)`n`nThe image above should be visible in the article."

    $articleBody = @{
        title = "Test: Visible Image Upload"
        content = $content
        summary = "Testing image upload with a visible picture"
        status = "published"
    } | ConvertTo-Json

    $article = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/articles" -Method Post -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    } -Body $articleBody
    $article | ConvertTo-Json -Depth 3

    if ($article.success) {
        Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
        Write-Host "Article ID: $($article.data.id)" -ForegroundColor Yellow
        Write-Host "`nView at: https://wenzhang.dingdingoa.cn/article.html?id=$($article.data.id)" -ForegroundColor Magenta
    }
} else {
    Write-Host "Upload failed" -ForegroundColor Red
}
