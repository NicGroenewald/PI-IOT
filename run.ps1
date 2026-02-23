# Pi-IOT Run Script
# Starts Mosquitto, Smart Plug, Smart Light (live mode), and the dashboard dev server.
# Uses $PSScriptRoot — no machine-specific paths needed.

$rootDir    = $PSScriptRoot
$cliDir     = Join-Path $rootDir "smartDevices\CLI_Version"
$dashDir    = Join-Path $rootDir "simple-dashboard"
$mqttConf   = Join-Path $rootDir "mosquitto.conf"
$mqttEx     = Join-Path $rootDir "mosquitto.conf.example"
$devicesJson = Join-Path $cliDir "devices.json"
$devicesEx   = Join-Path $cliDir "devices.example.json"

Write-Host ""
Write-Host "Pi-IOT Startup" -ForegroundColor Cyan
Write-Host "==============" -ForegroundColor Cyan

# ------------------------------------------------------------------
# STEP 1: Bootstrap mosquitto.conf from example if missing
# ------------------------------------------------------------------
if (-not (Test-Path $mqttConf)) {
    if (Test-Path $mqttEx) {
        Copy-Item $mqttEx $mqttConf
        Write-Host "[OK] mosquitto.conf created from example (localhost-only, safe defaults)." -ForegroundColor Green
    } else {
        Write-Host "[ERROR] mosquitto.conf.example not found. Cannot start broker." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] mosquitto.conf found." -ForegroundColor Green
}

# ------------------------------------------------------------------
# STEP 2: Check devices.json exists and is not placeholder
# ------------------------------------------------------------------
if (-not (Test-Path $devicesJson)) {
    if (Test-Path $devicesEx) {
        Copy-Item $devicesEx $devicesJson
        Write-Host ""
        Write-Host "[ACTION REQUIRED] devices.json was created from the example template." -ForegroundColor Yellow
        Write-Host "  Edit '$devicesJson'" -ForegroundColor Yellow
        Write-Host "  Replace TUYA_DEVICE_ID_HERE / TUYA_LOCAL_KEY_HERE / IP with real values." -ForegroundColor Yellow
        Write-Host "  Then re-run this script." -ForegroundColor Yellow
        Write-Host ""
        exit 0
    } else {
        Write-Host "[ERROR] devices.json not found and no example template available." -ForegroundColor Red
        exit 1
    }
}

if (Select-String -Path $devicesJson -Pattern "TUYA_DEVICE_ID_HERE" -Quiet) {
    Write-Host ""
    Write-Host "[ACTION REQUIRED] devices.json still contains placeholder values." -ForegroundColor Yellow
    Write-Host "  Edit '$devicesJson' with your real Tuya device credentials." -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

Write-Host "[OK] devices.json found and configured." -ForegroundColor Green

# ------------------------------------------------------------------
# STEP 3: Start Mosquitto broker (localhost-only config)
# ------------------------------------------------------------------
$mosq = Get-Command mosquitto -ErrorAction SilentlyContinue
if ($mosq) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "Write-Host 'Mosquitto MQTT Broker' -ForegroundColor Cyan; mosquitto -c '$mqttConf' -v"
    Write-Host "[OK] Mosquitto started (bound to 127.0.0.1 only)." -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "[WARN] mosquitto not found in PATH — skipping broker start." -ForegroundColor Yellow
    Write-Host "       Install Mosquitto or start it manually before running devices." -ForegroundColor Yellow
}

# ------------------------------------------------------------------
# STEP 4: Start device scripts in live mode
# ------------------------------------------------------------------
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Write-Host 'Smart Plug - Live Mode' -ForegroundColor Cyan; Set-Location '$cliDir'; conda activate pi-iot; python plug1_CLI.py --live"

Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Write-Host 'Smart Light - Live Mode' -ForegroundColor Cyan; Set-Location '$cliDir'; conda activate pi-iot; python light1_CLI.py --live"

# ------------------------------------------------------------------
# STEP 5: Start dashboard dev server
# ------------------------------------------------------------------
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Write-Host 'Dashboard Dev Server' -ForegroundColor Cyan; Set-Location '$dashDir'; npm run dev"

Write-Host ""
Write-Host "All services launched in separate windows:" -ForegroundColor Green
Write-Host "  Mosquitto   : mqtt://127.0.0.1:1883  |  ws://127.0.0.1:9001" -ForegroundColor White
Write-Host "  Smart Plug  : live MQTT publishing" -ForegroundColor White
Write-Host "  Smart Light : live MQTT publishing" -ForegroundColor White
Write-Host "  Dashboard   : http://localhost:3000" -ForegroundColor White
Write-Host ""
