# Windows Setup Guide for Focused To-Do

This guide helps Windows users get Focused To-Do running quickly.

## 🔧 Prerequisites

### 1. Install Node.js
- Download from: https://nodejs.org/
- Choose the "LTS" version (18.x or later)
- Run the installer and follow the default options
- Restart your command prompt/PowerShell after installation

### 2. Install Go
- Download from: https://golang.org/dl/
- Choose the "Microsoft Windows" version for your architecture (usually amd64)
- Run the installer and follow the default options
- Restart your command prompt/PowerShell after installation

### 3. Install Git (if not already installed)
- Download from: https://git-scm.com/download/win
- Use default options during installation

## 🚀 Quick Start Options

### Option A: Command Prompt (Recommended for Beginners)

1. **Open Command Prompt**
   - Press `Win + R`, type `cmd`, press Enter

2. **Clone and run the app**
   ```cmd
   git clone https://github.com/yourusername/focused-todo.git
   cd focused-todo
   dev-start.bat
   ```

### Option B: PowerShell (Recommended for Advanced Users)

1. **Open PowerShell**
   - Press `Win + X`, select "Windows PowerShell" or "Terminal"

2. **Allow script execution (one-time setup)**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Clone and run the app**
   ```powershell
   git clone https://github.com/yourusername/focused-todo.git
   cd focused-todo
   powershell -ExecutionPolicy Bypass -File dev-start.ps1
   ```

## 🎯 What Each Script Does

### Development Scripts (`dev-start.bat` / `dev-start.ps1`)
- ✅ Checks that Node.js and Go are installed
- 🔧 Builds shared TypeScript components
- 🔴 Starts the backend server (Go)
- 🟢 Starts the Electron desktop app (React)
- 🧹 Automatically cleans up when you close the app

### Production Build Scripts (`build-all.bat` / `build-all.ps1`)
- 🏗️ Creates optimized builds for distribution
- 📦 Packages the Electron app for Windows
- 💾 Creates standalone executables in the `dist/` folder

## 🛠️ Troubleshooting

### "Command not found" errors
- **Node.js/npm not found**: Restart your terminal after installing Node.js
- **Go not found**: Restart your terminal after installing Go
- **Git not found**: Install Git from https://git-scm.com/download/win

### PowerShell execution policy errors
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port conflicts (app won't start)
- Close any applications using ports 8080 or 5173
- Or kill processes using these ports:
  ```cmd
  netstat -ano | findstr :8080
  taskkill /PID [PID_NUMBER] /F
  ```

### Permission errors
- Run Command Prompt or PowerShell as Administrator
- Right-click on the terminal icon and select "Run as administrator"

### Build failures
1. **Clear npm cache:**
   ```cmd
   cd frontend
   rmdir /s node_modules
   npm install
   ```

2. **Clear Go build cache:**
   ```cmd
   cd backend
   go clean -cache
   go mod download
   ```

## 💡 Tips for Windows Users

### Using Windows Terminal (Modern)
- Install from Microsoft Store: "Windows Terminal"
- Better experience than traditional Command Prompt
- Supports tabs and modern features

### Using VS Code
- Great for development if you want to explore the code
- Install the Go and TypeScript extensions
- Open the project folder: `code .`

### File Explorer Integration
- After cloning, you can navigate to the folder in File Explorer
- Right-click in the folder → "Open PowerShell window here"
- Then run: `.\dev-start.ps1`

## 🎉 Success!

If everything works correctly, you should see:
1. A command prompt window with backend logs
2. The Focused To-Do desktop application window
3. A system tray icon for quick access

The app will automatically:
- Create a SQLite database for your tasks
- Start listening on http://localhost:8080 for the API
- Open the Electron desktop interface

## 📞 Need Help?

- Check the main [README.md](README.md) for general documentation
- Report issues at: https://github.com/yourusername/focused-todo/issues
- Include your Windows version, Node.js version, and Go version when reporting issues