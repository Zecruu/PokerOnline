# Upload Tactical Waters ship sprites to S3 (same bucket as Velthara / Critter Colony / Realty Rush).
# Served via the existing CloudFront distribution: d2f5lfipdzhi8t.cloudfront.net (alias cdn.zecrugames.com).
#
# Usage:
#   .\scripts\upload-battleship-sprites.ps1
#   .\scripts\upload-battleship-sprites.ps1 -Bucket zecrugames-assets  # override
#
# Bump BS_ASSET_VERSION in games-server/public/battleship/cdn-assets.js after re-uploading
# so clients pull the new files instead of the cached ones.

param(
    [string]$Bucket = "zecrugames-assets",
    [string]$Prefix = "battleship",
    [string]$SourceDir = "s3-upload/battleship"
)

if (-not (Test-Path $SourceDir)) {
    Write-Host "Source dir '$SourceDir' not found. Copy sprites in first:" -ForegroundColor Red
    Write-Host "  Copy-Item games-server/public/battleship/ships/*.png $SourceDir/ships/ -Force" -ForegroundColor Yellow
    exit 1
}

$dest = "s3://$Bucket/$Prefix"
Write-Host "Syncing $SourceDir -> $dest" -ForegroundColor Cyan
Write-Host "Files about to upload:" -ForegroundColor Gray
Get-ChildItem -Recurse $SourceDir | Select-Object -ExpandProperty FullName

aws s3 sync $SourceDir $dest `
    --cache-control "public,max-age=31536000,immutable" `
    --content-type "image/png" `
    --exclude "*" --include "*.png"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nUpload failed. If 'public-read' is required on your bucket, append --acl public-read." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`nVerifying CDN..." -ForegroundColor Cyan
$ships = @('carrier','battleship','cruiser','submarine','destroyer')
foreach ($s in $ships) {
    $url = "https://d2f5lfipdzhi8t.cloudfront.net/$Prefix/ships/$s.png"
    try {
        $r = Invoke-WebRequest -Method Head -Uri $url -UseBasicParsing -ErrorAction Stop
        Write-Host ("  {0}.png: {1}  ({2:N0} bytes)" -f $s, $r.StatusCode, [int]$r.Headers['Content-Length'])
    } catch {
        Write-Host "  $s.png: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`nDone. If you re-ran this after the first upload, bump BS_ASSET_VERSION in cdn-assets.js to bust caches." -ForegroundColor Green
