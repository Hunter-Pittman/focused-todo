# Focused To-Do Development Startup Script for Windows PowerShell
# Run with: powershell -ExecutionPolicy Bypass -File dev-start.ps1

Write-Host "🚀 Starting Focused To-Do Development Environment" -ForegroundColor Green

# Store the root directory
$RootDir = Get-Location

# Check if we're in the right directory
if (-not (Test-Path "CLAUDE.md")) {
    Write-Host "❌ Please run this script from the focused-todo root directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "📋 Checking dependencies..." -ForegroundColor Yellow

# Function to check if a command exists
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Check for Go
if (-not (Test-Command "go")) {
    Write-Host "❌ Go is not installed. Please install Go 1.21 or later." -ForegroundColor Red
    Write-Host "Download from: https://golang.org/dl/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check for Node.js
if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18 or later." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check for npm
if (-not (Test-Command "npm")) {
    Write-Host "❌ npm is not installed. Please install npm." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ All dependencies found" -ForegroundColor Green

# Build the shared types first
Write-Host "🔧 Building shared types..." -ForegroundColor Cyan
Set-Location "$RootDir\shared"
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
}
catch {
    Write-Host "❌ Failed to build shared types: $_" -ForegroundColor Red
    Set-Location $RootDir
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location $RootDir

# Build and start the backend
Write-Host "🔧 Building backend..." -ForegroundColor Cyan
Set-Location "$RootDir\backend"
try {
    # Create bin directory if it doesn't exist
    if (-not (Test-Path "bin")) {
        New-Item -ItemType Directory -Path "bin" | Out-Null
    }
    
    go build -o "bin\focused-todo.exe" ".\cmd\focused-todo"
    if ($LASTEXITCODE -ne 0) { throw "Go build failed" }
    
    # Verify the executable was created
    if (-not (Test-Path "bin\focused-todo.exe")) {
        throw "Backend executable was not created"
    }
}
catch {
    Write-Host "❌ Failed to build backend: $_" -ForegroundColor Red
    Set-Location $RootDir
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "🔴 Starting backend server..." -ForegroundColor Red
$BackendPath = Join-Path (Get-Location) "bin\focused-todo.exe"
Write-Host "Backend path: $BackendPath" -ForegroundColor Gray
$BackendProcess = Start-Process -FilePath $BackendPath -WindowStyle Minimized -PassThru
Set-Location $RootDir

# Wait a moment for backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Build and start the frontend
Write-Host "🔧 Building and starting frontend..." -ForegroundColor Cyan
Set-Location "$RootDir\frontend"
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    
    npm run build:electron
    if ($LASTEXITCODE -ne 0) { throw "npm run build:electron failed" }
}
catch {
    Write-Host "❌ Failed to build frontend: $_" -ForegroundColor Red
    Set-Location $RootDir
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "🟢 Starting Electron application..." -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Focused To-Do is starting up!" -ForegroundColor Green
Write-Host "📝 Backend API: http://localhost:8080" -ForegroundColor Yellow
Write-Host "💻 Frontend: Starting Electron app..." -ForegroundColor Yellow
Write-Host ""
Write-Host "The app will start shortly. Close the Electron window to stop all services." -ForegroundColor Cyan
Write-Host ""

# Function to cleanup on exit
function Stop-Services {
    Write-Host ""
    Write-Host "🛑 Shutting down..." -ForegroundColor Yellow
    if ($BackendProcess -and -not $BackendProcess.HasExited) {
        Write-Host "Stopping backend server..." -ForegroundColor Yellow
        Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "✅ Cleanup complete" -ForegroundColor Green
}

# Register cleanup for Ctrl+C
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-Services }

try {
    # Make sure we're in the frontend directory
    Set-Location "$RootDir\frontend"
    
    # Start the Electron app (this will block until the app closes)
    npm run dev
}
finally {
    Stop-Services
    Set-Location $RootDir
}