# Linux Desktop Integration

This directory contains files for proper Linux desktop environment integration.

## Desktop File

`focused-todo.desktop` - Standard freedesktop.org desktop entry file for system integration.

### Installation

The desktop file should be installed to:
- System-wide: `/usr/share/applications/focused-todo.desktop`
- User-specific: `~/.local/share/applications/focused-todo.desktop`

### Features

- Appears in application menus and launchers
- Supports quick actions (Quick Task, Show App)
- Proper categorization for office/productivity applications
- MIME type association for future file format support
- Keywords for search functionality

### Icon Requirements

The desktop file references these icon names:
- `focused-todo` - Main application icon
- `focused-todo-add` - Icon for quick task action

These should be installed to the system icon theme directories:
- `/usr/share/icons/hicolor/{size}/apps/focused-todo.{png,svg}`
- `~/.local/share/icons/hicolor/{size}/apps/focused-todo.{png,svg}`

Standard sizes: 16x16, 22x22, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256

### System Tray Integration

Linux system tray support varies by desktop environment:

- **GNOME**: Uses StatusNotifierItem/AppIndicator
- **KDE Plasma**: Native system tray support
- **XFCE**: Panel plugin for system tray
- **i3/Sway**: Status bar integration

The application handles these automatically through Electron's Tray API.

### Autostart

For auto-start functionality, a symlink or copy should be placed in:
- System-wide: `/etc/xdg/autostart/focused-todo.desktop`
- User-specific: `~/.config/autostart/focused-todo.desktop`

Add `Hidden=true` by default and let users enable through preferences.

### Build Integration

The electron-builder configuration should include:
```json
{
  "linux": {
    "desktop": {
      "Name": "Focused To-Do",
      "Comment": "Your tasks, simplified",
      "Categories": "Office;ProjectManagement;GTD"
    }
  }
}
```

### Testing

Test desktop integration on major distributions:
- Ubuntu/Debian (GNOME, Unity)
- Fedora (GNOME, KDE)
- Arch Linux (KDE, XFCE, i3)
- openSUSE (KDE, GNOME)

Verify:
- Application appears in menus
- System tray functionality works
- Quick actions function correctly
- Icons display properly at all sizes
- File associations work (if implemented)