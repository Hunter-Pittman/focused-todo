package storage

import (
	"database/sql"
	"fmt"
	"time"

	"focused-todo/backend/pkg/types"
)

// CreateTimeEntry creates a new time entry in the database
func (s *Storage) CreateTimeEntry(req types.CreateTimeEntryRequest) (*types.TimeEntry, error) {
	// First verify that the task exists
	taskExists, err := s.taskExists(req.TaskID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify task existence: %w", err)
	}
	if !taskExists {
		return nil, fmt.Errorf("task with id %d does not exist", req.TaskID)
	}

	// Validate business logic
	if err := s.validateTimeEntryBusinessLogic(req.TaskID, req.StartTime, req.EndTime); err != nil {
		return nil, err
	}

	// Calculate duration if both start and end times are provided
	var duration *int
	if req.EndTime != nil {
		durationSeconds := int(req.EndTime.Sub(req.StartTime).Seconds())
		if durationSeconds < 0 {
			return nil, fmt.Errorf("end time cannot be before start time")
		}
		duration = &durationSeconds
	}

	query := `INSERT INTO time_entries (task_id, start_time, end_time, duration, description, created_at) 
			  VALUES (?, ?, ?, ?, ?, ?) 
			  RETURNING id, task_id, start_time, end_time, duration, description, created_at`

	now := time.Now()

	var timeEntry types.TimeEntry
	err = s.db.QueryRow(query, req.TaskID, req.StartTime, req.EndTime, duration, req.Description, now).Scan(
		&timeEntry.ID,
		&timeEntry.TaskID,
		&timeEntry.StartTime,
		&timeEntry.EndTime,
		&timeEntry.Duration,
		&timeEntry.Description,
		&timeEntry.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create time entry: %w", err)
	}

	return &timeEntry, nil
}

// StartTimeEntry starts a new time entry for a task
func (s *Storage) StartTimeEntry(req types.StartTimeEntryRequest) (*types.TimeEntry, error) {
	// First verify that the task exists
	taskExists, err := s.taskExists(req.TaskID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify task existence: %w", err)
	}
	if !taskExists {
		return nil, fmt.Errorf("task with id %d does not exist", req.TaskID)
	}

	// Validate that task is in a trackable state
	if err := s.validateTaskTrackable(req.TaskID); err != nil {
		return nil, err
	}

	// Check if there's already an active time entry for this task
	activeEntry, err := s.getActiveTimeEntry(req.TaskID)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to check for active time entry: %w", err)
	}
	if activeEntry != nil {
		return nil, fmt.Errorf("task %d already has an active time entry", req.TaskID)
	}

	now := time.Now()
	// Validate business logic for start time
	if err := s.validateTimeEntryBusinessLogic(req.TaskID, now, nil); err != nil {
		return nil, err
	}

	query := `INSERT INTO time_entries (task_id, start_time, description, created_at) 
			  VALUES (?, ?, ?, ?) 
			  RETURNING id, task_id, start_time, end_time, duration, description, created_at`

	var timeEntry types.TimeEntry
	err = s.db.QueryRow(query, req.TaskID, now, req.Description, now).Scan(
		&timeEntry.ID,
		&timeEntry.TaskID,
		&timeEntry.StartTime,
		&timeEntry.EndTime,
		&timeEntry.Duration,
		&timeEntry.Description,
		&timeEntry.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to start time entry: %w", err)
	}

	return &timeEntry, nil
}

// StopTimeEntry stops an active time entry for a task
func (s *Storage) StopTimeEntry(taskID int, req types.StopTimeEntryRequest) (*types.TimeEntry, error) {
	// Get the active time entry for this task
	activeEntry, err := s.getActiveTimeEntry(taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("no active time entry found for task %d", taskID)
		}
		return nil, fmt.Errorf("failed to get active time entry: %w", err)
	}

	now := time.Now()
	duration := int(now.Sub(activeEntry.StartTime).Seconds())

	// Update description if provided
	description := activeEntry.Description
	if req.Description != "" {
		description = req.Description
	}

	query := `UPDATE time_entries 
			  SET end_time = ?, duration = ?, description = ? 
			  WHERE id = ?
			  RETURNING id, task_id, start_time, end_time, duration, description, created_at`

	var timeEntry types.TimeEntry
	err = s.db.QueryRow(query, now, duration, description, activeEntry.ID).Scan(
		&timeEntry.ID,
		&timeEntry.TaskID,
		&timeEntry.StartTime,
		&timeEntry.EndTime,
		&timeEntry.Duration,
		&timeEntry.Description,
		&timeEntry.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("time entry with id %d not found", activeEntry.ID)
		}
		return nil, fmt.Errorf("failed to stop time entry: %w", err)
	}

	return &timeEntry, nil
}

// GetTimeEntry retrieves a time entry by ID
func (s *Storage) GetTimeEntry(id int) (*types.TimeEntry, error) {
	query := `SELECT id, task_id, start_time, end_time, duration, description, created_at 
			  FROM time_entries 
			  WHERE id = ?`

	var timeEntry types.TimeEntry
	err := s.db.QueryRow(query, id).Scan(
		&timeEntry.ID,
		&timeEntry.TaskID,
		&timeEntry.StartTime,
		&timeEntry.EndTime,
		&timeEntry.Duration,
		&timeEntry.Description,
		&timeEntry.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("time entry with id %d not found", id)
		}
		return nil, fmt.Errorf("failed to get time entry: %w", err)
	}

	return &timeEntry, nil
}

// GetTimeEntriesByTask retrieves all time entries for a specific task
func (s *Storage) GetTimeEntriesByTask(taskID int) ([]types.TimeEntry, error) {
	// First verify that the task exists
	taskExists, err := s.taskExists(taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify task existence: %w", err)
	}
	if !taskExists {
		return nil, fmt.Errorf("task with id %d does not exist", taskID)
	}

	query := `SELECT id, task_id, start_time, end_time, duration, description, created_at 
			  FROM time_entries 
			  WHERE task_id = ? 
			  ORDER BY start_time DESC`

	rows, err := s.db.Query(query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to query time entries: %w", err)
	}
	defer rows.Close()

	timeEntries := []types.TimeEntry{}
	for rows.Next() {
		var timeEntry types.TimeEntry
		err := rows.Scan(
			&timeEntry.ID,
			&timeEntry.TaskID,
			&timeEntry.StartTime,
			&timeEntry.EndTime,
			&timeEntry.Duration,
			&timeEntry.Description,
			&timeEntry.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time entry: %w", err)
		}
		timeEntries = append(timeEntries, timeEntry)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading time entry rows: %w", err)
	}

	return timeEntries, nil
}

// GetTimeEntriesByProject retrieves all time entries for tasks in a specific project
func (s *Storage) GetTimeEntriesByProject(projectID int) ([]types.TimeEntry, error) {
	// First verify that the project exists
	projectExists, err := s.projectExists(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify project existence: %w", err)
	}
	if !projectExists {
		return nil, fmt.Errorf("project with id %d does not exist", projectID)
	}

	query := `SELECT te.id, te.task_id, te.start_time, te.end_time, te.duration, te.description, te.created_at 
			  FROM time_entries te
			  JOIN tasks t ON te.task_id = t.id
			  WHERE t.project_id = ? 
			  ORDER BY te.start_time DESC`

	rows, err := s.db.Query(query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to query time entries: %w", err)
	}
	defer rows.Close()

	timeEntries := []types.TimeEntry{}
	for rows.Next() {
		var timeEntry types.TimeEntry
		err := rows.Scan(
			&timeEntry.ID,
			&timeEntry.TaskID,
			&timeEntry.StartTime,
			&timeEntry.EndTime,
			&timeEntry.Duration,
			&timeEntry.Description,
			&timeEntry.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time entry: %w", err)
		}
		timeEntries = append(timeEntries, timeEntry)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading time entry rows: %w", err)
	}

	return timeEntries, nil
}

// GetActiveTimeEntry retrieves the active time entry for a task (if any)
func (s *Storage) GetActiveTimeEntry(taskID int) (*types.TimeEntry, error) {
	return s.getActiveTimeEntry(taskID)
}

// UpdateTimeEntry updates an existing time entry
func (s *Storage) UpdateTimeEntry(id int, req types.CreateTimeEntryRequest) (*types.TimeEntry, error) {
	// Verify the time entry exists
	_, err := s.GetTimeEntry(id)
	if err != nil {
		return nil, err
	}

	// Verify the task exists
	taskExists, err := s.taskExists(req.TaskID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify task existence: %w", err)
	}
	if !taskExists {
		return nil, fmt.Errorf("task with id %d does not exist", req.TaskID)
	}

	// Validate business logic for times (but skip overlap check since we'll do it separately)
	now := time.Now()
	if req.StartTime.After(now.Add(5 * time.Minute)) {
		return nil, fmt.Errorf("start time cannot be in the future")
	}

	thirtyDaysAgo := now.AddDate(0, 0, -30)
	if req.StartTime.Before(thirtyDaysAgo) {
		return nil, fmt.Errorf("start time cannot be more than 30 days in the past")
	}

	if req.EndTime != nil {
		if req.EndTime.Before(req.StartTime) {
			return nil, fmt.Errorf("end time cannot be before start time")
		}

		duration := req.EndTime.Sub(req.StartTime)
		if duration > 24*time.Hour {
			return nil, fmt.Errorf("time entry duration cannot exceed 24 hours")
		}

		if duration < time.Minute {
			return nil, fmt.Errorf("time entry duration must be at least 1 minute")
		}

		if req.EndTime.After(now.Add(5 * time.Minute)) {
			return nil, fmt.Errorf("end time cannot be in the future")
		}
	}

	// Check for overlapping entries (excluding the current entry being updated)
	if err := s.validateNoOverlappingTimeEntries(req.TaskID, req.StartTime, req.EndTime, id); err != nil {
		return nil, err
	}

	// Calculate duration if both start and end times are provided
	var duration *int
	if req.EndTime != nil {
		durationSeconds := int(req.EndTime.Sub(req.StartTime).Seconds())
		if durationSeconds < 0 {
			return nil, fmt.Errorf("end time cannot be before start time")
		}
		duration = &durationSeconds
	}

	query := `UPDATE time_entries 
			  SET task_id = ?, start_time = ?, end_time = ?, duration = ?, description = ? 
			  WHERE id = ?
			  RETURNING id, task_id, start_time, end_time, duration, description, created_at`

	var timeEntry types.TimeEntry
	err = s.db.QueryRow(query, req.TaskID, req.StartTime, req.EndTime, duration, req.Description, id).Scan(
		&timeEntry.ID,
		&timeEntry.TaskID,
		&timeEntry.StartTime,
		&timeEntry.EndTime,
		&timeEntry.Duration,
		&timeEntry.Description,
		&timeEntry.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("time entry with id %d not found", id)
		}
		return nil, fmt.Errorf("failed to update time entry: %w", err)
	}

	return &timeEntry, nil
}

// DeleteTimeEntry deletes a time entry
func (s *Storage) DeleteTimeEntry(id int) error {
	// Check if time entry exists first
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM time_entries WHERE id = ?)`
	err := s.db.QueryRow(checkQuery, id).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check time entry existence: %w", err)
	}

	if !exists {
		return fmt.Errorf("time entry with id %d not found", id)
	}

	// Delete the time entry
	deleteQuery := `DELETE FROM time_entries WHERE id = ?`
	result, err := s.db.Exec(deleteQuery, id)
	if err != nil {
		return fmt.Errorf("failed to delete time entry: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no time entry was deleted")
	}

	return nil
}

// GetTaskTimeStatistics returns time statistics for a task
func (s *Storage) GetTaskTimeStatistics(taskID int) (map[string]interface{}, error) {
	// First verify that the task exists
	taskExists, err := s.taskExists(taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify task existence: %w", err)
	}
	if !taskExists {
		return nil, fmt.Errorf("task with id %d does not exist", taskID)
	}

	query := `SELECT 
		COUNT(*) as total_entries,
		COALESCE(SUM(duration), 0) as total_duration,
		COALESCE(AVG(duration), 0) as avg_duration,
		MIN(start_time) as first_entry,
		MAX(start_time) as last_entry
	FROM time_entries 
	WHERE task_id = ? AND end_time IS NOT NULL`

	var totalEntries int
	var totalDuration, avgDuration float64
	var firstEntry, lastEntry sql.NullString

	err = s.db.QueryRow(query, taskID).Scan(
		&totalEntries,
		&totalDuration,
		&avgDuration,
		&firstEntry,
		&lastEntry,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get time statistics: %w", err)
	}

	// Parse the datetime strings to time.Time if they exist
	var firstTime, lastTime *time.Time
	if firstEntry.Valid {
		if parsed, err := time.Parse("2006-01-02 15:04:05", firstEntry.String); err == nil {
			firstTime = &parsed
		}
	}
	if lastEntry.Valid {
		if parsed, err := time.Parse("2006-01-02 15:04:05", lastEntry.String); err == nil {
			lastTime = &parsed
		}
	}

	stats := map[string]interface{}{
		"total_entries":  totalEntries,
		"total_duration": int(totalDuration),
		"avg_duration":   int(avgDuration),
		"first_entry":    firstTime,
		"last_entry":     lastTime,
	}

	return stats, nil
}

// Helper function to check if a task exists
func (s *Storage) taskExists(taskID int) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM tasks WHERE id = ?)`
	var exists bool
	err := s.db.QueryRow(query, taskID).Scan(&exists)
	return exists, err
}

// Helper function to get active time entry for a task
func (s *Storage) getActiveTimeEntry(taskID int) (*types.TimeEntry, error) {
	query := `SELECT id, task_id, start_time, end_time, duration, description, created_at 
			  FROM time_entries 
			  WHERE task_id = ? AND end_time IS NULL 
			  ORDER BY start_time DESC 
			  LIMIT 1`

	var timeEntry types.TimeEntry
	err := s.db.QueryRow(query, taskID).Scan(
		&timeEntry.ID,
		&timeEntry.TaskID,
		&timeEntry.StartTime,
		&timeEntry.EndTime,
		&timeEntry.Duration,
		&timeEntry.Description,
		&timeEntry.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &timeEntry, nil
}

// validateTimeEntryBusinessLogic validates business rules for time entries
func (s *Storage) validateTimeEntryBusinessLogic(taskID int, startTime time.Time, endTime *time.Time) error {
	// Validate start time is not in the future (allow 5 minute buffer for clock skew)
	now := time.Now()
	if startTime.After(now.Add(5 * time.Minute)) {
		return fmt.Errorf("start time cannot be in the future")
	}

	// Validate start time is not too far in the past (more than 30 days)
	thirtyDaysAgo := now.AddDate(0, 0, -30)
	if startTime.Before(thirtyDaysAgo) {
		return fmt.Errorf("start time cannot be more than 30 days in the past")
	}

	// Validate end time if provided
	if endTime != nil {
		// End time cannot be before start time
		if endTime.Before(startTime) {
			return fmt.Errorf("end time cannot be before start time")
		}

		// Duration cannot be more than 24 hours
		duration := endTime.Sub(startTime)
		if duration > 24*time.Hour {
			return fmt.Errorf("time entry duration cannot exceed 24 hours")
		}

		// Duration must be at least 1 minute
		if duration < time.Minute {
			return fmt.Errorf("time entry duration must be at least 1 minute")
		}

		// End time cannot be in the future
		if endTime.After(now.Add(5 * time.Minute)) {
			return fmt.Errorf("end time cannot be in the future")
		}
	}

	// Check for overlapping time entries
	if err := s.validateNoOverlappingTimeEntries(taskID, startTime, endTime, 0); err != nil {
		return err
	}

	return nil
}

// validateTaskTrackable checks if a task is in a state that allows time tracking
func (s *Storage) validateTaskTrackable(taskID int) error {
	task, err := s.GetTask(taskID)
	if err != nil {
		return fmt.Errorf("failed to get task: %w", err)
	}

	// Don't allow time tracking on completed or cancelled tasks
	if task.Status == types.TaskStatusCompleted {
		return fmt.Errorf("cannot track time on completed task")
	}
	if task.Status == types.TaskStatusCancelled {
		return fmt.Errorf("cannot track time on cancelled task")
	}

	return nil
}

// validateNoOverlappingTimeEntries checks for overlapping time entries for the same task
func (s *Storage) validateNoOverlappingTimeEntries(taskID int, startTime time.Time, endTime *time.Time, excludeEntryID int) error {
	// If no end time, only check if there's another active entry
	if endTime == nil {
		activeEntry, err := s.getActiveTimeEntry(taskID)
		if err != nil && err != sql.ErrNoRows {
			return fmt.Errorf("failed to check for active time entry: %w", err)
		}
		if activeEntry != nil && activeEntry.ID != excludeEntryID {
			return fmt.Errorf("task already has an active time entry")
		}
		return nil
	}

	// Check for overlapping completed time entries
	query := `SELECT id, start_time, end_time 
			  FROM time_entries 
			  WHERE task_id = ? AND id != ? AND end_time IS NOT NULL
			  AND (
				  (start_time <= ? AND end_time > ?) OR
				  (start_time < ? AND end_time >= ?) OR
				  (start_time >= ? AND start_time < ?)
			  )`

	rows, err := s.db.Query(query, taskID, excludeEntryID,
		startTime, startTime,
		*endTime, *endTime,
		startTime, *endTime)
	if err != nil {
		return fmt.Errorf("failed to check for overlapping time entries: %w", err)
	}
	defer rows.Close()

	if rows.Next() {
		return fmt.Errorf("time entry overlaps with existing time entry for this task")
	}

	return nil
}
