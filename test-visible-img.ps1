# Test: Upload visible image and create article
$headers = @{ "Content-Type" = "application/json" }

# 1. Login
Write-Host "=== 1. Login ===" -ForegroundColor Cyan
$login = Invoke-RestMethod -Uri "https://wenzhang.dingdingoa.cn/api/auth/login" -Method Post -Headers $headers -Body (@{ username = "admin"; password = "mima2012" } | ConvertTo-Json)
$login | ConvertTo-Json -Depth 3
$token = $login.data.token
Write-Host "Login OK, token: $($token.Substring(0,20))..." -ForegroundColor Green

# 2. Download a visible test image
Write-Host "`n=== 2. Download test image ===" -ForegroundColor Cyan
$imgFile = "$env:TEMP\test_visible.png"
try {
    Invoke-WebRequest -Uri "https://via.placeholder.com/400x200.png?text=Test+Image+Upload" -OutFile $imgFile -TimeoutSec 10
    $fileSize = (Get-Item $imgFile).Length
    Write-Host "Image downloaded: $fileSize bytes" -ForegroundColor Green
} catch {
    Write-Host "Download failed, creating local image..." -ForegroundColor Yellow
    # Create a visible 400x200 red PNG manually
    $imgBase64 = "iVBORw0KGgoAAAANSUhEUgAgAAAAIAAAICAYAAACZCZzbAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI2LTA1LTIwIDA5OjE4OjI1IiB4bXA6TWV0YWRhdGFEYXRlPSIyMDI2LTA1LTIwIDA5OjE4OjI1IiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNi0wNS0yMCAwOToxODoyNSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDoxMjM0NTY3OCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDoxMjM0NTY3OCIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjEyMzQ1Njc4IiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MTIzNDU2NzgiIHN0RXZ0OndoZW49IjIwMjYtMDUtMjAgMDk6MTg6MjUiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4xIChXaW5kb3dzKSIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4B//79/Pv6+fj39vX08/Lx8O/u7ezr6uno5+bl5OPi4eDf3t3c29rZ2NfW1dTT0tHQz87NzMvKycjHxsXEw8LBwL++vby7urm4t7a1tLOysbCvrq2sq6qpqKempaSjoqGgn56dnJuamZiXlpWUk5KRkI+OjYyLiomIh4aFhIOCgYB/fn18e3p5eHd2dXRzcnFwb25tbGtqaWhnZmVkY2JhYF9eXVxbWllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkFAPz49PDs6OTg3NjU0MzIxMC8uLSwrKikoJyYlJCMiISAfHh0cGxoZGBcWFRQTEhEQDw4NDAsKCQgHBgUEAwIBAAAh+QQAAAAAACwAAAAAAQABAAACAkQBADs="
    $imgBytes = [Convert]::FromBase64String($imgBase64)
    [System.IO.File]::WriteAllBytes($imgFile, $imgBytes)
    Write-Host "Local image created" -ForegroundColor Green
}

# 3. Upload image
Write-Host "`n=== 3. Upload image ===" -ForegroundColor Cyan
$curlCmd = "curl.exe -s -X POST `"https://wenzhang.dingdingoa.cn/api/upload`" -H `"Authorization: Bearer $token`" -F `"image=@$imgFile`""
$upload = Invoke-Expression $curlCmd | ConvertFrom-Json
$upload | ConvertTo-Json -Depth 3

if ($upload.url) {
    Write-Host "Upload SUCCESS!" -ForegroundColor Green
    $imgUrl = $upload.url

    # 4. Create article
    Write-Host "`n=== 4. Create article ===" -ForegroundColor Cyan
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
        Write-Host "Image URL: $imgUrl" -ForegroundColor Cyan
        Write-Host "`nView article at: https://wenzhang.dingdingoa.cn/article.html?id=$($article.data.id)" -ForegroundColor Magenta
    }
} else {
    Write-Host "Upload failed: $($upload.error)" -ForegroundColor Red
}

Remove-Item $imgFile -ErrorAction SilentlyContinue
