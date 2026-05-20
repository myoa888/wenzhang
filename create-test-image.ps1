# Create a visible test image using .NET
Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(400, 200)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(70, 130, 180))
$font = New-Object System.Drawing.Font("Arial", 24)
$brush = [System.Drawing.Brushes]::White
$g.DrawString("Test Image Upload", $font, $brush, 80, 80)
$g.Dispose()
$bmp.Save("$env:TEMP\test.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Image created at $env:TEMP\test.png" -ForegroundColor Green
