package storage

import (
	"database/sql"
	"fmt"
	"time"

	"focused-todo/backend/pkg/types"
)

// CreateTask creates a new task in the database
func (s *Storage) CreateTask(req types.CreateTaskRequest) (*types.Task, error) {
	// First verify that the project exists
	projectExists, err := s.projectExists(req.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify project existence: %w", err)
	}
	if !projectExists {
		return nil, fmt.Errorf("project with id %d does not exist", req.ProjectID)
	}

	// If parent_id is specified, verify that the parent task exists and belongs to the same project
	if req.ParentID != nil {
		parentExists, parentProjectID, err := s.taskExistsInProject(*req.ParentID, req.ProjectID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify parent task: %w", err)
		}
		if !parentExists {
			return nil, fmt.Errorf("parent task with id %d does not exist in project %d", *req.ParentID, req.ProjectID)
		}
		if parentProjectID != req.ProjectID {
			return nil, fmt.Errorf("parent task belongs to different project")
		}
	}

	query := `INSERT INTO tasks (project_id, parent_id, title, description, status, priority, due_date, created_at, updated_at) 
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
			  RETURNING id, project_id, parent_id, title, description, status, priority, due_date, created_at, updated_at`

	now := time.Now()

	var task types.Task
	err = s.db.QueryRow(query, req.ProjectID, req.ParentID, req.Title, req.Description,
		types.TaskStatusPending, req.Priority, req.DueDate, now, now).Scan(
		&task.ID,
		&task.ProjectID,
		&task.ParentID,
		&task.Title,
		&task.Description,
		&task.Status,
		&task.Priority,
		&task.DueDate,
		&task.CreatedAt,
		&task.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	return &task, nil
}

// GetTask retrieves a task by ID
func (s *Storage) GetTask(id int) (*types.Task, error) {
	query := `SELECT id, project_id, parent_id, title, description, status, priority, due_date, created_at, updated_at 
			  FROM tasks 
			  WHERE id = ?`

	var task types.Task
	err := s.db.QueryRow(query, id).Scan(
		&task.ID,
		&task.ProjectID,
		&task.ParentID,
		&task.Title,
		&task.Description,
		&task.Status,
		&task.Priority,
		&task.DueDate,
		&task.CreatedAt,
		&task.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("task with id %d not found", id)
		}
		return nil, fmt.Errorf("failed to get task: %w", err)
	}

	return &task, nil
}

// GetTasksByProject retrieves all tasks for a specific project
func (s *Storage) GetTasksByProject(projectID int) ([]types.Task, error) {
	// First verify that the project exists
	projectExists, err := s.projectExists(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify project existence: %w", err)
	}
	if !projectExists {
		return nil, fmt.Errorf("project with id %d does not exist", projectID)
	}

	query := `SELECT id, project_id, parent_id, title, description, status, priority, due_date, created_at, updated_at 
			  FROM tasks 
			  WHERE project_id = ? 
			  ORDER BY priority DESC, created_at ASC`

	rows, err := s.db.Query(query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to query tasks: %w", err)
	}
	defer rows.Close()

	var tasks []types.Task
	for rows.Next() {
		var task types.Task
		err := rows.Scan(
			&task.ID,
			&task.ProjectID,
			&task.ParentID,
			&task.Title,
			&task.Description,
			&task.Status,
			&task.Priority,
			&task.DueDate,
			&task.CreatedAt,
			&task.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		tasks = append(tasks, task)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading task rows: %w", err)
	}

	return tasks, nil
}

// GetSubtasks retrieves all subtasks for a parent task
func (s *Storage) GetSubtasks(parentID int) ([]types.Task, error) {
	query := `SELECT id, project_id, parent_id, title, description, status, priority, due_date, created_at, updated_at 
			  FROM tasks 
			  WHERE parent_id = ? 
			  ORDER BY priority DESC, created_at ASC`

	rows, err := s.db.Query(query, parentID)
	if err != nil {
		return nil, fmt.Errorf("failed to query subtasks: %w", err)
	}
	defer rows.Close()

	var tasks []types.Task
	for rows.Next() {
		var task types.Task
		err := rows.Scan(
			&task.ID,
			&task.ProjectID,
			&task.ParentID,
			&task.Title,
			&task.Description,
			&task.Status,
			&task.Priority,
			&task.DueDate,
			&task.CreatedAt,
			&task.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan subtask: %w", err)
		}
		tasks = append(tasks, task)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading subtask rows: %w", err)
	}

	return tasks, nil
}

// UpdateTask updates an existing task
func (s *Storage) UpdateTask(id int, req types.CreateTaskRequest) (*types.Task, error) {
	// Verify the task exists and get its current project_id
	currentTask, err := s.GetTask(id)
	if err != nil {
		return nil, err
	}

	// If changing project, verify the new project exists
	if req.ProjectID != currentTask.ProjectID {
		projectExists, err := s.projectExists(req.ProjectID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify project existence: %w", err)
		}
		if !projectExists {
			return nil, fmt.Errorf("project with id %d does not exist", req.ProjectID)
		}
	}

	// If parent_id is specified, verify that the parent task exists and belongs to the same project
	if req.ParentID != nil {
		parentExists, parentProjectID, err := s.taskExistsInProject(*req.ParentID, req.ProjectID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify parent task: %w", err)
		}
		if !parentExists {
			return nil, fmt.Errorf("parent task with id %d does not exist in project %d", *req.ParentID, req.ProjectID)
		}
		if parentProjectID != req.ProjectID {
			return nil, fmt.Errorf("parent task belongs to different project")
		}

		// Prevent circular references
		if *req.ParentID == id {
			return nil, fmt.Errorf("task cannot be its own parent")
		}
	}

	query := `UPDATE tasks 
			  SET project_id = ?, parent_id = ?, title = ?, description = ?, priority = ?, due_date = ?, updated_at = ? 
			  WHERE id = ?
			  RETURNING id, project_id, parent_id, title, description, status, priority, due_date, created_at, updated_at`

	now := time.Now()

	var task types.Task
	err = s.db.QueryRow(query, req.ProjectID, req.ParentID, req.Title, req.Description,
		req.Priority, req.DueDate, now, id).Scan(
		&task.ID,
		&task.ProjectID,
		&task.ParentID,
		&task.Title,
		&task.Description,
		&task.Status,
		&task.Priority,
		&task.DueDate,
		&task.CreatedAt,
		&task.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("task with id %d not found", id)
		}
		return nil, fmt.Errorf("failed to update task: %w", err)
	}

	return &task, nil
}

// UpdateTaskStatus updates the status of a task
func (s *Storage) UpdateTaskStatus(id int, status types.TaskStatus) (*types.Task, error) {
	query := `UPDATE tasks 
			  SET status = ?, updated_at = ? 
			  WHERE id = ?
			  RETURNING id, project_id, parent_id, title, description, status, priority, due_date, created_at, updated_at`

	now := time.Now()

	var task types.Task
	err := s.db.QueryRow(query, status, now, id).Scan(
		&task.ID,
		&task.ProjectID,
		&task.ParentID,
		&task.Title,
		&task.Description,
		&task.Status,
		&task.Priority,
		&task.DueDate,
		&task.CreatedAt,
		&task.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("task with id %d not found", id)
		}
		return nil, fmt.Errorf("failed to update task status: %w", err)
	}

	return &task, nil
}

// UpdateTaskPriority updates the priority of a task
func (s *Storage) UpdateTaskPriority(id int, priority int) (*types.Task, error) {
	query := `UPDATE tasks 
			  SET priority = ?, updated_at = ? 
			  WHERE id = ?
			  RETURNING id, project_id, parent_id, title, description, status, priority, due_date, created_at, updated_at`

	now := time.Now()

	var task types.Task
	err := s.db.QueryRow(query, priority, now, id).Scan(
		&task.ID,
		&task.ProjectID,
		&task.ParentID,
		&task.Title,
		&task.Description,
		&task.Status,
		&task.Priority,
		&task.DueDate,
		&task.CreatedAt,
		&task.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("task with id %d not found", id)
		}
		return nil, fmt.Errorf("failed to update task priority: %w", err)
	}

	return &task, nil
}

// ReorderTasks updates the priority of multiple tasks to maintain order
func (s *Storage) ReorderTasks(taskOrders []types.TaskOrder) error {
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	query := `UPDATE tasks SET priority = ?, updated_at = ? WHERE id = ?`
	now := time.Now()

	for _, order := range taskOrders {
		_, err := tx.Exec(query, order.Priority, now, order.TaskID)
		if err != nil {
			return fmt.Errorf("failed to update task %d priority: %w", order.TaskID, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit reorder transaction: %w", err)
	}

	return nil
}

// DeleteTask deletes a task and all its subtasks
func (s *Storage) DeleteTask(id int) error {
	// Start a transaction to ensure atomicity
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() // Will be ignored if tx.Commit() succeeds

	// Check if task exists first
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM tasks WHERE id = ?)`
	err = tx.QueryRow(checkQuery, id).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check task existence: %w", err)
	}

	if !exists {
		return fmt.Errorf("task with id %d not found", id)
	}

	// Delete the task (CASCADE will handle subtasks and time_entries)
	deleteQuery := `DELETE FROM tasks WHERE id = ?`
	result, err := tx.Exec(deleteQuery, id)
	if err != nil {
		return fmt.Errorf("failed to delete task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no task was deleted")
	}

	// Commit the transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit delete transaction: %w", err)
	}

	return nil
}

// Helper function to check if a project exists
func (s *Storage) projectExists(projectID int) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?)`
	var exists bool
	err := s.db.QueryRow(query, projectID).Scan(&exists)
	return exists, err
}

// Helper function to check if a task exists in a specific project
func (s *Storage) taskExistsInProject(taskID, projectID int) (bool, int, error) {
	query := `SELECT project_id FROM tasks WHERE id = ?`
	var taskProjectID int
	err := s.db.QueryRow(query, taskID).Scan(&taskProjectID)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, 0, nil
		}
		return false, 0, err
	}
	return true, taskProjectID, nil
}
