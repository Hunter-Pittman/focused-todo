package storage

import (
	"testing"
	"time"

	"focused-todo/backend/pkg/types"

	_ "github.com/mattn/go-sqlite3"
)

func TestCreateTask(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)

	tests := []struct {
		name        string
		req         types.CreateTaskRequest
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid task",
			req: types.CreateTaskRequest{
				ProjectID:   project.ID,
				Title:       "Test Task",
				Description: "A test task",
				Priority:    5,
			},
			expectError: false,
		},
		{
			name: "task without description",
			req: types.CreateTaskRequest{
				ProjectID: project.ID,
				Title:     "Test Task",
				Priority:  3,
			},
			expectError: false,
		},
		{
			name: "task with maximum priority",
			req: types.CreateTaskRequest{
				ProjectID:   project.ID,
				Title:       "High Priority Task",
				Description: "Very important task",
				Priority:    10,
			},
			expectError: false,
		},
		{
			name: "task with minimum priority",
			req: types.CreateTaskRequest{
				ProjectID:   project.ID,
				Title:       "Low Priority Task",
				Description: "Not urgent task",
				Priority:    1,
			},
			expectError: false,
		},
		{
			name: "empty task title",
			req: types.CreateTaskRequest{
				ProjectID:   project.ID,
				Title:       "",
				Description: "Task without title",
				Priority:    5,
			},
			expectError: true,
			errorMsg:    "title cannot be empty",
		},
		{
			name: "invalid priority (too high)",
			req: types.CreateTaskRequest{
				ProjectID:   project.ID,
				Title:       "Invalid Priority Task",
				Description: "Task with invalid priority",
				Priority:    11,
			},
			expectError: true,
			errorMsg:    "priority must be between 1 and 10",
		},
		{
			name: "invalid priority (too low)",
			req: types.CreateTaskRequest{
				ProjectID:   project.ID,
				Title:       "Invalid Priority Task",
				Description: "Task with invalid priority",
				Priority:    0,
			},
			expectError: true,
			errorMsg:    "priority must be between 1 and 10",
		},
		{
			name: "nonexistent project",
			req: types.CreateTaskRequest{
				ProjectID:   99999,
				Title:       "Orphan Task",
				Description: "Task for nonexistent project",
				Priority:    5,
			},
			expectError: true,
			errorMsg:    "project does not exist",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			task, err := s.CreateTask(tt.req)

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
				if task == nil {
					t.Errorf("Expected task but got nil")
				}
				if task != nil {
					if task.Title != tt.req.Title {
						t.Errorf("Expected title '%s', got '%s'", tt.req.Title, task.Title)
					}
					if task.ProjectID != tt.req.ProjectID {
						t.Errorf("Expected project ID %d, got %d", tt.req.ProjectID, task.ProjectID)
					}
					if task.Status != types.TaskStatusPending {
						t.Errorf("Expected status to be pending, got %s", task.Status)
					}
					if task.ID == 0 {
						t.Errorf("Expected non-zero ID")
					}
				}
			}
		})
	}
}

func TestGetTask(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task := createTestTask(t, s, project.ID)

	// Test getting the task
	retrieved, err := s.GetTask(task.ID)
	if err != nil {
		t.Fatalf("Failed to get task: %v", err)
	}

	if retrieved.ID != task.ID {
		t.Errorf("Expected ID %d, got %d", task.ID, retrieved.ID)
	}

	if retrieved.Title != task.Title {
		t.Errorf("Expected title '%s', got '%s'", task.Title, retrieved.Title)
	}

	if retrieved.ProjectID != task.ProjectID {
		t.Errorf("Expected project ID %d, got %d", task.ProjectID, retrieved.ProjectID)
	}

	// Test getting nonexistent task
	_, err = s.GetTask(99999)
	if err == nil {
		t.Errorf("Expected error when getting nonexistent task")
	}
}

func TestGetTasksByProject(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project1 := createTestProject(t, s)
	project2 := createTestProject(t, s)

	// Initially should have no tasks
	tasks, err := s.GetTasksByProject(project1.ID)
	if err != nil {
		t.Fatalf("Failed to get tasks: %v", err)
	}

	if len(tasks) != 0 {
		t.Errorf("Expected 0 tasks initially, got %d", len(tasks))
	}

	// Create multiple tasks for project1
	taskTitles := []string{"Task A", "Task B", "Task C"}
	createdTasks := make([]*types.Task, 0, len(taskTitles))

	for i, title := range taskTitles {
		req := types.CreateTaskRequest{
			ProjectID:   project1.ID,
			Title:       title,
			Description: "Test task: " + title,
			Priority:    i + 1,
		}
		task, err := s.CreateTask(req)
		if err != nil {
			t.Fatalf("Failed to create task '%s': %v", title, err)
		}
		createdTasks = append(createdTasks, task)
	}

	// Create one task for project2
	req := types.CreateTaskRequest{
		ProjectID:   project2.ID,
		Title:       "Project 2 Task",
		Description: "Task for project 2",
		Priority:    5,
	}
	_, err = s.CreateTask(req)
	if err != nil {
		t.Fatalf("Failed to create task for project2: %v", err)
	}

	// Get tasks for project1
	tasks, err = s.GetTasksByProject(project1.ID)
	if err != nil {
		t.Fatalf("Failed to get tasks for project1: %v", err)
	}

	if len(tasks) != len(taskTitles) {
		t.Errorf("Expected %d tasks for project1, got %d", len(taskTitles), len(tasks))
	}

	// Verify task titles are present
	taskTitleMap := make(map[string]bool)
	for _, task := range tasks {
		taskTitleMap[task.Title] = true
		// Verify all tasks belong to project1
		if task.ProjectID != project1.ID {
			t.Errorf("Expected task to belong to project %d, got %d", project1.ID, task.ProjectID)
		}
	}

	for _, expectedTitle := range taskTitles {
		if !taskTitleMap[expectedTitle] {
			t.Errorf("Expected task '%s' not found in results", expectedTitle)
		}
	}

	// Get tasks for project2
	tasks2, err := s.GetTasksByProject(project2.ID)
	if err != nil {
		t.Fatalf("Failed to get tasks for project2: %v", err)
	}

	if len(tasks2) != 1 {
		t.Errorf("Expected 1 task for project2, got %d", len(tasks2))
	}

	// Test getting tasks for nonexistent project
	_, err = s.GetTasksByProject(99999)
	if err == nil {
		t.Errorf("Expected error when getting tasks for nonexistent project")
	}
}

func TestUpdateTask(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task := createTestTask(t, s, project.ID)

	// Update the task
	updateReq := types.CreateTaskRequest{
		ProjectID:   project.ID,
		Title:       "Updated Task",
		Description: "Updated description",
		Priority:    8,
	}

	updated, err := s.UpdateTask(task.ID, updateReq)
	if err != nil {
		t.Fatalf("Failed to update task: %v", err)
	}

	if updated.Title != updateReq.Title {
		t.Errorf("Expected title '%s', got '%s'", updateReq.Title, updated.Title)
	}

	if updated.Description != updateReq.Description {
		t.Errorf("Expected description '%s', got '%s'", updateReq.Description, updated.Description)
	}

	if updated.Priority != updateReq.Priority {
		t.Errorf("Expected priority %d, got %d", updateReq.Priority, updated.Priority)
	}

	// Verify updated timestamp is set
	if updated.UpdatedAt.IsZero() {
		t.Errorf("Expected updated_at to be set")
	}

	// Test updating nonexistent task
	_, err = s.UpdateTask(99999, updateReq)
	if err == nil {
		t.Errorf("Expected error when updating nonexistent task")
	}
}

func TestUpdateTaskStatus(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task := createTestTask(t, s, project.ID)

	// Initially should be pending
	if task.Status != types.TaskStatusPending {
		t.Errorf("Expected initial status to be pending, got %s", task.Status)
	}

	statuses := []types.TaskStatus{
		types.TaskStatusInProgress,
		types.TaskStatusCompleted,
		types.TaskStatusCancelled,
		types.TaskStatusPending,
	}

	for _, status := range statuses {
		t.Run(string(status), func(t *testing.T) {
			updated, err := s.UpdateTaskStatus(task.ID, status)
			if err != nil {
				t.Fatalf("Failed to update task status to %s: %v", status, err)
			}

			if updated.Status != status {
				t.Errorf("Expected status %s, got %s", status, updated.Status)
			}

			// Verify completion timestamp is set for completed tasks
			if status == types.TaskStatusCompleted {
				if updated.CompletedAt == nil {
					t.Errorf("Expected completed_at to be set for completed task")
				}
			} else {
				if updated.CompletedAt != nil {
					t.Errorf("Expected completed_at to be nil for non-completed task")
				}
			}

			// Update the task variable for next iteration
			task = updated
		})
	}

	// Test updating nonexistent task
	_, err := s.UpdateTaskStatus(99999, types.TaskStatusCompleted)
	if err == nil {
		t.Errorf("Expected error when updating status of nonexistent task")
	}
}

func TestDeleteTask(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task := createTestTask(t, s, project.ID)

	// Create time entries for the task to test cascade delete
	startTime := time.Now().Add(-2 * time.Hour)
	endTime := time.Now().Add(-1 * time.Hour)
	timeReq := types.CreateTimeEntryRequest{
		TaskID:      task.ID,
		StartTime:   startTime,
		EndTime:     &endTime,
		Description: "Test work",
	}
	timeEntry, err := s.CreateTimeEntry(timeReq)
	if err != nil {
		t.Fatalf("Failed to create time entry: %v", err)
	}

	// Delete the task
	err = s.DeleteTask(task.ID)
	if err != nil {
		t.Fatalf("Failed to delete task: %v", err)
	}

	// Verify task is deleted
	_, err = s.GetTask(task.ID)
	if err == nil {
		t.Errorf("Expected error when getting deleted task")
	}

	// Verify associated time entries are also deleted
	_, err = s.GetTimeEntry(timeEntry.ID)
	if err == nil {
		t.Errorf("Expected error when getting time entry from deleted task")
	}

	// Test deleting nonexistent task
	err = s.DeleteTask(99999)
	if err == nil {
		t.Errorf("Expected error when deleting nonexistent task")
	}
}

func TestReorderTasks(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)

	// Create multiple tasks
	taskCount := 5
	tasks := make([]*types.Task, 0, taskCount)

	for i := 0; i < taskCount; i++ {
		req := types.CreateTaskRequest{
			ProjectID:   project.ID,
			Title:       "Task " + string(rune('A'+i)),
			Description: "Test task",
			Priority:    5,
		}
		task, err := s.CreateTask(req)
		if err != nil {
			t.Fatalf("Failed to create task %d: %v", i, err)
		}
		tasks = append(tasks, task)
	}

	// Reorder tasks (reverse order)
	reorderReqs := make([]types.ReorderTaskRequest, len(tasks))
	for i, task := range tasks {
		reorderReqs[len(tasks)-1-i] = types.ReorderTaskRequest{
			ID:       task.ID,
			Position: i + 1,
		}
	}

	err := s.ReorderTasks(reorderReqs)
	if err != nil {
		t.Fatalf("Failed to reorder tasks: %v", err)
	}

	// Verify new order
	reorderedTasks, err := s.GetTasksByProject(project.ID)
	if err != nil {
		t.Fatalf("Failed to get reordered tasks: %v", err)
	}

	if len(reorderedTasks) != len(tasks) {
		t.Errorf("Expected %d tasks after reorder, got %d", len(tasks), len(reorderedTasks))
	}

	// Verify tasks are in the new order (reverse of original)
	for i, task := range reorderedTasks {
		expectedTitle := "Task " + string(rune('A'+(len(tasks)-1-i)))
		if task.Title != expectedTitle {
			t.Errorf("Expected task at position %d to be '%s', got '%s'", i, expectedTitle, task.Title)
		}
	}

	// Test reordering with invalid task ID
	invalidReorderReqs := []types.ReorderTaskRequest{
		{ID: 99999, Position: 1},
	}
	err = s.ReorderTasks(invalidReorderReqs)
	if err == nil {
		t.Errorf("Expected error when reordering with invalid task ID")
	}
}

func TestGetTaskStatistics(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)

	// Initially should have zero statistics
	stats, err := s.GetTaskStatistics(project.ID)
	if err != nil {
		t.Fatalf("Failed to get task statistics: %v", err)
	}

	totalTasks, ok := stats["total_tasks"].(int)
	if !ok || totalTasks != 0 {
		t.Errorf("Expected 0 total tasks initially, got %v", stats["total_tasks"])
	}

	// Create tasks with different statuses and priorities
	taskData := []struct {
		status   types.TaskStatus
		priority int
	}{
		{types.TaskStatusPending, 5},
		{types.TaskStatusInProgress, 8},
		{types.TaskStatusCompleted, 3},
		{types.TaskStatusCompleted, 7},
		{types.TaskStatusCancelled, 2},
	}

	for i, data := range taskData {
		req := types.CreateTaskRequest{
			ProjectID:   project.ID,
			Title:       "Task " + string(rune('A'+i)),
			Description: "Test task",
			Priority:    data.priority,
		}
		task, err := s.CreateTask(req)
		if err != nil {
			t.Fatalf("Failed to create task: %v", err)
		}

		// Update task status if not pending
		if data.status != types.TaskStatusPending {
			_, err = s.UpdateTaskStatus(task.ID, data.status)
			if err != nil {
				t.Fatalf("Failed to update task status: %v", err)
			}
		}
	}

	// Get updated statistics
	stats, err = s.GetTaskStatistics(project.ID)
	if err != nil {
		t.Fatalf("Failed to get updated task statistics: %v", err)
	}

	totalTasks, ok = stats["total_tasks"].(int)
	if !ok || totalTasks != len(taskData) {
		t.Errorf("Expected %d total tasks, got %v", len(taskData), stats["total_tasks"])
	}

	completedTasks, ok := stats["completed_tasks"].(int)
	if !ok || completedTasks != 2 {
		t.Errorf("Expected 2 completed tasks, got %v", stats["completed_tasks"])
	}

	pendingTasks, ok := stats["pending_tasks"].(int)
	if !ok || pendingTasks != 1 {
		t.Errorf("Expected 1 pending task, got %v", stats["pending_tasks"])
	}

	// Test statistics for nonexistent project
	_, err = s.GetTaskStatistics(99999)
	if err == nil {
		t.Errorf("Expected error when getting statistics for nonexistent project")
	}
}

func TestTaskDueDates(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)

	// Create task with due date
	dueDate := time.Now().Add(24 * time.Hour)
	req := types.CreateTaskRequest{
		ProjectID:   project.ID,
		Title:       "Task with Due Date",
		Description: "Test task with due date",
		Priority:    5,
		DueDate:     &dueDate,
	}

	task, err := s.CreateTask(req)
	if err != nil {
		t.Fatalf("Failed to create task with due date: %v", err)
	}

	if task.DueDate == nil {
		t.Errorf("Expected due date to be set")
	} else if !task.DueDate.Equal(dueDate) {
		t.Errorf("Expected due date %v, got %v", dueDate, *task.DueDate)
	}

	// Test updating due date
	newDueDate := time.Now().Add(48 * time.Hour)
	updateReq := types.CreateTaskRequest{
		ProjectID:   project.ID,
		Title:       task.Title,
		Description: task.Description,
		Priority:    task.Priority,
		DueDate:     &newDueDate,
	}

	updated, err := s.UpdateTask(task.ID, updateReq)
	if err != nil {
		t.Fatalf("Failed to update task due date: %v", err)
	}

	if updated.DueDate == nil {
		t.Errorf("Expected due date to be set after update")
	} else if !updated.DueDate.Equal(newDueDate) {
		t.Errorf("Expected updated due date %v, got %v", newDueDate, *updated.DueDate)
	}

	// Test removing due date
	updateReq.DueDate = nil
	updated, err = s.UpdateTask(task.ID, updateReq)
	if err != nil {
		t.Fatalf("Failed to remove task due date: %v", err)
	}

	if updated.DueDate != nil {
		t.Errorf("Expected due date to be nil after removal, got %v", *updated.DueDate)
	}
}
