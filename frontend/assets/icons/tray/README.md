# System Tray Icons

This directory contains platform-specific system tray icons for the Focused To-Do application.

## Required Icon Files

### macOS (.icns)
- `tray-macos.icns` - Template icon for macOS menu bar
  - Should be a template icon (black with transparency)
  - macOS will automatically handle dark/light mode variants
  - Recommended sizes: 16x16, 32x32 (for Retina)
  - Must follow Apple's template icon guidelines

### Windows (.ico)
- `tray-windows.ico` - Multi-resolution icon for Windows system tray
  - Should contain multiple sizes: 16x16, 20x20, 24x24, 32x32
  - Use Windows system tray color guidelines
  - Should be visible on both light and dark backgrounds

### Linux (.png)
- `tray-linux-16.png` - 16x16 icon for standard DPI
- `tray-linux-22.png` - 22x22 icon for high DPI
- `tray-linux-24.png` - 24x24 icon for extra high DPI
- Should follow freedesktop.org icon theme specification
- Use monochrome or high contrast design

## Design Guidelines

### Visual Design
- Use the app's logo/brand identity
- Keep it simple and recognizable at small sizes
- Ensure readability at 16x16 pixels minimum
- Consider platform-specific styling conventions

### Color Guidelines
- **macOS**: Use template icon (black with alpha channel)
- **Windows**: Use colors that work on light/dark backgrounds
- **Linux**: High contrast design, consider system theme integration

## Implementation

These icons are loaded in `/frontend/electron/main.ts` in the `createTray()` function with platform-specific logic.

## Icon Creation Tools

Recommended tools for creating these icons:
- **macOS**: Use Icon Composer or iconutil command line tool
- **Windows**: Use GIMP, Paint.NET, or Icon Workshop
- **Linux**: Use GIMP, Inkscape, or other image editors