package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"

	"focused-todo/backend/internal/config"
	"focused-todo/backend/internal/storage"
	"focused-todo/backend/pkg/types"
)

// Server handles HTTP requests
type Server struct {
	config    *config.Config
	storage   *storage.Storage
	server    *http.Server
	validator *validator.Validate
}

// NewServer creates a new Server instance
func NewServer(cfg *config.Config, store *storage.Storage) *Server {
	v := validator.New()

	return &Server{
		config:    cfg,
		storage:   store,
		validator: v,
	}
}

// Start starts the HTTP server
func (s *Server) Start() error {
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/api/health", s.handleHealth)
	mux.HandleFunc("/api/projects", s.handleProjects)
	mux.HandleFunc("/api/tasks/reorder", s.handleTasksReorder)
	mux.HandleFunc("/api/tasks/", s.handleTaskByID)
	mux.HandleFunc("/api/tasks", s.handleTasks)

	// Apply middleware chain (order matters - outermost first)
	handler := s.loggingMiddleware(
		s.rateLimitMiddleware(
			s.bodySizeLimitMiddleware(
				s.securityHeadersMiddleware(mux))))

	s.server = &http.Server{
		Addr:         fmt.Sprintf(":%d", s.config.Port),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("Starting server on port %d", s.config.Port)
	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

// loggingMiddleware logs HTTP requests
func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap the ResponseWriter to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		log.Printf("%s %s %d %v", r.Method, r.URL.Path, wrapped.statusCode, duration)
	})
}

// responseWriter is a wrapper to capture the status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// handleHealth returns server health status
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	response := types.HealthResponse{
		Status:    "ok",
		Timestamp: time.Now().Unix(),
	}

	s.writeJSON(w, http.StatusOK, response)
}

// writeJSON writes a JSON response
func (s *Server) writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
	}
}

// writeError writes an error response
func (s *Server) writeError(w http.ResponseWriter, status int, message string) {
	response := types.NewErrorResponse(message)
	s.writeJSON(w, status, response)
}

// writeErrorWithCode writes an error response with a code
func (s *Server) writeErrorWithCode(w http.ResponseWriter, status int, message, code string) {
	response := types.NewErrorResponseWithCode(message, code)
	s.writeJSON(w, status, response)
}

// validateRequest validates a request struct using the validator
func (s *Server) validateRequest(req interface{}) map[string]string {
	err := s.validator.Struct(req)
	if err == nil {
		return nil
	}

	errors := make(map[string]string)
	for _, err := range err.(validator.ValidationErrors) {
		field := err.Field()
		tag := err.Tag()

		switch tag {
		case "required":
			errors[field] = "This field is required"
		case "min":
			errors[field] = fmt.Sprintf("Must be at least %s characters", err.Param())
		case "max":
			errors[field] = fmt.Sprintf("Must be at most %s characters", err.Param())
		case "email":
			errors[field] = "Must be a valid email address"
		case "hexcolor":
			errors[field] = "Must be a valid hex color (e.g., #FF0000)"
		case "gt":
			errors[field] = fmt.Sprintf("Must be greater than %s", err.Param())
		default:
			errors[field] = fmt.Sprintf("Validation failed for tag '%s'", tag)
		}
	}

	return errors
}

// handleProjects handles project-related requests
func (s *Server) handleProjects(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.getProjects(w, r)
	case http.MethodPost:
		s.createProject(w, r)
	default:
		s.writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

// handleTasks handles task-related requests
func (s *Server) handleTasks(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.getTasks(w, r)
	case http.MethodPost:
		s.createTask(w, r)
	default:
		s.writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

// getProjects returns all projects
func (s *Server) getProjects(w http.ResponseWriter, r *http.Request) {
	projects, err := s.storage.GetAllProjects()
	if err != nil {
		log.Printf("Failed to get projects: %v", err)
		s.writeError(w, http.StatusInternalServerError, "Failed to retrieve projects")
		return
	}

	response := types.NewAPIResponse(projects)
	s.writeJSON(w, http.StatusOK, response)
}

// createProject creates a new project
func (s *Server) createProject(w http.ResponseWriter, r *http.Request) {
	var req types.CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Sanitize input fields
	req.Name = sanitizeProjectName(req.Name)
	req.Description = sanitizeDescription(req.Description)
	req.Icon = sanitizeInput(req.Icon)

	// Additional validation beyond struct tags
	if !validateColor(req.Color) {
		s.writeError(w, http.StatusBadRequest, "Color must be a valid hex color (e.g., #FF0000)")
		return
	}

	if !validateIcon(req.Icon) {
		s.writeError(w, http.StatusBadRequest, "Icon must contain only alphanumeric characters, hyphens, and underscores")
		return
	}

	// Validate the request
	if validationErrors := s.validateRequest(req); validationErrors != nil {
		response := types.NewErrorResponseWithDetails("Validation failed", "validation_error", validationErrors)
		s.writeJSON(w, http.StatusBadRequest, response)
		return
	}

	// Create project in database
	project, err := s.storage.CreateProject(req)
	if err != nil {
		log.Printf("Failed to create project: %v", err)
		s.writeError(w, http.StatusInternalServerError, "Failed to create project")
		return
	}

	response := types.NewAPIResponseWithMessage(*project, "Project created successfully")
	s.writeJSON(w, http.StatusCreated, response)
}

// getTasks returns tasks for a project
func (s *Server) getTasks(w http.ResponseWriter, r *http.Request) {
	projectIDStr := r.URL.Query().Get("project_id")
	if projectIDStr == "" {
		s.writeError(w, http.StatusBadRequest, "project_id parameter is required")
		return
	}

	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil || projectID <= 0 {
		s.writeError(w, http.StatusBadRequest, "project_id must be a positive integer")
		return
	}

	// Get tasks from database
	tasks, err := s.storage.GetTasksByProject(projectID)
	if err != nil {
		log.Printf("Failed to get tasks for project %d: %v", projectID, err)
		s.writeError(w, http.StatusInternalServerError, "Failed to retrieve tasks")
		return
	}

	response := types.NewAPIResponse(tasks)
	s.writeJSON(w, http.StatusOK, response)
}

// createTask creates a new task
func (s *Server) createTask(w http.ResponseWriter, r *http.Request) {
	var req types.CreateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Sanitize input fields
	req.Title = sanitizeTaskTitle(req.Title)
	req.Description = sanitizeDescription(req.Description)

	// Validate the request
	if validationErrors := s.validateRequest(req); validationErrors != nil {
		response := types.NewErrorResponseWithDetails("Validation failed", "validation_error", validationErrors)
		s.writeJSON(w, http.StatusBadRequest, response)
		return
	}

	// Create task in database
	task, err := s.storage.CreateTask(req)
	if err != nil {
		log.Printf("Failed to create task: %v", err)
		s.writeError(w, http.StatusInternalServerError, "Failed to create task")
		return
	}

	response := types.NewAPIResponseWithMessage(*task, "Task created successfully")
	s.writeJSON(w, http.StatusCreated, response)
}

// handleTasksReorder handles task reordering requests
func (s *Server) handleTasksReorder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req types.ReorderTasksRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Validate the request
	if validationErrors := s.validateRequest(req); validationErrors != nil {
		response := types.NewErrorResponseWithDetails("Validation failed", "validation_error", validationErrors)
		s.writeJSON(w, http.StatusBadRequest, response)
		return
	}

	// Reorder tasks in database
	err := s.storage.ReorderTasks(req.Tasks)
	if err != nil {
		log.Printf("Failed to reorder tasks: %v", err)
		s.writeError(w, http.StatusInternalServerError, "Failed to reorder tasks")
		return
	}

	response := types.NewAPIResponseWithMessage(struct{}{}, "Tasks reordered successfully")
	s.writeJSON(w, http.StatusOK, response)
}

// handleTaskByID handles individual task operations
func (s *Server) handleTaskByID(w http.ResponseWriter, r *http.Request) {
	// Extract path after /api/tasks/
	path := r.URL.Path[len("/api/tasks/"):]
	if path == "" {
		s.writeError(w, http.StatusBadRequest, "Task ID is required")
		return
	}

	// Split path components
	pathParts := strings.Split(path, "/")
	if len(pathParts) == 0 || pathParts[0] == "" {
		s.writeError(w, http.StatusBadRequest, "Task ID is required")
		return
	}

	// Parse task ID
	taskID, err := strconv.Atoi(pathParts[0])
	if err != nil || taskID <= 0 {
		s.writeError(w, http.StatusBadRequest, "Invalid task ID")
		return
	}

	// Determine the operation based on path and method
	if len(pathParts) == 1 {
		// /api/tasks/{id}
		switch r.Method {
		case http.MethodGet:
			s.getTask(w, r, taskID)
		case http.MethodPut:
			s.updateTask(w, r, taskID)
		case http.MethodDelete:
			s.deleteTask(w, r, taskID)
		default:
			s.writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	} else if len(pathParts) == 2 && pathParts[1] == "status" {
		// /api/tasks/{id}/status
		switch r.Method {
		case http.MethodPatch:
			s.updateTaskStatus(w, r, taskID)
		default:
			s.writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	} else {
		s.writeError(w, http.StatusNotFound, "Endpoint not found")
	}
}

// getTask returns a specific task by ID
func (s *Server) getTask(w http.ResponseWriter, r *http.Request, taskID int) {
	task, err := s.storage.GetTask(taskID)
	if err != nil {
		log.Printf("Failed to get task %d: %v", taskID, err)
		s.writeError(w, http.StatusNotFound, "Task not found")
		return
	}

	response := types.NewAPIResponse(*task)
	s.writeJSON(w, http.StatusOK, response)
}

// updateTask updates a task by ID
func (s *Server) updateTask(w http.ResponseWriter, r *http.Request, taskID int) {
	var req types.CreateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Sanitize input fields
	req.Title = sanitizeTaskTitle(req.Title)
	req.Description = sanitizeDescription(req.Description)

	// Validate the request
	if validationErrors := s.validateRequest(req); validationErrors != nil {
		response := types.NewErrorResponseWithDetails("Validation failed", "validation_error", validationErrors)
		s.writeJSON(w, http.StatusBadRequest, response)
		return
	}

	// Update task in database
	task, err := s.storage.UpdateTask(taskID, req)
	if err != nil {
		log.Printf("Failed to update task %d: %v", taskID, err)
		s.writeError(w, http.StatusInternalServerError, "Failed to update task")
		return
	}

	response := types.NewAPIResponseWithMessage(*task, "Task updated successfully")
	s.writeJSON(w, http.StatusOK, response)
}

// deleteTask deletes a task by ID
func (s *Server) deleteTask(w http.ResponseWriter, r *http.Request, taskID int) {
	err := s.storage.DeleteTask(taskID)
	if err != nil {
		log.Printf("Failed to delete task %d: %v", taskID, err)
		s.writeError(w, http.StatusInternalServerError, "Failed to delete task")
		return
	}

	response := types.NewAPIResponseWithMessage(struct{}{}, "Task deleted successfully")
	s.writeJSON(w, http.StatusOK, response)
}

// updateTaskStatus updates only the status of a task
func (s *Server) updateTaskStatus(w http.ResponseWriter, r *http.Request, taskID int) {
	var req struct {
		Status types.TaskStatus `json:"status" validate:"required"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Validate the request
	if validationErrors := s.validateRequest(req); validationErrors != nil {
		response := types.NewErrorResponseWithDetails("Validation failed", "validation_error", validationErrors)
		s.writeJSON(w, http.StatusBadRequest, response)
		return
	}

	// Update task status in database
	task, err := s.storage.UpdateTaskStatus(taskID, req.Status)
	if err != nil {
		log.Printf("Failed to update task status %d: %v", taskID, err)
		s.writeError(w, http.StatusInternalServerError, "Failed to update task status")
		return
	}

	response := types.NewAPIResponseWithMessage(*task, "Task status updated successfully")
	s.writeJSON(w, http.StatusOK, response)
}
