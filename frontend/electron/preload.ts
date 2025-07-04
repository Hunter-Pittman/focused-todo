import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  // Utility functions
  ping: () => ipcRenderer.invoke('ping'),
  
  // Backend communication
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  
  // Window controls
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window'),
  
  // System tray
  showInTray: () => ipcRenderer.invoke('show-in-tray'),
  hideFromTray: () => ipcRenderer.invoke('hide-from-tray'),
  updateTrayMenu: (projects?: any[]) => ipcRenderer.invoke('update-tray-menu', projects),
  
  // Global shortcuts
  getGlobalShortcut: () => ipcRenderer.invoke('get-global-shortcut'),
  
  // Notifications
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),
  
  // App lifecycle
  onAppReady: (callback: () => void) => {
    ipcRenderer.on('app-ready', callback)
  },
  
  onWindowShow: (callback: () => void) => {
    ipcRenderer.on('window-show', callback)
  },
  
  onWindowHide: (callback: () => void) => {
    ipcRenderer.on('window-hide', callback)
  },
  
  // Tray interactions
  onFocusTaskCreation: (callback: () => void) => {
    ipcRenderer.on('focus-task-creation', callback)
  },
  
  onShowPreferences: (callback: () => void) => {
    ipcRenderer.on('show-preferences', callback)
  },
  
  onOpenProject: (callback: (projectId: number) => void) => {
    ipcRenderer.on('open-project', (_, projectId) => callback(projectId))
  },

  // Task management interactions
  onUpdateTaskStatus: (callback: (taskId: number, status: string) => void) => {
    ipcRenderer.on('update-task-status', (_, taskId, status) => callback(taskId, status))
  },

  onStartTaskTimer: (callback: (taskId: number) => void) => {
    ipcRenderer.on('start-task-timer', (_, taskId) => callback(taskId))
  },

  onStopTimer: (callback: (timeEntryId: number) => void) => {
    ipcRenderer.on('stop-timer', (_, timeEntryId) => callback(timeEntryId))
  },

  onViewTaskDetails: (callback: (taskId: number) => void) => {
    ipcRenderer.on('view-task-details', (_, taskId) => callback(taskId))
  },

  onAddTaskToProject: (callback: (projectId: number) => void) => {
    ipcRenderer.on('add-task-to-project', (_, projectId) => callback(projectId))
  },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', api)

// Types for the exposed API
declare global {
  interface Window {
    electronAPI: typeof api
  }
}

export type ElectronAPI = typeof api