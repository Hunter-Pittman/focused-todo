package types

import "time"

// Project represents a project in the system
type Project struct {
	ID          int       `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description,omitempty" db:"description"`
	Color       string    `json:"color" db:"color"`
	Icon        string    `json:"icon" db:"icon"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// CreateProjectRequest represents the request payload for creating a project
type CreateProjectRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description,omitempty" validate:"max=500"`
	Color       string `json:"color" validate:"required,hexcolor"`
	Icon        string `json:"icon" validate:"required,min=1,max=50"`
}

// TaskStatus represents the status of a task
type TaskStatus string

const (
	TaskStatusPending    TaskStatus = "pending"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusCompleted  TaskStatus = "completed"
	TaskStatusCancelled  TaskStatus = "cancelled"
)

// Task represents a task in the system
type Task struct {
	ID          int        `json:"id" db:"id"`
	ProjectID   int        `json:"project_id" db:"project_id"`
	ParentID    *int       `json:"parent_id,omitempty" db:"parent_id"`
	Title       string     `json:"title" db:"title"`
	Description string     `json:"description,omitempty" db:"description"`
	Status      TaskStatus `json:"status" db:"status"`
	Priority    int        `json:"priority" db:"priority"`
	DueDate     *time.Time `json:"due_date,omitempty" db:"due_date"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// CreateTaskRequest represents the request payload for creating a task
type CreateTaskRequest struct {
	ProjectID   int        `json:"project_id" validate:"required,gt=0"`
	ParentID    *int       `json:"parent_id,omitempty" validate:"omitempty,gt=0"`
	Title       string     `json:"title" validate:"required,min=1,max=200"`
	Description string     `json:"description,omitempty" validate:"max=1000"`
	Priority    int        `json:"priority" validate:"min=0,max=10"`
	DueDate     *time.Time `json:"due_date,omitempty"`
}

// TimeEntry represents a time tracking entry
type TimeEntry struct {
	ID          int        `json:"id" db:"id"`
	TaskID      int        `json:"task_id" db:"task_id"`
	StartTime   time.Time  `json:"start_time" db:"start_time"`
	EndTime     *time.Time `json:"end_time,omitempty" db:"end_time"`
	Duration    *int       `json:"duration,omitempty" db:"duration"` // Duration in seconds
	Description string     `json:"description,omitempty" db:"description"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
}

// CreateTimeEntryRequest represents the request payload for creating a time entry
type CreateTimeEntryRequest struct {
	TaskID      int        `json:"task_id" validate:"required,gt=0"`
	StartTime   time.Time  `json:"start_time" validate:"required"`
	EndTime     *time.Time `json:"end_time,omitempty"`
	Description string     `json:"description,omitempty" validate:"max=500"`
}

// StartTimeEntryRequest represents the request payload for starting a time entry
type StartTimeEntryRequest struct {
	TaskID      int    `json:"task_id" validate:"required,gt=0"`
	Description string `json:"description,omitempty" validate:"max=500"`
}

// StopTimeEntryRequest represents the request payload for stopping a time entry
type StopTimeEntryRequest struct {
	Description string `json:"description,omitempty" validate:"max=500"`
}

// UpdateTimeEntryRequest represents the request payload for updating a time entry
type UpdateTimeEntryRequest struct {
	StartTime   *time.Time `json:"start_time,omitempty"`
	EndTime     *time.Time `json:"end_time,omitempty"`
	Description *string    `json:"description,omitempty" validate:"omitempty,max=500"`
}

// TaskOrder represents task ID and its new priority for reordering
type TaskOrder struct {
	TaskID   int `json:"task_id" validate:"required,gt=0"`
	Priority int `json:"priority" validate:"min=0"`
}

// ReorderTasksRequest represents the request payload for reordering tasks
type ReorderTasksRequest struct {
	Tasks []TaskOrder `json:"tasks" validate:"required,min=1"`
}

// APIResponse represents a standard API response wrapper
type APIResponse[T any] struct {
	Data    T      `json:"data"`
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string            `json:"error"`
	Code    string            `json:"code,omitempty"`
	Details map[string]string `json:"details,omitempty"`
}

// HealthResponse represents a health check response
type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp int64  `json:"timestamp"`
}

// AppConfig represents application configuration
type AppConfig struct {
	Port         int    `json:"port"`
	DatabasePath string `json:"database_path"`
	LogLevel     string `json:"log_level"`
}

// ValidationError represents a validation error for a specific field
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Tag     string `json:"tag"`
	Value   string `json:"value"`
}

// NewAPIResponse creates a new successful API response
func NewAPIResponse[T any](data T) APIResponse[T] {
	return APIResponse[T]{
		Data:    data,
		Success: true,
	}
}

// NewAPIResponseWithMessage creates a new successful API response with a message
func NewAPIResponseWithMessage[T any](data T, message string) APIResponse[T] {
	return APIResponse[T]{
		Data:    data,
		Success: true,
		Message: message,
	}
}

// NewErrorResponse creates a new error response
func NewErrorResponse(message string) ErrorResponse {
	return ErrorResponse{
		Error: message,
	}
}

// NewErrorResponseWithCode creates a new error response with a code
func NewErrorResponseWithCode(message, code string) ErrorResponse {
	return ErrorResponse{
		Error: message,
		Code:  code,
	}
}

// NewErrorResponseWithDetails creates a new error response with details
func NewErrorResponseWithDetails(message, code string, details map[string]string) ErrorResponse {
	return ErrorResponse{
		Error:   message,
		Code:    code,
		Details: details,
	}
}
