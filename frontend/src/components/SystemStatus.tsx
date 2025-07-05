import React, { useState, useEffect } from 'react'
import './SystemStatus.css'

interface HealthResponse {
  status: string
  timestamp: number
}

interface SystemStatusProps {
  className?: string
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ className = '' }) => {
  const [backendUrl, setBackendUrl] = useState<string>('')
  const [backendStatus, setBackendStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [electronStatus, setElectronStatus] = useState<'loading' | 'available' | 'unavailable'>('loading')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  // Check Electron API availability with retry logic
  useEffect(() => {
    let retryCount = 0
    const maxRetries = 50 // 5 seconds total (50 * 100ms)
    let retryTimer: NodeJS.Timeout

    const checkElectronAPI = (): void => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.log('Electron API detected after', retryCount, 'retries')
        setElectronStatus('available')
        return
      }

      retryCount++
      if (retryCount < maxRetries) {
        retryTimer = setTimeout(checkElectronAPI, 100)
      } else {
        // After max retries, assume we're running in browser/development
        console.log('Electron API not detected after', maxRetries, 'retries')
        setElectronStatus('unavailable')
      }
    }

    // Start checking immediately
    checkElectronAPI()

    // Cleanup timer on unmount
    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
    }
  }, [])

  // Get backend URL and test connection
  useEffect(() => {
    const initializeBackend = async (): Promise<void> => {
      try {
        let url: string
        
        if (window.electronAPI) {
          url = await window.electronAPI.getBackendUrl()
        } else {
          // Fallback for development in browser
          url = 'http://localhost:8080'
        }
        
        setBackendUrl(url)
        await testBackendConnection(url)
      } catch (error) {
        console.error('Failed to initialize backend connection:', error)
        setBackendStatus('error')
      }
    }

    initializeBackend()
  }, [])

  const testBackendConnection = async (url: string): Promise<void> => {
    try {
      setBackendStatus('loading')
      const response = await fetch(`${url}/api/health`)
      
      if (response.ok) {
        const data: HealthResponse = await response.json()
        if (data.status === 'ok') {
          setBackendStatus('connected')
          setLastCheck(new Date())
        } else {
          setBackendStatus('error')
        }
      } else {
        setBackendStatus('error')
      }
    } catch (error) {
      console.error('Backend connection test failed:', error)
      setBackendStatus('error')
    }
  }

  const handleRefreshConnection = (): void => {
    if (backendUrl) {
      testBackendConnection(backendUrl)
    }
  }

  const handleTestElectronAPI = async (): Promise<void> => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.ping()
        alert(`Electron API Response: ${result}`)
      } else {
        alert('Electron API not available (running in browser)')
      }
    } catch (error) {
      console.error('Electron API test failed:', error)
      alert('Electron API test failed')
    }
  }

  const handleToggleWindow = async (): Promise<void> => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.hideFromTray()
        setTimeout(async () => {
          if (window.electronAPI) {
            await window.electronAPI.showInTray()
          }
        }, 2000)
      }
    } catch (error) {
      console.error('Window toggle failed:', error)
    }
  }

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'connected':
      case 'available':
        return '✅'
      case 'loading':
        return '🔄'
      case 'error':
      case 'unavailable':
        return '❌'
      default:
        return '❓'
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'connected':
        return 'Connected'
      case 'available':
        return 'Available'
      case 'loading':
        return 'Connecting...'
      case 'error':
        return 'Disconnected'
      case 'unavailable':
        return 'Unavailable'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className={`system-status ${className}`}>
      <div className="status-header">
        <h2>System Status</h2>
        <button 
          className="refresh-button"
          onClick={handleRefreshConnection}
          disabled={backendStatus === 'loading'}
          title="Refresh connection"
        >
          🔄
        </button>
      </div>

      <div className="status-grid">
        <div className="status-item">
          <div className="status-info">
            <span className="status-label">Backend Server:</span>
            <div className="status-details">
              <span className={`status-value ${backendStatus}`}>
                {getStatusIcon(backendStatus)} {getStatusText(backendStatus)}
              </span>
              {lastCheck && (
                <span className="last-check">
                  Last check: {lastCheck.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="status-item">
          <div className="status-info">
            <span className="status-label">Backend URL:</span>
            <span className="status-value url">
              {backendUrl || 'Loading...'}
            </span>
          </div>
        </div>

        <div className="status-item">
          <div className="status-info">
            <span className="status-label">Electron API:</span>
            <span className={`status-value ${electronStatus}`}>
              {getStatusIcon(electronStatus)} {getStatusText(electronStatus)}
            </span>
          </div>
        </div>
      </div>

      <div className="actions-section">
        <h3>IPC Communication Tests</h3>
        <div className="action-buttons">
          <button 
            className="action-button"
            onClick={handleTestElectronAPI}
            disabled={electronStatus !== 'available'}
          >
            Test Electron API
          </button>
          
          <button 
            className="action-button"
            onClick={handleToggleWindow}
            disabled={electronStatus !== 'available'}
          >
            Test Window Hide/Show
          </button>
        </div>
      </div>
    </div>
  )
}