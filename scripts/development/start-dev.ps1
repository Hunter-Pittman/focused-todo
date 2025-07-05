# Start Focused To-Do in development mode with proper environment variables
$RootDir = Get-Location

Write-Host "[START] Starting Focused To-Do in development mode..." -ForegroundColor Green

# Set environment variable for Electron
$env:NODE_ENV = "development"
$env:ELECTRON_ENABLE_LOGGING = "1"

# Check if backend is running
Write-Host "[CHECK] Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing -TimeoutSec 2
    Write-Host "[OK] Backend is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Backend is not running. Please run ./dev-start.ps1 first" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if React dev server is running
Write-Host "[CHECK] Checking if React dev server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2
    Write-Host "[OK] React dev server is running" -ForegroundColor Green
} catch {
    Write-Host "[START] Starting React dev server..." -ForegroundColor Yellow
    # Start React dev server in a new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootDir\frontend'; npm run dev:react"
    
    Write-Host "[WAIT] Waiting for React server to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 8
}

# Now start Electron with proper environment
Write-Host "[START] Starting Electron with NODE_ENV=development..." -ForegroundColor Cyan
Set-Location "$RootDir\frontend"

# Run electron directly with environment variable set
& npx electron dist/electron/main.js

Write-Host "[INFO] Electron closed" -ForegroundColor Yellow