# Launch Electron manually while backend and frontend are running
$RootDir = Get-Location

Write-Host "[LAUNCH] Manually launching Electron..." -ForegroundColor Cyan

# Check services are running
Write-Host "[CHECK] Verifying services..." -ForegroundColor Yellow
$backend = Test-NetConnection -ComputerName localhost -Port 8080 -InformationLevel Quiet
$frontend = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet

Write-Host "Backend (8080): $(if($backend){'Running'}else{'Not running'})" -ForegroundColor $(if($backend){'Green'}else{'Red'})
Write-Host "Frontend (5173): $(if($frontend){'Running'}else{'Not running'})" -ForegroundColor $(if($frontend){'Green'}else{'Red'})

if (-not $backend -or -not $frontend) {
    Write-Host "[ERROR] Backend and frontend must be running first (use dev-start.ps1)" -ForegroundColor Red
    exit 1
}

# Set environment for development
$env:NODE_ENV = "development"
$env:ELECTRON_ENABLE_LOGGING = "1"

# Navigate to frontend
Set-Location "$RootDir\frontend"

# Check if Electron is installed
if (-not (Test-Path "node_modules\electron\dist\electron.exe")) {
    Write-Host "[ERROR] Electron not found. Running npm install..." -ForegroundColor Yellow
    npm install
}

Write-Host "[START] Launching Electron..." -ForegroundColor Green
Write-Host "[INFO] Watch the console for any errors" -ForegroundColor Yellow
Write-Host "[INFO] The window should appear, or check system tray" -ForegroundColor Yellow
Write-Host "[INFO] Press Ctrl+Shift+T to toggle window visibility" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Gray

# Run Electron directly
& "node_modules\electron\dist\electron.exe" "dist\electron\main.js"

Write-Host "[DONE] Electron closed" -ForegroundColor Gray