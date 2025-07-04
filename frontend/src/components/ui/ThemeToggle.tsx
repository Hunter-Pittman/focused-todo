import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from './Button';
import './ThemeToggle.css';

interface ThemeToggleProps {
  variant?: 'icon' | 'text' | 'dropdown';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'icon',
  size = 'medium',
  className = ''
}) => {
  const { theme, actualTheme, setTheme, toggleTheme } = useTheme();

  const getIcon = () => {
    switch (actualTheme) {
      case 'dark':
        return '🌙';
      case 'light':
        return '☀️';
      default:
        return '💻';
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'dark':
        return 'Dark';
      case 'light':
        return 'Light';
      case 'system':
        return `System (${actualTheme})`;
      default:
        return 'Theme';
    }
  };

  if (variant === 'dropdown') {
    return (
      <div className={`theme-toggle theme-toggle--dropdown ${className}`}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as any)}
          className="theme-toggle__select"
          aria-label="Choose theme"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <Button
        variant="tertiary"
        size={size}
        onClick={toggleTheme}
        className={`theme-toggle theme-toggle--text ${className}`}
        title={`Current theme: ${getLabel()}. Click to toggle.`}
      >
        {getIcon()} {getLabel()}
      </Button>
    );
  }

  return (
    <Button
      variant="tertiary"
      size={size}
      onClick={toggleTheme}
      className={`theme-toggle theme-toggle--icon ${className}`}
      title={`Current theme: ${getLabel()}. Click to toggle.`}
    >
      {getIcon()}
    </Button>
  );
};