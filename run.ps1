# Pi-IOT Run Script
# Starts the Smart Plug, Smart Light (both in live mode) and the dashboard dev server
# Uses paths relative to this script - no machine-specific paths needed

$cliDir     = Join-Path $PSScriptRoot "smartDevices\CLI_Version"
$dashDir    = Join-Path $PSScriptRoot "simple-dashboard"

Write-Host "Starting Pi-IOT..." -ForegroundColor Cyan

# Smart Plug - live mode in its own window
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$cliDir'; conda activate pi-iot; python plug1_CLI.py --live"

# Smart Light - live mode in its own window
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$cliDir'; conda activate pi-iot; python light1_CLI.py --live"

# Dashboard dev server in its own window
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$dashDir'; npm run dev"

Write-Host "All services launched in separate windows." -ForegroundColor Green
Write-Host "  - Smart Plug  : live MQTT publishing" -ForegroundColor White
Write-Host "  - Smart Light : live MQTT publishing" -ForegroundColor White
Write-Host "  - Dashboard   : http://localhost:3000" -ForegroundColor White
