package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
)

// Config holds the application configuration
type Config struct {
	Port         int    `json:"port"`
	DatabasePath string `json:"database_path"`
	LogLevel     string `json:"log_level"`
}

// Load reads configuration from environment variables and returns a Config
func Load() (*Config, error) {
	cfg := &Config{
		Port:     8080, // Default port
		LogLevel: "info",
	}

	// Read port from environment
	if portStr := os.Getenv("FOCUSED_TODO_PORT"); portStr != "" {
		port, err := strconv.Atoi(portStr)
		if err != nil {
			return nil, fmt.Errorf("invalid port number: %w", err)
		}
		cfg.Port = port
	}

	// Read log level from environment
	if logLevel := os.Getenv("FOCUSED_TODO_LOG_LEVEL"); logLevel != "" {
		cfg.LogLevel = logLevel
	}

	// Set up database path
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get user home directory: %w", err)
	}

	cfg.DatabasePath = filepath.Join(homeDir, ".focused-todo", "data.db")

	// Create data directory if it doesn't exist
	dataDir := filepath.Dir(cfg.DatabasePath)
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	return cfg, nil
}
