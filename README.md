# Focused To-Do

A cross-platform desktop application for task management that lives in the system tray/menu bar. Built with modern web technologies and following Apple Human Interface Guidelines for a polished, native experience.

![Focused To-Do](https://img.shields.io/badge/Status-Ready%20to%20Use-green) ![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🎯 **Core Task Management**
- **Project Organization**: Organize tasks into projects with hierarchical structure
- **Subtasks**: Break down complex tasks into manageable subtasks
- **Priority Levels**: Set and visualize task priorities with color coding
- **Status Tracking**: Track task progress with pending, in-progress, completed, and cancelled states

### 📊 **Timeline & Planning**
- **Weekly Gantt Chart**: Professional timeline view with task duration visualization
- **Drag-and-Drop Rescheduling**: Easily reschedule tasks by dragging them to different dates
- **Smart Progress Indicators**: Visual progress tracking based on status and time logged
- **Advanced Filtering**: Filter by date ranges, overdue tasks, tasks with time logs, and more
- **Urgency Detection**: Automatic highlighting of overdue and urgent tasks

### ⏱️ **Time Tracking**
- **Built-in Timer**: Start/stop timers for accurate time tracking
- **Duration Visualization**: Compare planned vs actual time spent on tasks
- **Time Analytics**: View detailed time statistics and reports
- **Pomodoro Support**: Built-in Pomodoro timer functionality

### 🖥️ **System Integration**
- **System Tray/Menu Bar**: Quick access without cluttering your taskbar
- **Global Shortcuts**: Keyboard shortcuts for quick task creation
- **Native Notifications**: Desktop notifications for timer and task updates
- **Cross-Platform**: Runs on macOS, Windows, and Linux

### 🎨 **Design & Usability**
- **Apple Human Interface Guidelines**: Polished, native-feeling interface
- **Dark/Light Theme**: Automatic theme switching based on system preferences
- **Responsive Design**: Works well on different screen sizes
- **Smooth Animations**: Fluid transitions and interactions

### 🔒 **Privacy & Data**
- **Local Storage**: All data stored locally with SQLite - no cloud dependency
- **JSON Import/Export**: Easy backup and data portability
- **No Telemetry**: Your data stays on your device

## 🚀 Getting Started

### Option 1: Quick Start (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/focused-todo.git
   cd focused-todo
   ```

2. **Run the development setup**
   
   **On macOS/Linux:**
   ```bash
   ./dev-start.sh
   ```
   
   **On Windows (Command Prompt):**
   ```cmd
   dev-start.bat
   ```
   
   **On Windows (PowerShell):**
   ```powershell
   powershell -ExecutionPolicy Bypass -File dev-start.ps1
   ```
   
   This script will automatically:
   - Check all dependencies
   - Build shared components
   - Start the backend server
   - Launch the Electron desktop app

### Option 2: Manual Setup

If you prefer to run components separately:

1. **Install Prerequisites**
   - Node.js 18+ and npm
   - Go 1.21+
   - Git

2. **Build Shared Types**
   ```bash
   cd shared
   npm install
   npm run build
   cd ..
   ```

3. **Start Backend Server**
   ```bash
   cd backend
   make run
   # Backend will start at http://localhost:8080
   ```

4. **Start Frontend Application**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Electron app will launch automatically
   ```

### Option 3: Production Build

For a production-ready build:

**On macOS/Linux:**
```bash
./build-all.sh
```

**On Windows (Command Prompt):**
```cmd
build-all.bat
```

**On Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File build-all.ps1
```

This creates optimized builds in the `dist/` directory.

## 🖱️ How to Use

### First Launch
1. The app will appear in your system tray/menu bar
2. Click the tray icon to access the quick menu
3. Use "Show App" to open the main window
4. Create your first project to get started

### Basic Workflow
1. **Create a Project**: Click "+" in the sidebar to create a new project
2. **Add Tasks**: Select a project and click "+" to add tasks
3. **Set Due Dates**: Add due dates to see tasks in the timeline view
4. **Track Time**: Use the built-in timer to track time spent
5. **View Progress**: Switch to timeline view to see your project schedule

### Timeline View
- **Switch Views**: Toggle between List and Timeline views using the view buttons
- **Reschedule Tasks**: Drag tasks to different days to change due dates
- **Filter Tasks**: Use the filter panel to focus on specific tasks
- **Monitor Progress**: Visual indicators show task completion and urgency

### Keyboard Shortcuts
- `Cmd/Ctrl + Shift + T`: Show/hide main window
- `Cmd/Ctrl + N`: Create new task (when main window is open)
- `Cmd/Ctrl + ,`: Open preferences

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Electron + React + TypeScript
- **Backend**: Go with Gin web framework
- **Database**: SQLite with Go migrations
- **Build**: Vite for frontend, Go toolchain for backend
- **Styling**: CSS with Apple HIG design tokens

### Project Structure
```
focused-todo/
├── frontend/              # Electron + React application
│   ├── src/              # React components and logic
│   ├── electron/         # Electron main process
│   └── public/           # Static assets
├── backend/              # Go backend service
│   ├── cmd/             # Application entry points
│   ├── internal/        # Internal packages (API, storage, config)
│   └── pkg/             # Public packages (types)
├── shared/              # Shared TypeScript types
├── dev-start.sh         # Development startup script (macOS/Linux)
├── dev-start.bat        # Development startup script (Windows CMD)
├── dev-start.ps1        # Development startup script (Windows PowerShell)
├── build-all.sh         # Production build script (macOS/Linux)
├── build-all.bat        # Production build script (Windows CMD)
└── build-all.ps1        # Production build script (Windows PowerShell)
```

## 🔧 Development

### Running Tests
```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && make test

# Test with coverage
cd backend && make test-coverage
```

### Code Quality
```bash
# Frontend linting
cd frontend && npm run lint

# Backend linting
cd backend && make lint

# Format code
cd backend && make fmt
```

### Hot Reload Development
```bash
# Backend with hot reload (requires air)
cd backend && make dev-server

# Frontend hot reload
cd frontend && npm run dev
```

## 📊 Current Status

### ✅ Completed Features (Phase 1-4)
- [x] Complete project and task management
- [x] System tray integration with native menus
- [x] Apple HIG-compliant UI design
- [x] Timeline/Gantt chart view with drag-and-drop
- [x] Advanced filtering and search
- [x] Time tracking integration
- [x] Progress indicators and urgency detection
- [x] Dark/light theme support
- [x] Cross-platform compatibility

### 🚧 In Development (Phase 5+)
- [ ] Pomodoro timer integration
- [ ] AI-powered task suggestions
- [ ] Advanced analytics and reporting
- [ ] Data import/export features
- [ ] Global keyboard shortcuts customization

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with a clear description

### Development Guidelines
- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation as needed
- Ensure cross-platform compatibility

### Common Issues

**App won't start:**
- Ensure Node.js 18+ and Go 1.21+ are installed
- Try running the development script for automatic setup:
  - macOS/Linux: `./dev-start.sh`
  - Windows CMD: `dev-start.bat`
  - Windows PowerShell: `powershell -ExecutionPolicy Bypass -File dev-start.ps1`
- Check that ports 8080 and 5173 are available

**Database issues:**
- Delete the SQLite database file to reset:
  - macOS/Linux: `rm backend/focused-todo.db`
  - Windows: `del backend\focused-todo.db`
- Run database migrations: `cd backend && make db-migrate` (or `cd backend && go run .\cmd\focused-todo --migrate` on Windows)

**Build failures:**
- Clear node_modules:
  - macOS/Linux: `rm -rf frontend/node_modules && cd frontend && npm install`
  - Windows: `rmdir /s frontend\node_modules && cd frontend && npm install`
- Clean Go build cache: `cd backend && go clean -cache`

**Windows-specific issues:**
- If PowerShell execution policy blocks scripts, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- For Command Prompt, ensure you're running as Administrator if you encounter permission issues

### Getting Help
- Check the [Issues](https://github.com/yourusername/focused-todo/issues) page
- Create a new issue with detailed reproduction steps
- Include your OS, Node.js version, and Go version

## 🎯 Roadmap

See [tasks.md](tasks.md) for detailed development progress and upcoming features.

