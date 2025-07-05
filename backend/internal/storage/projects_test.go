package storage

import (
	"testing"

	"focused-todo/backend/pkg/types"

	_ "github.com/mattn/go-sqlite3"
)

func TestCreateProject(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	tests := []struct {
		name        string
		req         types.CreateProjectRequest
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid project",
			req: types.CreateProjectRequest{
				Name:        "Test Project",
				Description: "A test project",
				Color:       "#FF0000",
				Icon:        "test-icon",
			},
			expectError: false,
		},
		{
			name: "project without description",
			req: types.CreateProjectRequest{
				Name:  "Test Project",
				Color: "#FF0000",
				Icon:  "test-icon",
			},
			expectError: false,
		},
		{
			name: "project without color",
			req: types.CreateProjectRequest{
				Name:        "Test Project",
				Description: "A test project",
				Icon:        "test-icon",
			},
			expectError: false,
		},
		{
			name: "project without icon",
			req: types.CreateProjectRequest{
				Name:        "Test Project",
				Description: "A test project",
				Color:       "#FF0000",
			},
			expectError: false,
		},
		{
			name: "empty project name",
			req: types.CreateProjectRequest{
				Name:        "",
				Description: "A test project",
				Color:       "#FF0000",
				Icon:        "test-icon",
			},
			expectError: true,
			errorMsg:    "name cannot be empty",
		},
		{
			name: "duplicate project name",
			req: types.CreateProjectRequest{
				Name:        "Test Project",
				Description: "Another test project",
				Color:       "#00FF00",
				Icon:        "another-icon",
			},
			expectError: false, // Will be tested separately
		},
	}

	var firstProject *types.Project
	for i, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			project, err := s.CreateProject(tt.req)

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
				} else if tt.errorMsg != "" && !contains(err.Error(), tt.errorMsg) {
					t.Errorf("Expected error to contain '%s', got '%s'", tt.errorMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if project == nil {
					t.Errorf("Expected project but got nil")
				}
				if project != nil {
					if project.Name != tt.req.Name {
						t.Errorf("Expected name '%s', got '%s'", tt.req.Name, project.Name)
					}
					if project.ID == 0 {
						t.Errorf("Expected non-zero ID")
					}
					if i == 0 {
						firstProject = project
					}
				}
			}
		})
	}

	// Test duplicate name separately
	if firstProject != nil {
		duplicateReq := types.CreateProjectRequest{
			Name:        firstProject.Name,
			Description: "Duplicate project",
			Color:       "#0000FF",
			Icon:        "duplicate-icon",
		}
		_, err := s.CreateProject(duplicateReq)
		if err == nil {
			t.Errorf("Expected error when creating project with duplicate name")
		}
	}
}

func TestGetProject(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	// Create a test project
	project := createTestProject(t, s)

	// Test getting the project
	retrieved, err := s.GetProject(project.ID)
	if err != nil {
		t.Fatalf("Failed to get project: %v", err)
	}

	if retrieved.ID != project.ID {
		t.Errorf("Expected ID %d, got %d", project.ID, retrieved.ID)
	}

	if retrieved.Name != project.Name {
		t.Errorf("Expected name '%s', got '%s'", project.Name, retrieved.Name)
	}

	// Test getting nonexistent project
	_, err = s.GetProject(99999)
	if err == nil {
		t.Errorf("Expected error when getting nonexistent project")
	}
}

func TestGetProjects(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	// Initially should have no projects
	projects, err := s.GetProjects()
	if err != nil {
		t.Fatalf("Failed to get projects: %v", err)
	}

	if len(projects) != 0 {
		t.Errorf("Expected 0 projects initially, got %d", len(projects))
	}

	// Create multiple projects
	projectNames := []string{"Project A", "Project B", "Project C"}
	createdProjects := make([]*types.Project, 0, len(projectNames))

	for _, name := range projectNames {
		req := types.CreateProjectRequest{
			Name:        name,
			Description: "Test project: " + name,
			Color:       "#FF0000",
			Icon:        "test-icon",
		}
		project, err := s.CreateProject(req)
		if err != nil {
			t.Fatalf("Failed to create project '%s': %v", name, err)
		}
		createdProjects = append(createdProjects, project)
	}

	// Get all projects
	projects, err = s.GetProjects()
	if err != nil {
		t.Fatalf("Failed to get projects: %v", err)
	}

	if len(projects) != len(projectNames) {
		t.Errorf("Expected %d projects, got %d", len(projectNames), len(projects))
	}

	// Verify project names are present
	projectNameMap := make(map[string]bool)
	for _, project := range projects {
		projectNameMap[project.Name] = true
	}

	for _, expectedName := range projectNames {
		if !projectNameMap[expectedName] {
			t.Errorf("Expected project '%s' not found in results", expectedName)
		}
	}
}

func TestUpdateProject(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	// Create initial project
	project := createTestProject(t, s)

	// Update the project
	updateReq := types.CreateProjectRequest{
		Name:        "Updated Project",
		Description: "Updated description",
		Color:       "#00FF00",
		Icon:        "updated-icon",
	}

	updated, err := s.UpdateProject(project.ID, updateReq)
	if err != nil {
		t.Fatalf("Failed to update project: %v", err)
	}

	if updated.Name != updateReq.Name {
		t.Errorf("Expected name '%s', got '%s'", updateReq.Name, updated.Name)
	}

	if updated.Description != updateReq.Description {
		t.Errorf("Expected description '%s', got '%s'", updateReq.Description, updated.Description)
	}

	if updated.Color != updateReq.Color {
		t.Errorf("Expected color '%s', got '%s'", updateReq.Color, updated.Color)
	}

	// Test updating nonexistent project
	_, err = s.UpdateProject(99999, updateReq)
	if err == nil {
		t.Errorf("Expected error when updating nonexistent project")
	}
}

func TestDeleteProject(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	// Create project
	project := createTestProject(t, s)

	// Create a task in the project to test cascade delete
	task := createTestTask(t, s, project.ID)

	// Delete the project
	err := s.DeleteProject(project.ID)
	if err != nil {
		t.Fatalf("Failed to delete project: %v", err)
	}

	// Verify project is deleted
	_, err = s.GetProject(project.ID)
	if err == nil {
		t.Errorf("Expected error when getting deleted project")
	}

	// Verify associated task is also deleted
	_, err = s.GetTask(task.ID)
	if err == nil {
		t.Errorf("Expected error when getting task from deleted project")
	}

	// Test deleting nonexistent project
	err = s.DeleteProject(99999)
	if err == nil {
		t.Errorf("Expected error when deleting nonexistent project")
	}
}

func TestGetProjectStatistics(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)

	// Initially should have zero statistics
	stats, err := s.GetProjectStatistics(project.ID)
	if err != nil {
		t.Fatalf("Failed to get project statistics: %v", err)
	}

	totalTasks, ok := stats["total_tasks"].(int)
	if !ok || totalTasks != 0 {
		t.Errorf("Expected 0 total tasks initially, got %v", stats["total_tasks"])
	}

	// Create tasks with different statuses
	taskStatuses := []types.TaskStatus{
		types.TaskStatusPending,
		types.TaskStatusInProgress,
		types.TaskStatusCompleted,
		types.TaskStatusCancelled,
	}

	for i, status := range taskStatuses {
		req := types.CreateTaskRequest{
			ProjectID:   project.ID,
			Title:       "Test Task " + string(rune('A'+i)),
			Description: "Test task",
			Priority:    5,
		}
		task, err := s.CreateTask(req)
		if err != nil {
			t.Fatalf("Failed to create task: %v", err)
		}

		// Update task status if not pending
		if status != types.TaskStatusPending {
			_, err = s.UpdateTaskStatus(task.ID, status)
			if err != nil {
				t.Fatalf("Failed to update task status: %v", err)
			}
		}
	}

	// Get updated statistics
	stats, err = s.GetProjectStatistics(project.ID)
	if err != nil {
		t.Fatalf("Failed to get updated project statistics: %v", err)
	}

	totalTasks, ok = stats["total_tasks"].(int)
	if !ok || totalTasks != len(taskStatuses) {
		t.Errorf("Expected %d total tasks, got %v", len(taskStatuses), stats["total_tasks"])
	}

	completedTasks, ok := stats["completed_tasks"].(int)
	if !ok || completedTasks != 1 {
		t.Errorf("Expected 1 completed task, got %v", stats["completed_tasks"])
	}

	// Test statistics for nonexistent project
	_, err = s.GetProjectStatistics(99999)
	if err == nil {
		t.Errorf("Expected error when getting statistics for nonexistent project")
	}
}
