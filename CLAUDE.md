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

The application is fully implemented and ready for development. Use these commands:

### Main Development Commands
```bash
# Start complete development environment (backend + frontend + Electron)
./dev-start.sh                    # Linux/macOS
.\scripts\development\dev-start.ps1   # Windows

# Run all tests (backend, frontend, integration, linting)
./test-all.sh --coverage --verbose    # Linux/macOS
.\scripts\testing\test-all.ps1 -Coverage -Verbose  # Windows

# Run integration tests
./integration-tests.sh --verbose      # Linux/macOS
.\scripts\testing\integration-tests.ps1 -Verbose   # Windows

# Build all components
./scripts/development/build-all.sh    # Linux/macOS
.\scripts\development\build-all.ps1   # Windows
```

### Component-Specific Commands
```bash
# Backend only
cd backend && go test ./...           # Run Go tests
cd backend && go build ./cmd/focused-todo  # Build backend

# Frontend only
cd frontend && npm test               # Run React tests
cd frontend && npm run dev            # Start Vite dev server
cd frontend && npm run build          # Build for production

# Shared types
cd shared && npm run build            # Build TypeScript types
```

### Script Organization
All scripts are organized in the `scripts/` directory:
- `scripts/development/` - Development and build scripts
- `scripts/testing/` - Test execution scripts
- Root directory contains convenience wrappers for common commands

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