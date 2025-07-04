import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { AppProvider } from './context/AppContext'

// Mock fetch globally for this test file
beforeEach(() => {
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.resetAllMocks()
})

// Test wrapper component
const TestAppWrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>
    {children}
  </AppProvider>
)

describe('App Component', () => {
  test('renders app title', () => {
    render(<App />, { wrapper: TestAppWrapper })
    expect(screen.getByText('Focused To-Do')).toBeInTheDocument()
    expect(screen.getByText('A cross-platform task management application')).toBeInTheDocument()
  })

  test('renders system status section', () => {
    render(<App />, { wrapper: TestAppWrapper })
    expect(screen.getByText('System Status')).toBeInTheDocument()
    expect(screen.getByText('Backend:')).toBeInTheDocument()
    expect(screen.getByText('Backend URL:')).toBeInTheDocument()
  })

  test('renders planned features section', () => {
    render(<App />, { wrapper: TestAppWrapper })
    expect(screen.getByText('Planned Features')).toBeInTheDocument()
    expect(screen.getByText('🏗️ Project Management')).toBeInTheDocument()
    expect(screen.getByText('⏰ Time Tracking')).toBeInTheDocument()
    expect(screen.getByText('🤖 AI Integration')).toBeInTheDocument()
    expect(screen.getByText('📊 Calendar View')).toBeInTheDocument()
  })

  test('shows backend connecting status initially', () => {
    render(<App />, { wrapper: TestAppWrapper })
    expect(screen.getByText('Connecting...')).toBeInTheDocument()
  })

  test('handles successful backend connection', async () => {
    // Mock successful fetch response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ok', timestamp: Date.now() })
    })

    await act(async () => {
      render(<App />, { wrapper: TestAppWrapper })
    })

    await waitFor(() => {
      expect(screen.getByText('✓ Connected')).toBeInTheDocument()
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(screen.getByText('http://localhost:8080')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('handles backend connection failure', async () => {
    // Mock failed fetch response
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'))

    await act(async () => {
      render(<App />, { wrapper: TestAppWrapper })
    })

    await waitFor(() => {
      expect(screen.getByText('✗ Disconnected')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('electron API test button works', async () => {
    const user = userEvent.setup()
    
    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    render(<App />, { wrapper: TestAppWrapper })

    const testButton = screen.getByRole('button', { name: /test electron api/i })
    await user.click(testButton)

    expect(window.electronAPI?.ping).toHaveBeenCalled()
    expect(alertSpy).toHaveBeenCalledWith('Electron API response: pong')

    alertSpy.mockRestore()
  })

  test('displays correct backend URL from electron API', async () => {
    // Mock successful fetch to avoid connection error
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ok', timestamp: Date.now() })
    })

    await act(async () => {
      render(<App />, { wrapper: TestAppWrapper })
    })

    await waitFor(() => {
      expect(window.electronAPI?.getBackendUrl).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText('http://localhost:8080')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('App Component - Error Handling', () => {
  test('handles electron API not available', async () => {
    // Temporarily remove electronAPI
    const originalElectronAPI = window.electronAPI
    delete (window as any).electronAPI

    const user = userEvent.setup()
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    render(<App />, { wrapper: TestAppWrapper })

    const testButton = screen.getByRole('button', { name: /test electron api/i })
    await user.click(testButton)

    expect(alertSpy).toHaveBeenCalledWith('Electron API not available (running in browser)')

    // Restore electronAPI
    window.electronAPI = originalElectronAPI as any
    alertSpy.mockRestore()
  })
})