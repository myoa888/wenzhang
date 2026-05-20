# Full test: login + upload image + create article
$headers = @{ "Content-Type" = "application/json" }

Write-Host "=== 1. Login ===" -ForegroundColor Cyan
$login = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/auth/login" -Method Post -Headers $headers -Body (@{ username = "admin"; password = "mima2012" } | ConvertTo-Json)
$login | ConvertTo-Json -Depth 3

if (-not $login.success) {
    Write-Host "Login failed!" -ForegroundColor Red; exit
}
$token = $login.data.token
Write-Host "Login OK" -ForegroundColor Green

Write-Host "`n=== 2. Create test image ===" -ForegroundColor Cyan
$imgBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
$imgBytes = [Convert]::FromBase64String($imgBase64)
$testFile = "$env:TEMP\test_upload.png"
[System.IO.File]::WriteAllBytes($testFile, $imgBytes)

Write-Host "`n=== 3. Upload image ===" -ForegroundColor Cyan
$curlCmd = "curl.exe -s -X POST `"https://wenzhang.dingdingoa.cn/api/upload`" -H `"Authorization: Bearer $token`" -F `"image=@$testFile`""
$upload = Invoke-Expression $curlCmd | ConvertFrom-Json
$upload | ConvertTo-Json -Depth 5

if ($upload.url) {
    Write-Host "Image upload OK" -ForegroundColor Green
    $imgUrl = $upload.url

    Write-Host "`n=== 4. Create article with image ===" -ForegroundColor Cyan
    $articleBody = @{
        title = "Test Article with Image"
        content = "# Test Image`n`n![Test]($imgUrl)`n`nThis is a test article."
        summary = "Image upload test"
        status = "published"
    } | ConvertTo-Json

    $article = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/articles" -Method Post -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    } -Body $articleBody
    $article | ConvertTo-Json -Depth 5

    if ($article.success) {
        Write-Host "`n=== TEST PASSED ===" -ForegroundColor Green
        Write-Host "Article ID: $($article.data.id)" -ForegroundColor Cyan
        Write-Host "Image URL: $imgUrl" -ForegroundColor Cyan
    } else {
        Write-Host "Article creation failed: $($article.error)" -ForegroundColor Red
    }
} else {
    Write-Host "Upload failed" -ForegroundColor Red
}

Remove-Item $testFile -ErrorAction SilentlyContinue
