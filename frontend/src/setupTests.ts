// Jest testing setup
import '@testing-library/jest-dom'

// Mock Electron API for tests
const mockElectronAPI = {
  ping: jest.fn().mockResolvedValue('pong'),
  getBackendUrl: jest.fn().mockResolvedValue('http://localhost:8080'),
  minimize: jest.fn().mockResolvedValue(undefined),
  maximize: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  showInTray: jest.fn().mockResolvedValue(undefined),
  hideFromTray: jest.fn().mockResolvedValue(undefined),
  onAppReady: jest.fn(),
  onWindowShow: jest.fn(),
  onWindowHide: jest.fn(),
  removeAllListeners: jest.fn()
}

// Global mock for window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

// Mock fetch for API calls
global.fetch = jest.fn()

// Suppress console.error for cleaner test output
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})