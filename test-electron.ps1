# Test script to run Electron directly
$RootDir = Get-Location

Write-Host "[TEST] Starting Electron app directly..." -ForegroundColor Cyan

# First, let's check if the React app is accessible
Write-Host "[CHECK] Testing React dev server at http://localhost:5173..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2
    Write-Host "[OK] React dev server is running" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] React dev server not accessible. Starting it now..." -ForegroundColor Yellow
    
    # Start React dev server in a new window
    $reactProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootDir\frontend'; npm run dev:react" -PassThru
    
    Write-Host "[WAIT] Waiting for React server to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Now start Electron
Write-Host "[START] Starting Electron..." -ForegroundColor Cyan
Set-Location "$RootDir\frontend"

# Run electron directly
& npx electron dist/electron/main.js

Write-Host "[INFO] Electron closed" -ForegroundColor Yellow