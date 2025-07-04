package storage

import (
	"database/sql"
	"fmt"
	"time"

	"focused-todo/backend/pkg/types"
)

// CreateProject creates a new project in the database
func (s *Storage) CreateProject(req types.CreateProjectRequest) (*types.Project, error) {
	query := `INSERT INTO projects (name, description, color, icon, created_at, updated_at) 
			  VALUES (?, ?, ?, ?, ?, ?) 
			  RETURNING id, name, description, color, icon, created_at, updated_at`

	now := time.Now()

	var project types.Project
	err := s.db.QueryRow(query, req.Name, req.Description, req.Color, req.Icon, now, now).Scan(
		&project.ID,
		&project.Name,
		&project.Description,
		&project.Color,
		&project.Icon,
		&project.CreatedAt,
		&project.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	return &project, nil
}

// GetProject retrieves a project by ID
func (s *Storage) GetProject(id int) (*types.Project, error) {
	query := `SELECT id, name, description, color, icon, created_at, updated_at 
			  FROM projects 
			  WHERE id = ?`

	var project types.Project
	err := s.db.QueryRow(query, id).Scan(
		&project.ID,
		&project.Name,
		&project.Description,
		&project.Color,
		&project.Icon,
		&project.CreatedAt,
		&project.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("project with id %d not found", id)
		}
		return nil, fmt.Errorf("failed to get project: %w", err)
	}

	return &project, nil
}

// GetAllProjects retrieves all projects from the database
func (s *Storage) GetAllProjects() ([]types.Project, error) {
	query := `SELECT id, name, description, color, icon, created_at, updated_at 
			  FROM projects 
			  ORDER BY created_at DESC`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query projects: %w", err)
	}
	defer rows.Close()

	var projects []types.Project
	for rows.Next() {
		var project types.Project
		err := rows.Scan(
			&project.ID,
			&project.Name,
			&project.Description,
			&project.Color,
			&project.Icon,
			&project.CreatedAt,
			&project.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan project: %w", err)
		}
		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading project rows: %w", err)
	}

	return projects, nil
}

// UpdateProject updates an existing project
func (s *Storage) UpdateProject(id int, req types.CreateProjectRequest) (*types.Project, error) {
	query := `UPDATE projects 
			  SET name = ?, description = ?, color = ?, icon = ?, updated_at = ? 
			  WHERE id = ?
			  RETURNING id, name, description, color, icon, created_at, updated_at`

	now := time.Now()

	var project types.Project
	err := s.db.QueryRow(query, req.Name, req.Description, req.Color, req.Icon, now, id).Scan(
		&project.ID,
		&project.Name,
		&project.Description,
		&project.Color,
		&project.Icon,
		&project.CreatedAt,
		&project.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("project with id %d not found", id)
		}
		return nil, fmt.Errorf("failed to update project: %w", err)
	}

	return &project, nil
}

// DeleteProject deletes a project and all its tasks
func (s *Storage) DeleteProject(id int) error {
	// Start a transaction to ensure atomicity
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() // Will be ignored if tx.Commit() succeeds

	// Check if project exists first
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?)`
	err = tx.QueryRow(checkQuery, id).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check project existence: %w", err)
	}

	if !exists {
		return fmt.Errorf("project with id %d not found", id)
	}

	// Delete the project (CASCADE will handle tasks and time_entries)
	deleteQuery := `DELETE FROM projects WHERE id = ?`
	result, err := tx.Exec(deleteQuery, id)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no project was deleted")
	}

	// Commit the transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit delete transaction: %w", err)
	}

	return nil
}

// GetProjectTaskCount returns the number of tasks in a project
func (s *Storage) GetProjectTaskCount(projectID int) (int, error) {
	query := `SELECT COUNT(*) FROM tasks WHERE project_id = ?`

	var count int
	err := s.db.QueryRow(query, projectID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get project task count: %w", err)
	}

	return count, nil
}

// GetProjectsWithTaskCounts retrieves all projects with their task counts
func (s *Storage) GetProjectsWithTaskCounts() ([]types.Project, error) {
	query := `SELECT p.id, p.name, p.description, p.color, p.icon, p.created_at, p.updated_at,
			         COALESCE(COUNT(t.id), 0) as task_count
			  FROM projects p
			  LEFT JOIN tasks t ON p.id = t.project_id
			  GROUP BY p.id, p.name, p.description, p.color, p.icon, p.created_at, p.updated_at
			  ORDER BY p.created_at DESC`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query projects with task counts: %w", err)
	}
	defer rows.Close()

	var projects []types.Project
	for rows.Next() {
		var project types.Project
		var taskCount int
		err := rows.Scan(
			&project.ID,
			&project.Name,
			&project.Description,
			&project.Color,
			&project.Icon,
			&project.CreatedAt,
			&project.UpdatedAt,
			&taskCount, // We'll ignore this for now, but it's useful for future UI features
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan project with task count: %w", err)
		}
		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading project rows with task counts: %w", err)
	}

	return projects, nil
}
