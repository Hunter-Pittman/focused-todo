# Test backend directly
$RootDir = Get-Location

Write-Host "[TEST] Testing backend executable directly..." -ForegroundColor Cyan

# Check if the executable exists
$backendPath = "$RootDir\backend\bin\focused-todo.exe"
if (Test-Path $backendPath) {
    Write-Host "[OK] Backend executable found at: $backendPath" -ForegroundColor Green
    
    # Get file info
    $fileInfo = Get-Item $backendPath
    Write-Host "File size: $($fileInfo.Length) bytes" -ForegroundColor Gray
    Write-Host "Last modified: $($fileInfo.LastWriteTime)" -ForegroundColor Gray
} else {
    Write-Host "[ERROR] Backend executable not found at: $backendPath" -ForegroundColor Red
    exit 1
}

Write-Host "`n[START] Running backend directly to see any errors..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host "" -ForegroundColor Gray

# Change to backend directory (in case it needs relative paths)
Set-Location "$RootDir\backend"

# Run the backend directly so we can see any error output
& "bin\focused-todo.exe"