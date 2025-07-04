# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Focused To-Do is a cross-platform desktop application (Mac, Windows, Linux) for task management that lives in the system tray/menu bar. The project is currently in the initial planning phase with no source code implemented yet.

## Architecture

The application will use:
- **Frontend**: Electron + React with Apple HIG design principles
- **Backend**: Go for performance and efficiency
- **Database**: SQLite for local data persistence
- **Communication**: IPC between Electron and Go processes

## Development Commands

Since the project is not yet initialized, you'll need to set up the development environment:

### Initial Setup
```bash
# Initialize frontend
cd frontend && npm init -y
npm install electron react react-dom

# Initialize backend
cd backend && go mod init focused-todo/backend

# Install development dependencies
npm install --save-dev @types/react @types/react-dom typescript
```

### Future Development Commands (to be implemented)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `go test ./...` - Run Go backend tests
- `npm run package` - Package for distribution

## Project Structure (Planned)

```
focused-todo/
├── frontend/           # Electron + React application
│   ├── src/           # React components and logic
│   ├── electron/      # Electron main process
│   └── public/        # Static assets
├── backend/           # Go backend service
│   ├── cmd/          # Application entry points
│   ├── internal/     # Internal packages
│   └── pkg/          # Public packages
├── shared/           # Shared types between frontend/backend
└── scripts/          # Build and deployment scripts
```

## Key Features to Implement

1. **System Tray Integration**: Platform-specific menu bar/system tray functionality
2. **Project Management**: Multiple projects with tasks and sub-tasks
3. **AI Integration**: LLM-powered task enrichment (configurable providers)
4. **Time Tracking**: Pomodoro timer and time logging
5. **Calendar View**: Weekly Gantt chart visualization
6. **Data Storage**: Local SQLite database with JSON import/export

## Design Guidelines

Follow Apple Human Interface Guidelines:
- Use SF Pro font family
- Implement iOS/macOS-style components
- Support dark/light themes
- Maintain consistent spacing and visual hierarchy

## Important Implementation Notes

- All data stored locally (no cloud sync)
- Support multiple LLM providers via API key configuration
- Implement proper IPC security between Electron and Go
- Follow platform-specific conventions for each OS
- Use native menu bar positioning on macOS
- Implement keyboard shortcuts for quick access

Refer to PRD.md for detailed product requirements and specifications.