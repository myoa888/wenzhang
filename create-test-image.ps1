Add-Type -AssemblyName System.Drawing
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = "e:\project\wenzhang" }
$bmp = New-Object System.Drawing.Bitmap(100,100)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(66,133,244))
$font = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
$brush = [System.Drawing.Brushes]::White
$g.DrawString("TEST", $font, $brush, 20, 40)
$g.Dispose()
$bmp.Save("$scriptDir\test-image.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Test image created: $scriptDir\test-image.png"
