package storage

import (
	"fmt"
	"log"
	"time"
)

// Migration represents a database migration
type Migration struct {
	Version int
	Name    string
	Up      string
	Down    string
}

// migrationRecord tracks applied migrations in the database
type migrationRecord struct {
	Version   int       `db:"version"`
	Name      string    `db:"name"`
	AppliedAt time.Time `db:"applied_at"`
}

// migrations contains all database migrations in order
var migrations = []Migration{
	{
		Version: 1,
		Name:    "create_schema_migrations_table",
		Up: `CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		Down: `DROP TABLE IF EXISTS schema_migrations`,
	},
	{
		Version: 2,
		Name:    "create_projects_table",
		Up: `CREATE TABLE IF NOT EXISTS projects (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT,
			color TEXT NOT NULL,
			icon TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		Down: `DROP TABLE IF EXISTS projects`,
	},
	{
		Version: 3,
		Name:    "create_tasks_table",
		Up: `CREATE TABLE IF NOT EXISTS tasks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id INTEGER NOT NULL,
			parent_id INTEGER,
			title TEXT NOT NULL,
			description TEXT,
			status TEXT DEFAULT 'pending',
			priority INTEGER DEFAULT 0,
			due_date DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
			FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
		)`,
		Down: `DROP TABLE IF EXISTS tasks`,
	},
	{
		Version: 4,
		Name:    "create_time_entries_table",
		Up: `CREATE TABLE IF NOT EXISTS time_entries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			task_id INTEGER NOT NULL,
			start_time DATETIME NOT NULL,
			end_time DATETIME,
			duration INTEGER,
			description TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
		)`,
		Down: `DROP TABLE IF EXISTS time_entries`,
	},
	{
		Version: 5,
		Name:    "create_performance_indexes",
		Up: `CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
		     CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
		     CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
		     CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
		     CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
		     CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);`,
		Down: `DROP INDEX IF EXISTS idx_tasks_project_id;
		       DROP INDEX IF EXISTS idx_tasks_parent_id;
		       DROP INDEX IF EXISTS idx_tasks_status;
		       DROP INDEX IF EXISTS idx_time_entries_task_id;
		       DROP INDEX IF EXISTS idx_projects_created_at;
		       DROP INDEX IF EXISTS idx_tasks_created_at;`,
	},
}

// migrate runs all pending migrations
func (s *Storage) migrate() error {
	// Ensure schema_migrations table exists first
	if err := s.ensureSchemaMigrationsTable(); err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	// Get current migration version
	currentVersion, err := s.getCurrentMigrationVersion()
	if err != nil {
		return fmt.Errorf("failed to get current migration version: %w", err)
	}

	log.Printf("Current database version: %d", currentVersion)

	// Apply pending migrations
	for _, migration := range migrations {
		if migration.Version <= currentVersion {
			continue // Skip already applied migrations
		}

		log.Printf("Applying migration %d: %s", migration.Version, migration.Name)

		if err := s.applyMigration(migration); err != nil {
			return fmt.Errorf("failed to apply migration %d (%s): %w", migration.Version, migration.Name, err)
		}

		log.Printf("Successfully applied migration %d: %s", migration.Version, migration.Name)
	}

	finalVersion, err := s.getCurrentMigrationVersion()
	if err != nil {
		return fmt.Errorf("failed to verify final migration version: %w", err)
	}

	log.Printf("Database migrations complete. Final version: %d", finalVersion)
	return nil
}

// ensureSchemaMigrationsTable creates the schema_migrations table if it doesn't exist
func (s *Storage) ensureSchemaMigrationsTable() error {
	query := `CREATE TABLE IF NOT EXISTS schema_migrations (
		version INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`

	_, err := s.db.Exec(query)
	return err
}

// getCurrentMigrationVersion returns the current migration version
func (s *Storage) getCurrentMigrationVersion() (int, error) {
	query := `SELECT COALESCE(MAX(version), 0) FROM schema_migrations`

	var version int
	err := s.db.QueryRow(query).Scan(&version)
	if err != nil {
		return 0, fmt.Errorf("failed to query migration version: %w", err)
	}

	return version, nil
}

// applyMigration applies a single migration in a transaction
func (s *Storage) applyMigration(migration Migration) error {
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() // Will be ignored if tx.Commit() succeeds

	// Execute the migration SQL
	if _, err := tx.Exec(migration.Up); err != nil {
		return fmt.Errorf("failed to execute migration SQL: %w", err)
	}

	// Record the migration in schema_migrations table
	recordQuery := `INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`
	if _, err := tx.Exec(recordQuery, migration.Version, migration.Name, time.Now()); err != nil {
		return fmt.Errorf("failed to record migration: %w", err)
	}

	// Commit the transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit migration transaction: %w", err)
	}

	return nil
}

// rollbackMigration rolls back a specific migration
func (s *Storage) rollbackMigration(version int) error {
	// Find the migration to rollback
	var migrationToRollback *Migration
	for _, migration := range migrations {
		if migration.Version == version {
			migrationToRollback = &migration
			break
		}
	}

	if migrationToRollback == nil {
		return fmt.Errorf("migration version %d not found", version)
	}

	log.Printf("Rolling back migration %d: %s", version, migrationToRollback.Name)

	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin rollback transaction: %w", err)
	}
	defer tx.Rollback()

	// Execute the rollback SQL
	if _, err := tx.Exec(migrationToRollback.Down); err != nil {
		return fmt.Errorf("failed to execute rollback SQL: %w", err)
	}

	// Remove the migration record
	deleteQuery := `DELETE FROM schema_migrations WHERE version = ?`
	if _, err := tx.Exec(deleteQuery, version); err != nil {
		return fmt.Errorf("failed to remove migration record: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit rollback transaction: %w", err)
	}

	log.Printf("Successfully rolled back migration %d: %s", version, migrationToRollback.Name)
	return nil
}

// GetAppliedMigrations returns a list of applied migrations
func (s *Storage) GetAppliedMigrations() ([]migrationRecord, error) {
	query := `SELECT version, name, applied_at FROM schema_migrations ORDER BY version`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query applied migrations: %w", err)
	}
	defer rows.Close()

	var records []migrationRecord
	for rows.Next() {
		var record migrationRecord
		if err := rows.Scan(&record.Version, &record.Name, &record.AppliedAt); err != nil {
			return nil, fmt.Errorf("failed to scan migration record: %w", err)
		}
		records = append(records, record)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading migration records: %w", err)
	}

	return records, nil
}

// RollbackToVersion rolls back the database to a specific version
func (s *Storage) RollbackToVersion(targetVersion int) error {
	currentVersion, err := s.getCurrentMigrationVersion()
	if err != nil {
		return fmt.Errorf("failed to get current version: %w", err)
	}

	if targetVersion >= currentVersion {
		return fmt.Errorf("target version %d is not less than current version %d", targetVersion, currentVersion)
	}

	// Rollback migrations in reverse order
	for version := currentVersion; version > targetVersion; version-- {
		if err := s.rollbackMigration(version); err != nil {
			return fmt.Errorf("failed to rollback migration %d: %w", version, err)
		}
	}

	return nil
}
