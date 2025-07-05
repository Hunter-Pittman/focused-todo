# Focused To-Do Production Build Script for Windows PowerShell
# Run with: powershell -ExecutionPolicy Bypass -File build-all.ps1

Write-Host "🏗️ Building Focused To-Do for Production" -ForegroundColor Green

# Find the project root directory (where CLAUDE.md is located)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = $null

# Search upward from script directory to find project root
$currentDir = $ScriptDir
while ($currentDir -ne $null -and $currentDir -ne "") {
    if (Test-Path (Join-Path $currentDir "CLAUDE.md")) {
        $ProjectRoot = $currentDir
        break
    }
    $parent = Split-Path -Parent $currentDir
    if ($parent -eq $currentDir) {
        # We've reached the root directory
        break
    }
    $currentDir = $parent
}

if ($ProjectRoot -eq $null) {
    Write-Host "❌ Could not find project root (CLAUDE.md not found)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "📁 Project root: $ProjectRoot" -ForegroundColor Gray
Set-Location $ProjectRoot

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

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Cyan
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
New-Item -ItemType Directory -Path "dist" | Out-Null

# Build the shared types first
Write-Host "🔧 Building shared types..." -ForegroundColor Cyan
Set-Location "shared"
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
}
catch {
    Write-Host "❌ Failed to build shared types: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ".."

# Build the backend for production
Write-Host "🔧 Building backend for production..." -ForegroundColor Cyan
Set-Location "backend"
try {
    go build -ldflags="-s -w" -trimpath -o "bin\focused-todo.exe" ".\cmd\focused-todo"
    if ($LASTEXITCODE -ne 0) { throw "Go build failed" }
    Copy-Item "bin\focused-todo.exe" "..\dist\"
}
catch {
    Write-Host "❌ Failed to build backend: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ".."

# Build the frontend
Write-Host "🔧 Building frontend..." -ForegroundColor Cyan
Set-Location "frontend"
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
}
catch {
    Write-Host "❌ Failed to build frontend: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Package the Electron app for Windows
Write-Host "📦 Packaging Electron application for Windows..." -ForegroundColor Cyan
try {
    npm run package:win
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Electron packaging failed, but React build succeeded" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Electron packaging completed successfully" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️ Electron packaging encountered issues: $_" -ForegroundColor Yellow
}
Set-Location ".."

Write-Host ""
Write-Host "🎉 Build complete!" -ForegroundColor Green
Write-Host "📁 Backend binary: dist\focused-todo.exe" -ForegroundColor Yellow
Write-Host "📁 Frontend React build: frontend\dist\" -ForegroundColor Yellow
Write-Host "📁 Electron app: frontend\dist\ (if packaging succeeded)" -ForegroundColor Yellow
Write-Host ""
Write-Host "To run the production build:" -ForegroundColor Cyan
Write-Host "1. Start the backend: .\dist\focused-todo.exe" -ForegroundColor White
Write-Host "2. The Electron app will be in frontend\dist\" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"