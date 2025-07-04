import { app, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions, shell, Tray, nativeImage, globalShortcut, NativeImage, Notification } from 'electron'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

const isDev = process.env.NODE_ENV === 'development'

// Platform-specific tray icon paths
function getTrayIconPath(): string {
  const assetsPath = isDev 
    ? join(__dirname, '../../assets/icons/tray')
    : join(process.resourcesPath, 'assets/icons/tray')

  switch (process.platform) {
    case 'darwin':
      return join(assetsPath, 'tray-macos.icns')
    case 'win32':
      return join(assetsPath, 'tray-windows.ico')
    default: // linux and others
      return join(assetsPath, 'tray-linux-16.png')
  }
}

// Create platform-specific tray icon
function createTrayIcon(): NativeImage {
  try {
    const iconPath = getTrayIconPath()
    const icon = nativeImage.createFromPath(iconPath)
    
    // If icon loading fails or icon is empty, create a fallback
    if (icon.isEmpty()) {
      console.warn('Tray icon not found, using fallback')
      return createFallbackIcon()
    }
    
    // On macOS, mark as template icon for proper dark/light mode handling
    if (process.platform === 'darwin') {
      icon.setTemplateImage(true)
    }
    
    return icon
  } catch (error) {
    console.warn('Failed to load tray icon:', error)
    return createFallbackIcon()
  }
}

// Create a simple fallback icon when assets are not available
function createFallbackIcon(): NativeImage {
  // For now, return empty and log that assets are needed
  // In production, this should create a simple programmatic icon
  console.warn('Using empty tray icon - platform-specific icons need to be generated')
  return nativeImage.createEmpty()
}

// Register global keyboard shortcuts
function registerGlobalShortcuts(): void {
  // Platform-specific shortcuts for show/hide
  const shortcut = process.platform === 'darwin' ? 'Cmd+Shift+T' : 'Ctrl+Shift+T'
  
  try {
    const registered = globalShortcut.register(shortcut, () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    })
    
    if (!registered) {
      console.warn(`Failed to register global shortcut: ${shortcut}`)
    } else {
      console.log(`Global shortcut registered: ${shortcut}`)
    }
  } catch (error) {
    console.warn('Failed to register global shortcuts:', error)
  }
}

// Unregister global shortcuts
function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
}

// Platform-specific setup
function setupPlatformSpecificFeatures(): void {
  if (process.platform === 'darwin') {
    setupMacOSFeatures()
  } else if (process.platform === 'win32') {
    setupWindowsFeatures()
  } else {
    setupLinuxFeatures()
  }
}

// macOS-specific features
function setupMacOSFeatures(): void {
  // Set app to show in dock when window is visible
  app.dock?.hide() // Start hidden
  
  // Create macOS application menu
  const macMenu = Menu.buildFromTemplate([
    {
      label: app.getName(),
      submenu: [
        {
          label: 'About ' + app.getName(),
          role: 'about'
        },
        {
          type: 'separator' as const
        },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => {
            if (mainWindow) {
              mainWindow.show()
              mainWindow.focus()
              mainWindow.webContents.send('show-preferences')
            }
          }
        },
        {
          type: 'separator' as const
        },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        {
          type: 'separator' as const
        },
        {
          label: 'Hide ' + app.getName(),
          accelerator: 'Cmd+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Cmd+Alt+H',
          role: 'hideOthers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        {
          type: 'separator' as const
        },
        {
          label: 'Quit',
          accelerator: 'Cmd+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'Cmd+Z',
          role: 'undo'
        },
        {
          label: 'Redo',
          accelerator: 'Shift+Cmd+Z',
          role: 'redo'
        },
        {
          type: 'separator' as const
        },
        {
          label: 'Cut',
          accelerator: 'Cmd+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'Cmd+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'Cmd+V',
          role: 'paste'
        },
        {
          label: 'Select All',
          accelerator: 'Cmd+A',
          role: 'selectAll'
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Cmd+M',
          role: 'minimize'
        },
        {
          label: 'Close',
          accelerator: 'Cmd+W',
          click: () => {
            if (mainWindow) {
              mainWindow.hide()
            }
          }
        },
        {
          type: 'separator' as const
        },
        {
          label: 'Bring All to Front',
          role: 'front'
        }
      ]
    }
  ])
  
  Menu.setApplicationMenu(macMenu)
  
  // Handle dock icon click
  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
      app.dock?.show()
    }
  })
  
  // Note: Window event handlers will be set up after window creation
}

// Windows-specific features  
function setupWindowsFeatures(): void {
  // Windows-specific tray behavior and notifications
  // Set app user model ID for proper Windows integration
  app.setAppUserModelId('com.focusedtodo.app')
  
  // Remove default menu bar on Windows
  Menu.setApplicationMenu(null)
}

// Linux-specific features
function setupLinuxFeatures(): void {
  // Linux desktop integration
  // Remove default menu bar on Linux (using system tray instead)
  Menu.setApplicationMenu(null)
  
  // Note: Desktop file integration would be handled by the packaging process
  // and system-level .desktop files in /usr/share/applications/
}

// Show native notification
function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
      silent: false
    }).show()
  }
}

// Set up window event handlers for macOS dock integration
function setupMacOSWindowHandlers(): void {
  if (process.platform === 'darwin' && mainWindow) {
    mainWindow.on('hide', () => {
      app.dock?.hide()
    })
    
    mainWindow.on('show', () => {
      app.dock?.show()
    })
  }
}

// Task status icons for tray menu
function getTaskStatusIcon(status: string): string {
  switch (status) {
    case 'completed':
      return '✓';
    case 'in_progress':
      return '⏳';
    case 'cancelled':
      return '✗';
    default:
      return '⚪';
  }
}

// Task priority indicator
function getTaskPriorityIcon(priority: number): string {
  if (priority >= 8) return '🔴'; // High priority
  if (priority >= 5) return '🟡'; // Medium priority
  if (priority >= 2) return '🟢'; // Low priority
  return '⚪'; // No priority
}

// Enhanced tray context menu with task status indicators
interface TrayMenuData {
  recentTasks?: Array<{
    id: number;
    title: string;
    status: string;
    priority: number;
    project_id: number;
  }>;
  projects?: Array<{
    id: number;
    name: string;
    icon: string;
    taskCount: number;
    completedTasks: number;
  }>;
  activeTimeEntry?: {
    id: number;
    task_id: number;
    task_title?: string;
  } | null;
  collapsed?: {
    recentTasks: boolean;
    recentProjects: boolean;
    timeTracking: boolean;
  };
}

// Update tray context menu with dynamic content including task status indicators
function updateTrayContextMenu(data?: TrayMenuData): void {
  if (!tray) return

  const menuItems: MenuItemConstructorOptions[] = [
    {
      label: 'Focused To-Do',
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: 'Show App',
      accelerator: process.platform === 'darwin' ? 'Cmd+Shift+T' : 'Ctrl+Shift+T',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: 'Hide App',
      click: () => {
        mainWindow?.hide()
      }
    },
    {
      type: 'separator'
    },
    {
      label: '+ Quick Task',
      accelerator: process.platform === 'darwin' ? 'Cmd+N' : 'Ctrl+N',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
          mainWindow.webContents.send('focus-task-creation')
        }
      }
    }
  ]

  // Recent Tasks section with status indicators
  if (data?.recentTasks && data.recentTasks.length > 0) {
    const recentTasksSubmenu = data.recentTasks.map(task => {
      const statusIcon = getTaskStatusIcon(task.status)
      const priorityIcon = getTaskPriorityIcon(task.priority)
      
      return {
        label: `${statusIcon} ${priorityIcon} ${task.title}`,
        submenu: [
          {
            label: 'Mark as Pending',
            enabled: task.status !== 'pending',
            click: () => {
              if (mainWindow) {
                mainWindow.webContents.send('update-task-status', task.id, 'pending')
              }
            }
          },
          {
            label: 'Mark as In Progress',
            enabled: task.status !== 'in_progress',
            click: () => {
              if (mainWindow) {
                mainWindow.webContents.send('update-task-status', task.id, 'in_progress')
              }
            }
          },
          {
            label: 'Mark as Completed',
            enabled: task.status !== 'completed',
            click: () => {
              if (mainWindow) {
                mainWindow.webContents.send('update-task-status', task.id, 'completed')
              }
            }
          },
          {
            type: 'separator' as const
          },
          {
            label: 'Start Timer',
            enabled: task.status !== 'completed' && !data?.activeTimeEntry,
            click: () => {
              if (mainWindow) {
                mainWindow.webContents.send('start-task-timer', task.id)
              }
            }
          },
          {
            label: 'View Details',
            click: () => {
              if (mainWindow) {
                mainWindow.show()
                mainWindow.focus()
                mainWindow.webContents.send('view-task-details', task.id)
              }
            }
          }
        ]
      }
    })

    menuItems.push(
      {
        type: 'separator' as const
      },
      {
        label: `Recent Tasks ${data.collapsed?.recentTasks ? '▶' : '▼'}`,
        submenu: data.collapsed?.recentTasks ? [] : recentTasksSubmenu
      }
    )
  }

  // Projects section with task counts
  if (data?.projects && data.projects.length > 0) {
    const recentProjectsSubmenu = data.projects.slice(0, 5).map(project => ({
      label: `${project.icon} ${project.name} (${project.completedTasks}/${project.taskCount})`,
      submenu: [
        {
          label: 'Open Project',
          click: () => {
            if (mainWindow) {
              mainWindow.show()
              mainWindow.focus()
              mainWindow.webContents.send('open-project', project.id)
            }
          }
        },
        {
          label: 'Add Task to Project',
          click: () => {
            if (mainWindow) {
              mainWindow.show()
              mainWindow.focus()
              mainWindow.webContents.send('add-task-to-project', project.id)
            }
          }
        },
        {
          type: 'separator' as const
        },
        {
          label: `Tasks: ${project.completedTasks}/${project.taskCount} completed`,
          enabled: false
        }
      ]
    }))

    menuItems.push(
      {
        label: `Recent Projects ${data.collapsed?.recentProjects ? '▶' : '▼'}`,
        submenu: data.collapsed?.recentProjects ? [] : recentProjectsSubmenu
      }
    )
  }

  // Time tracking section
  const timeTrackingSubmenu = []
  if (data?.activeTimeEntry) {
    const taskTitle = data.activeTimeEntry.task_title || 'Unknown Task'
    timeTrackingSubmenu.push(
      {
        label: `⏱️ Timer Running: ${taskTitle}`,
        enabled: false
      },
      {
        label: '⏹️ Stop Timer',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('stop-timer', data.activeTimeEntry?.id)
          }
        }
      }
    )
  } else {
    timeTrackingSubmenu.push({
      label: '⏱️ No Active Timer',
      enabled: false
    })
  }

  if (timeTrackingSubmenu.length > 0) {
    menuItems.push(
      {
        type: 'separator' as const
      },
      {
        label: `Time Tracking ${data?.collapsed?.timeTracking ? '▶' : '▼'}`,
        submenu: data?.collapsed?.timeTracking ? [] : timeTrackingSubmenu
      }
    )
  }

  // Final actions
  menuItems.push(
    {
      type: 'separator'
    },
    {
      label: 'Preferences',
      accelerator: process.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
          mainWindow.webContents.send('show-preferences')
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit Focused To-Do',
      accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
      click: () => {
        app.quit()
      }
    }
  )

  const contextMenu = Menu.buildFromTemplate(menuItems)
  tray.setContextMenu(contextMenu)
}

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 20, y: 20 },
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the app
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../react/index.html'))
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Hide to system tray instead of closing
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      app.hide()
    } else {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray(): void {
  // Create platform-specific tray icon
  const trayIcon = createTrayIcon()
  tray = new Tray(trayIcon)
  
  // Set tooltip
  tray.setToolTip('Focused To-Do - Your tasks, simplified')
  
  // Initialize with default context menu
  updateTrayContextMenu()
  
  // Platform-specific click behavior
  if (process.platform === 'darwin') {
    // On macOS, only respond to right-click (context menu)
    // Left click is handled by the context menu automatically
  } else {
    // On Windows/Linux, handle left click to show/hide window
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    })
  }

  // Handle double-click on all platforms
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  app.setAppUserModelId('com.focusedtodo.app')

  // IPC handlers
  ipcMain.handle('ping', () => 'pong')
  
  ipcMain.handle('get-backend-url', () => {
    return process.env.BACKEND_URL || 'http://localhost:8080'
  })

  // Window control handlers
  ipcMain.handle('minimize-window', () => {
    if (mainWindow) {
      mainWindow.minimize()
    }
  })

  ipcMain.handle('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.restore()
      } else {
        mainWindow.maximize()
      }
    }
  })

  ipcMain.handle('close-window', () => {
    if (mainWindow) {
      mainWindow.hide()
    }
  })

  // System tray handlers
  ipcMain.handle('show-in-tray', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  ipcMain.handle('hide-from-tray', () => {
    if (mainWindow) {
      mainWindow.hide()
    }
  })

  // Global shortcut handlers
  ipcMain.handle('get-global-shortcut', () => {
    return process.platform === 'darwin' ? 'Cmd+Shift+T' : 'Ctrl+Shift+T'
  })

  // Tray context menu update handlers  
  ipcMain.handle('update-tray-menu', (_, projects) => {
    // This will be used to dynamically update the recent projects menu
    if (tray) {
      updateTrayContextMenu(projects)
    }
  })

  // Notification handlers
  ipcMain.handle('show-notification', (_, title: string, body: string) => {
    showNotification(title, body)
  })

  setupPlatformSpecificFeatures()
  createWindow()
  setupMacOSWindowHandlers() // Set up platform-specific window handlers
  createTray()
  registerGlobalShortcuts()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // Clean up global shortcuts
  unregisterGlobalShortcuts()
  
  // Clean up tray
  if (tray) {
    tray.destroy()
    tray = null
  }
})

// Security: prevent navigation to external URLs
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    
    if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'http://localhost:8080') {
      navigationEvent.preventDefault()
    }
  })
})