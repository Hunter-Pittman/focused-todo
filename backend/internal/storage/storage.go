package storage

import (
	"database/sql"
	"fmt"

	_ "github.com/mattn/go-sqlite3"
)

// Storage handles database operations
type Storage struct {
	db *sql.DB
}

// New creates a new Storage instance with connection pooling
func New(dbPath string) (*Storage, error) {
	// SQLite connection string with performance optimizations
	dsn := dbPath + "?_busy_timeout=5000&_journal_mode=WAL&_synchronous=NORMAL&_cache_size=1000&_foreign_keys=on"

	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool for SQLite
	// SQLite doesn't benefit from many concurrent connections due to locking
	// but we set reasonable limits for our use case
	db.SetMaxOpenConns(10)   // Maximum number of open connections to the database
	db.SetMaxIdleConns(5)    // Maximum number of connections in the idle connection pool
	db.SetConnMaxLifetime(0) // Maximum amount of time a connection may be reused (0 = no limit for SQLite)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	storage := &Storage{db: db}

	// Run migrations
	if err := storage.migrate(); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return storage, nil
}

// Close closes the database connection
func (s *Storage) Close() error {
	return s.db.Close()
}

// migrate is now implemented in migrations.go with proper versioning
