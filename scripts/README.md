# Scripts Directory

This directory contains all project scripts organized by purpose.

## Directory Structure

```
scripts/
├── development/     # Development and build scripts
├── testing/         # Test execution scripts
└── README.md       # This file
```

## Development Scripts (`./scripts/development/`)

These scripts help with building, running, and debugging the application during development.

### Main Development Scripts
- **`dev-start.ps1`** / **`dev-start.sh`** - Start the complete development environment (backend + frontend + Electron)
- **`build-all.ps1`** / **`build-all.sh`** - Build all components (backend, frontend, shared types)

### Debugging Scripts  
- **`debug-window.ps1`** - Debug Electron window issues
- **`launch-electron.ps1`** - Launch Electron app independently
- **`show-window.ps1`** - Show/debug window state
- **`start-dev.ps1`** - Alternative development startup script

## Testing Scripts (`./scripts/testing/`)

These scripts run various types of tests to ensure application quality.

### Comprehensive Test Runners
- **`test-all.ps1`** / **`test-all.sh`** - Run all tests (backend, frontend, integration, linting)
- **`integration-tests.ps1`** / **`integration-tests.sh`** - End-to-end API integration tests

### Component-Specific Tests
- **`test-backend.ps1`** - Backend Go tests only
- **`test-electron.ps1`** - Electron-specific tests
- **`test-react-load.ps1`** - Frontend React loading tests

## Usage Examples

### Start Development Environment
```bash
# Linux/macOS
./scripts/development/dev-start.sh

# Windows
.\scripts\development\dev-start.ps1
```

### Run All Tests
```bash
# Linux/macOS
./scripts/testing/test-all.sh --coverage --verbose

# Windows  
.\scripts\testing\test-all.ps1 -Coverage -Verbose
```

### Run Integration Tests
```bash
# Linux/macOS
./scripts/testing/integration-tests.sh --verbose

# Windows
.\scripts\testing\integration-tests.ps1 -Verbose
```

## Platform Support

- **PowerShell scripts (`.ps1`)** - Windows, Linux (with PowerShell Core), macOS
- **Bash scripts (`.sh`)** - Linux, macOS, WSL

Both script types provide equivalent functionality for cross-platform development.

## Contributing

When adding new scripts:

1. Place them in the appropriate subdirectory (`development/` or `testing/`)
2. Provide both PowerShell and Bash versions when possible
3. Make scripts executable: `chmod +x script-name.sh`
4. Update this README with script descriptions
5. Follow existing naming conventions

## Quick Reference

| Task | Linux/macOS | Windows |
|------|-------------|---------|
| Start dev environment | `./scripts/development/dev-start.sh` | `.\scripts\development\dev-start.ps1` |
| Run all tests | `./scripts/testing/test-all.sh` | `.\scripts\testing\test-all.ps1` |
| Integration tests | `./scripts/testing/integration-tests.sh` | `.\scripts\testing\integration-tests.ps1` |
| Backend tests only | N/A | `.\scripts\testing\test-backend.ps1` |
| Build everything | `./scripts/development/build-all.sh` | `.\scripts\development\build-all.ps1` |