# Force show the Electron window for debugging
$RootDir = Get-Location

Write-Host "[DEBUG] Starting Electron with forced window display..." -ForegroundColor Cyan

# Set environment variable for development
$env:NODE_ENV = "development"
$env:ELECTRON_FORCE_SHOW = "true"

# Navigate to frontend
Set-Location "$RootDir\frontend"

# Create a temporary modified main.js that forces window to show
$mainJsPath = "dist\electron\main.js"
$mainJsContent = Get-Content $mainJsPath -Raw

# Check if we already have the force show modification
if (-not $mainJsContent.Contains("ELECTRON_FORCE_SHOW")) {
    Write-Host "[MODIFY] Adding force show to main.js..." -ForegroundColor Yellow
    
    # Replace show: false with show: true if ELECTRON_FORCE_SHOW is set
    $modifiedContent = $mainJsContent -replace 'show: false', 'show: process.env.ELECTRON_FORCE_SHOW === "true" ? true : false'
    
    # Also modify the tray behavior temporarily
    $modifiedContent = $modifiedContent -replace "mainWindow\.on\('close', \(event\) => \{", @"
mainWindow.on('close', (event) => {
  if (process.env.ELECTRON_FORCE_SHOW === 'true') {
    // In debug mode, actually close the window
    return;
  }
"@
    
    # Write the modified content
    Set-Content -Path $mainJsPath -Value $modifiedContent
}

Write-Host "[START] Starting Electron with forced window display..." -ForegroundColor Green
Write-Host "[INFO] Window should appear immediately and stay visible" -ForegroundColor Yellow
Write-Host "[INFO] Press Ctrl+C to stop" -ForegroundColor Yellow

# Run electron
& npx electron dist/electron/main.js

Write-Host "[DONE] Electron closed" -ForegroundColor Gray