# Icon Generation Required

The following platform-specific icon files need to be generated from `tray-icon-source.svg`:

## Files to Generate

### macOS Template Icon
- **File**: `tray-macos.icns`
- **Requirements**: 
  - Convert SVG to black template icon with transparency
  - Include 16x16 and 32x32 (Retina) variants
  - Use `iconutil` to create .icns from .iconset

### Windows Multi-Size Icon  
- **File**: `tray-windows.ico`
- **Requirements**:
  - Multi-resolution .ico file with 16x16, 20x20, 24x24, 32x32
  - Use appropriate colors for Windows system tray
  - Consider both light and dark Windows themes

### Linux PNG Icons
- **Files**: 
  - `tray-linux-16.png` (16x16)
  - `tray-linux-22.png` (22x22) 
  - `tray-linux-24.png` (24x24)
- **Requirements**:
  - High contrast design
  - PNG format with transparency
  - Follow freedesktop.org specifications

## Generation Commands

### macOS
```bash
# Convert SVG to template icon
inkscape --export-png=tray-template.png --export-width=16 --export-height=16 tray-icon-source.svg
# Create iconset and convert to icns
mkdir tray-macos.iconset
cp tray-template.png tray-macos.iconset/icon_16x16.png
# ... (add other sizes)
iconutil -c icns tray-macos.iconset
```

### Windows
```bash
# Convert SVG to multiple PNG sizes then combine to ICO
magick convert tray-icon-source.svg -resize 16x16 tray-16.png
magick convert tray-icon-source.svg -resize 20x20 tray-20.png
magick convert tray-icon-source.svg -resize 24x24 tray-24.png
magick convert tray-icon-source.svg -resize 32x32 tray-32.png
magick convert tray-16.png tray-20.png tray-24.png tray-32.png tray-windows.ico
```

### Linux
```bash
# Convert SVG to PNG at different sizes
inkscape --export-png=tray-linux-16.png --export-width=16 --export-height=16 tray-icon-source.svg
inkscape --export-png=tray-linux-22.png --export-width=22 --export-height=22 tray-icon-source.svg  
inkscape --export-png=tray-linux-24.png --export-width=24 --export-height=24 tray-icon-source.svg
```

## Integration

Once generated, these icons will be loaded by the updated `createTray()` function in `/frontend/electron/main.ts`.

## Placeholder Status

Currently using placeholder/fallback icons until actual binary assets are generated from the source SVG.