import React from 'react'
import { ThemeToggle } from './ui'
import './WindowControls.css'

interface WindowControlsProps {
  className?: string
}

export const WindowControls: React.FC<WindowControlsProps> = ({ className = '' }) => {
  const handleMinimize = async (): Promise<void> => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.minimize()
      }
    } catch (error) {
      console.error('Failed to minimize window:', error)
    }
  }

  const handleMaximize = async (): Promise<void> => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.maximize()
      }
    } catch (error) {
      console.error('Failed to maximize window:', error)
    }
  }

  const handleClose = async (): Promise<void> => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.close()
      }
    } catch (error) {
      console.error('Failed to close window:', error)
    }
  }

  // On macOS, only show theme toggle (uses native traffic light buttons)
  if (process.platform === 'darwin') {
    return (
      <div className={`window-controls window-controls--macos ${className}`}>
        <ThemeToggle variant="icon" size="small" />
      </div>
    )
  }

  return (
    <div className={`window-controls ${className}`}>
      <ThemeToggle variant="icon" size="small" />
      
      <button 
        className="window-control minimize"
        onClick={handleMinimize}
        title="Minimize"
        type="button"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="5" width="8" height="2" fill="currentColor" />
        </svg>
      </button>
      
      <button 
        className="window-control maximize"
        onClick={handleMaximize}
        title="Maximize"
        type="button"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      </button>
      
      <button 
        className="window-control close"
        onClick={handleClose}
        title="Close"
        type="button"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path 
            d="M2 2 L10 10 M10 2 L2 10" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}