# Test if React app is loading correctly
Write-Host "[TEST] Testing React app loading..." -ForegroundColor Cyan

# Test the React dev server
Write-Host "`n[CHECK] Testing React dev server at http://localhost:5173..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing
    Write-Host "[OK] React server responded with status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Content length: $($response.Content.Length) bytes" -ForegroundColor Gray
    
    # Check if it's returning HTML
    if ($response.Content -like "*<!DOCTYPE html>*" -or $response.Content -like "*<html*") {
        Write-Host "[OK] Server is returning HTML content" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Server response doesn't look like HTML" -ForegroundColor Yellow
        Write-Host "First 200 chars: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))" -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERROR] Failed to connect to React dev server: $_" -ForegroundColor Red
}

# Test the backend API
Write-Host "`n[CHECK] Testing backend API at http://localhost:8080..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing
    Write-Host "[OK] Backend API responded with status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "[INFO] Backend is running but /api/health endpoint not found (404)" -ForegroundColor Yellow
    } else {
        Write-Host "[ERROR] Failed to connect to backend: $_" -ForegroundColor Red
    }
}

Write-Host "`n[TIPS] To debug the Electron window:" -ForegroundColor Yellow
Write-Host "1. In the blank Electron window, press Ctrl+Shift+I to open DevTools" -ForegroundColor Gray
Write-Host "2. Check the Console tab for any errors" -ForegroundColor Gray
Write-Host "3. Check the Network tab to see if resources are loading" -ForegroundColor Gray
Write-Host "4. Try navigating to http://localhost:5173 in a regular browser" -ForegroundColor Gray