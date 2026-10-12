# Asks for your Weather Underground API key (hidden as you paste it), then runs
# the history downloader. The key is held only in this window while it runs;
# it is never written to a file.

Set-Location (Split-Path $PSScriptRoot -Parent)

# Make sure Node.js is found even in a fresh window.
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")

Write-Host ""
Write-Host "Weather history download" -ForegroundColor Cyan
Write-Host "------------------------"
Write-Host "Paste your Weather Underground API key below and press Enter."
Write-Host "Nothing will show on screen as you paste. That is on purpose."
Write-Host ""

$secure = Read-Host "API key" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$env:WU_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

if ([string]::IsNullOrWhiteSpace($env:WU_API_KEY)) {
    Write-Host "No key entered. Nothing was downloaded." -ForegroundColor Yellow
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host ""
Write-Host "Downloading. This can take about 40 minutes. You can leave this window alone." -ForegroundColor Green
Write-Host ""

node scripts/fetch-wu-history.mjs

Write-Host ""
Write-Host "Finished. You can close this window, then tell Claude it is done." -ForegroundColor Cyan
Read-Host "Press Enter to close"
