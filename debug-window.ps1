# Debug script to find and show the Electron window
Write-Host "[DEBUG] Looking for Electron window..." -ForegroundColor Cyan

# Find Electron processes
Write-Host "`n[PROCESSES] Checking for Electron processes:" -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*electron*" -or $_.ProcessName -like "*focused-todo*" } | Format-Table Id, ProcessName, MainWindowTitle

# Try to bring window to front using Windows API
Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class Win32 {
        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr hWnd);
    }
"@

# Find all Electron windows
$electronProcesses = Get-Process | Where-Object { $_.ProcessName -like "*electron*" -or $_.ProcessName -like "*focused-todo*" }

foreach ($proc in $electronProcesses) {
    if ($proc.MainWindowHandle -ne 0) {
        Write-Host "`n[WINDOW FOUND] Process: $($proc.ProcessName) - Title: $($proc.MainWindowTitle)" -ForegroundColor Green
        Write-Host "Window Handle: $($proc.MainWindowHandle)" -ForegroundColor Gray
        
        # Check if window is visible
        $isVisible = [Win32]::IsWindowVisible($proc.MainWindowHandle)
        Write-Host "Is Visible: $isVisible" -ForegroundColor Gray
        
        # Try to show and bring to front
        Write-Host "Attempting to show window..." -ForegroundColor Yellow
        [Win32]::ShowWindow($proc.MainWindowHandle, 5) # SW_SHOW
        [Win32]::SetForegroundWindow($proc.MainWindowHandle)
    }
}

Write-Host "`n[TIPS] If no window was found:" -ForegroundColor Yellow
Write-Host "1. The app might be running in tray-only mode" -ForegroundColor Gray
Write-Host "2. Try pressing Ctrl+Shift+T (the global hotkey)" -ForegroundColor Gray
Write-Host "3. Check system tray for any icons (even blank ones)" -ForegroundColor Gray
Write-Host "4. The window might be off-screen" -ForegroundColor Gray

# Check if ports are actually in use
Write-Host "`n[PORTS] Checking if services are running:" -ForegroundColor Yellow
try {
    $backend = Test-NetConnection -ComputerName localhost -Port 8080 -InformationLevel Quiet
    Write-Host "Backend (8080): $(if($backend){'Running'}else{'Not running'})" -ForegroundColor $(if($backend){'Green'}else{'Red'})
} catch {
    Write-Host "Backend (8080): Unable to check" -ForegroundColor Gray
}

try {
    $frontend = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet
    Write-Host "Frontend (5173): $(if($frontend){'Running'}else{'Not running'})" -ForegroundColor $(if($frontend){'Green'}else{'Red'})
} catch {
    Write-Host "Frontend (5173): Unable to check" -ForegroundColor Gray
}