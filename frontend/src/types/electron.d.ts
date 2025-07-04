// Type definitions for Electron API
export interface ElectronAPI {
  // Utility functions
  ping: () => Promise<string>
  
  // Backend communication
  getBackendUrl: () => Promise<string>
  
  // Window controls
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  
  // System tray
  showInTray: () => Promise<void>
  hideFromTray: () => Promise<void>
  updateTrayMenu: (data?: any) => Promise<void>
  
  // Global shortcuts
  getGlobalShortcut: () => Promise<string>
  
  // Notifications
  showNotification: (title: string, body: string) => Promise<void>
  
  // App lifecycle
  onAppReady: (callback: () => void) => void
  onWindowShow: (callback: () => void) => void
  onWindowHide: (callback: () => void) => void
  
  // Tray interactions
  onFocusTaskCreation: (callback: () => void) => void
  onShowPreferences: (callback: () => void) => void
  onOpenProject: (callback: (projectId: number) => void) => void
  
  // Task management interactions
  onUpdateTaskStatus: (callback: (taskId: number, status: string) => void) => void
  onStartTaskTimer: (callback: (taskId: number) => void) => void
  onStopTimer: (callback: (timeEntryId: number) => void) => void
  onViewTaskDetails: (callback: (taskId: number) => void) => void
  onAddTaskToProject: (callback: (projectId: number) => void) => void
  
  // Remove listeners
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}