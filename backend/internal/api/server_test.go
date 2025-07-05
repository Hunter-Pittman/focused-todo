package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"focused-todo/backend/internal/config"
	"focused-todo/backend/internal/storage"
	"focused-todo/backend/pkg/types"

	_ "github.com/mattn/go-sqlite3"
)

// setupTestServer creates a test server with in-memory database
func setupTestServer(t *testing.T) (*Server, func()) {
	// Create a temporary file for the test database
	tmpfile, err := os.CreateTemp("", "test_api_*.db")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	tmpfile.Close()

	// Create storage instance
	store, err := storage.New(tmpfile.Name())
	if err != nil {
		os.Remove(tmpfile.Name())
		t.Fatalf("Failed to create storage: %v", err)
	}

	// Create server config
	cfg := &config.Config{
		Port:           8080,
		DatabasePath:   tmpfile.Name(),
		LogLevel:       "error", // Reduce log noise in tests
		RateLimitRPS:   1000,    // High limit for tests
		MaxRequestSize: 1024 * 1024,
	}

	// Create server
	server, err := New(cfg, store)
	if err != nil {
		store.Close()
		os.Remove(tmpfile.Name())
		t.Fatalf("Failed to create server: %v", err)
	}

	// Return cleanup function
	cleanup := func() {
		store.Close()
		os.Remove(tmpfile.Name())
	}

	return server, cleanup
}

// createTestProject creates a test project via API
func createTestProject(t *testing.T, server *Server) *types.Project {
	req := types.CreateProjectRequest{
		Name:        "Test Project",
		Description: "A test project",
		Color:       "#FF0000",
		Icon:        "test-icon",
	}

	body, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Failed to marshal project request: %v", err)
	}

	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/api/projects", bytes.NewReader(body))
	r.Header.Set("Content-Type", "application/json")

	server.handleProjects(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("Failed to create test project: status %d, body: %s", w.Code, w.Body.String())
	}

	var response types.APIResponse[*types.Project]
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal project response: %v", err)
	}

	return response.Data
}

// createTestTask creates a test task via API
func createTestTask(t *testing.T, server *Server, projectID int) *types.Task {
	req := types.CreateTaskRequest{
		ProjectID:   projectID,
		Title:       "Test Task",
		Description: "A test task",
		Priority:    5,
	}

	body, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Failed to marshal task request: %v", err)
	}

	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/api/tasks", bytes.NewReader(body))
	r.Header.Set("Content-Type", "application/json")

	server.handleTasks(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("Failed to create test task: status %d, body: %s", w.Code, w.Body.String())
	}

	var response types.APIResponse[*types.Task]
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal task response: %v", err)
	}

	return response.Data
}

func TestHealthEndpoint(t *testing.T) {
	server, cleanup := setupTestServer(t)
	defer cleanup()

	w := httptest.NewRecorder()
	r := httptest.NewRequest("GET", "/api/health", nil)

	server.handleHealth(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response types.HealthResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal health response: %v", err)
	}

	if response.Status != "ok" {
		t.Errorf("Expected status 'ok', got '%s'", response.Status)
	}

	if response.Timestamp == 0 {
		t.Errorf("Expected non-zero timestamp")
	}
}

func TestProjectsAPI(t *testing.T) {
	server, cleanup := setupTestServer(t)
	defer cleanup()

	t.Run("GET empty projects", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/api/projects", nil)

		server.handleProjects(w, r)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}

		var response types.APIResponse[[]*types.Project]
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf("Failed to unmarshal projects response: %v", err)
		}

		if len(response.Data) != 0 {
			t.Errorf("Expected 0 projects, got %d", len(response.Data))
		}
	})

	t.Run("POST create project", func(t *testing.T) {
		req := types.CreateProjectRequest{
			Name:        "Test Project",
			Description: "A test project",
			Color:       "#FF0000",
			Icon:        "test-icon",
		}

		body, err := json.Marshal(req)
		if err != nil {
			t.Fatalf("Failed to marshal request: %v", err)
		}

		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/api/projects", bytes.NewReader(body))
		r.Header.Set("Content-Type", "application/json")

		server.handleProjects(w, r)

		if w.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", w.Code)
		}

		var response types.APIResponse[*types.Project]
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		project := response.Data
		if project.Name != req.Name {
			t.Errorf("Expected name '%s', got '%s'", req.Name, project.Name)
		}

		if project.ID == 0 {
			t.Errorf("Expected non-zero ID")
		}
	})

	t.Run("POST create project with invalid data", func(t *testing.T) {
		req := types.CreateProjectRequest{
			Name:        "", // Invalid: empty name
			Description: "A test project",
			Color:       "#FF0000",
			Icon:        "test-icon",
		}

		body, err := json.Marshal(req)
		if err != nil {
			t.Fatalf("Failed to marshal request: %v", err)
		}

		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/api/projects", bytes.NewReader(body))
		r.Header.Set("Content-Type", "application/json")

		server.handleProjects(w, r)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400, got %d", w.Code)
		}
	})

	t.Run("POST with malformed JSON", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/api/projects", strings.NewReader("{invalid json}"))
		r.Header.Set("Content-Type", "application/json")

		server.handleProjects(w, r)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400, got %d", w.Code)
		}
	})

	t.Run("unsupported method", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("DELETE", "/api/projects", nil)

		server.handleProjects(w, r)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("Expected status 405, got %d", w.Code)
		}
	})
}

func TestTasksAPI(t *testing.T) {
	server, cleanup := setupTestServer(t)
	defer cleanup()

	// Create a project first
	project := createTestProject(t, server)

	t.Run("GET tasks for project", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/api/tasks?project_id="+string(rune(project.ID+'0')), nil)

		server.handleTasks(w, r)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}

		var response types.APIResponse[[]*types.Task]
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf("Failed to unmarshal tasks response: %v", err)
		}

		if len(response.Data) != 0 {
			t.Errorf("Expected 0 tasks initially, got %d", len(response.Data))
		}
	})

	t.Run("GET tasks without project_id", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/api/tasks", nil)

		server.handleTasks(w, r)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400, got %d", w.Code)
		}
	})

	t.Run("POST create task", func(t *testing.T) {
		req := types.CreateTaskRequest{
			ProjectID:   project.ID,
			Title:       "Test Task",
			Description: "A test task",
			Priority:    5,
		}

		body, err := json.Marshal(req)
		if err != nil {
			t.Fatalf("Failed to marshal request: %v", err)
		}

		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/api/tasks", bytes.NewReader(body))
		r.Header.Set("Content-Type", "application/json")

		server.handleTasks(w, r)

		if w.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", w.Code)
		}

		var response types.APIResponse[*types.Task]
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		task := response.Data
		if task.Title != req.Title {
			t.Errorf("Expected title '%s', got '%s'", req.Title, task.Title)
		}

		if task.ProjectID != req.ProjectID {
			t.Errorf("Expected project ID %d, got %d", req.ProjectID, task.ProjectID)
		}
	})

	t.Run("POST create task with invalid data", func(t *testing.T) {
		req := types.CreateTaskRequest{
			ProjectID:   project.ID,
			Title:       "", // Invalid: empty title
			Description: "A test task",
			Priority:    5,
		}

		body, err := json.Marshal(req)
		if err != nil {
			t.Fatalf("Failed to marshal request: %v", err)
		}

		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/api/tasks", bytes.NewReader(body))
		r.Header.Set("Content-Type", "application/json")

		server.handleTasks(w, r)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400, got %d", w.Code)
		}
	})

	t.Run("unsupported method", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("PUT", "/api/tasks", nil)

		server.handleTasks(w, r)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("Expected status 405, got %d", w.Code)
		}
	})
}

func TestTasksReorderAPI(t *testing.T) {
	server, cleanup := setupTestServer(t)
	defer cleanup()

	// Create a project and multiple tasks
	project := createTestProject(t, server)
	task1 := createTestTask(t, server, project.ID)
	task2 := createTestTask(t, server, project.ID)

	t.Run("POST reorder tasks", func(t *testing.T) {
		req := types.ReorderTasksRequest{
			Tasks: []types.ReorderTaskRequest{
				{ID: task2.ID, Position: 1},
				{ID: task1.ID, Position: 2},
			},
		}

		body, err := json.Marshal(req)
		if err != nil {
			t.Fatalf("Failed to marshal request: %v", err)
		}

		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/api/tasks/reorder", bytes.NewReader(body))
		r.Header.Set("Content-Type", "application/json")

		server.handleTasksReorder(w, r)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d, body: %s", w.Code, w.Body.String())
		}
	})

	t.Run("POST reorder with invalid data", func(t *testing.T) {
		req := types.ReorderTasksRequest{
			Tasks: []types.ReorderTaskRequest{
				{ID: 99999, Position: 1}, // Invalid: nonexistent task
			},
		}

		body, err := json.Marshal(req)
		if err != nil {
			t.Fatalf("Failed to marshal request: %v", err)
		}

		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/api/tasks/reorder", bytes.NewReader(body))
		r.Header.Set("Content-Type", "application/json")

		server.handleTasksReorder(w, r)

		if w.Code != http.StatusInternalServerError {
			t.Errorf("Expected status 500, got %d", w.Code)
		}
	})

	t.Run("unsupported method", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/api/tasks/reorder", nil)

		server.handleTasksReorder(w, r)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("Expected status 405, got %d", w.Code)
		}
	})
}

func TestMiddlewares(t *testing.T) {
	server, cleanup := setupTestServer(t)
	defer cleanup()

	t.Run("CORS headers", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/api/health", nil)

		// Apply security headers middleware
		handler := server.securityHeadersMiddleware(http.HandlerFunc(server.handleHealth))
		handler.ServeHTTP(w, r)

		// Check CORS headers
		if w.Header().Get("Access-Control-Allow-Origin") == "" {
			t.Errorf("Expected CORS headers to be set")
		}
	})

	t.Run("Rate limiting", func(t *testing.T) {
		// Make many requests quickly to trigger rate limiting
		for i := 0; i < 10; i++ {
			w := httptest.NewRecorder()
			r := httptest.NewRequest("GET", "/api/health", nil)

			handler := server.rateLimitMiddleware(http.HandlerFunc(server.handleHealth))
			handler.ServeHTTP(w, r)

			// For this test, we just verify the middleware doesn't crash
			// In a real scenario, you'd want to test actual rate limiting
		}
	})

	t.Run("Request size limit", func(t *testing.T) {
		// Create a request with large body
		largeBody := strings.Repeat("x", 2*1024*1024) // 2MB

		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/api/projects", strings.NewReader(largeBody))
		r.Header.Set("Content-Type", "application/json")

		handler := server.bodySizeLimitMiddleware(http.HandlerFunc(server.handleProjects))
		handler.ServeHTTP(w, r)

		if w.Code != http.StatusRequestEntityTooLarge {
			t.Errorf("Expected status 413, got %d", w.Code)
		}
	})

	t.Run("Logging middleware", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/api/health", nil)

		handler := server.loggingMiddleware(http.HandlerFunc(server.handleHealth))
		handler.ServeHTTP(w, r)

		// Just verify it doesn't crash - actual logging verification would need a logger mock
		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}
	})
}

func TestServerLifecycle(t *testing.T) {
	server, cleanup := setupTestServer(t)
	defer cleanup()

	// Test graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	// Server should shut down without error
	if err := server.Shutdown(ctx); err != nil {
		t.Errorf("Expected clean shutdown, got error: %v", err)
	}
}

func TestInputSanitization(t *testing.T) {
	server, cleanup := setupTestServer(t)
	defer cleanup()

	t.Run("sanitize project name", func(t *testing.T) {
		req := types.CreateProjectRequest{
			Name:        "  Test Project  ", // Extra whitespace
			Description: "A test project",
			Color:       "#FF0000",
			Icon:        "test-icon",
		}

		body, err := json.Marshal(req)
		if err != nil {
			t.Fatalf("Failed to marshal request: %v", err)
		}

		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/api/projects", bytes.NewReader(body))
		r.Header.Set("Content-Type", "application/json")

		server.handleProjects(w, r)

		if w.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", w.Code)
		}

		var response types.APIResponse[*types.Project]
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		// Name should be trimmed
		if response.Data.Name != "Test Project" {
			t.Errorf("Expected sanitized name 'Test Project', got '%s'", response.Data.Name)
		}
	})

	t.Run("sanitize malicious input", func(t *testing.T) {
		req := types.CreateProjectRequest{
			Name:        "<script>alert('xss')</script>",
			Description: "A test project",
			Color:       "#FF0000",
			Icon:        "test-icon",
		}

		body, err := json.Marshal(req)
		if err != nil {
			t.Fatalf("Failed to marshal request: %v", err)
		}

		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/api/projects", bytes.NewReader(body))
		r.Header.Set("Content-Type", "application/json")

		server.handleProjects(w, r)

		if w.Code != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", w.Code)
		}

		var response types.APIResponse[*types.Project]
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		// Script tags should be sanitized
		if strings.Contains(response.Data.Name, "<script>") {
			t.Errorf("Expected script tags to be sanitized, got '%s'", response.Data.Name)
		}
	})
}