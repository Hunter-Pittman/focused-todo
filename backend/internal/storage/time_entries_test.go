package storage

import (
	"os"
	"testing"
	"time"

	"focused-todo/backend/pkg/types"

	_ "github.com/mattn/go-sqlite3"
)

// setupTestStorage creates a temporary database for testing
func setupTestStorage(t *testing.T) (*Storage, func()) {
	// Create a temporary file for the test database
	tmpfile, err := os.CreateTemp("", "test_*.db")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	tmpfile.Close()

	// Create storage instance
	storage, err := New(tmpfile.Name())
	if err != nil {
		os.Remove(tmpfile.Name())
		t.Fatalf("Failed to create storage: %v", err)
	}

	// Return cleanup function
	cleanup := func() {
		storage.Close()
		os.Remove(tmpfile.Name())
	}

	return storage, cleanup
}

// createTestProject creates a test project for use in tests
func createTestProject(t *testing.T, s *Storage) *types.Project {
	req := types.CreateProjectRequest{
		Name:        "Test Project",
		Description: "A test project",
		Color:       "#FF0000",
		Icon:        "test-icon",
	}

	project, err := s.CreateProject(req)
	if err != nil {
		t.Fatalf("Failed to create test project: %v", err)
	}

	return project
}

// createTestTask creates a test task for use in tests
func createTestTask(t *testing.T, s *Storage, projectID int) *types.Task {
	req := types.CreateTaskRequest{
		ProjectID:   projectID,
		Title:       "Test Task",
		Description: "A test task",
		Priority:    5,
	}

	task, err := s.CreateTask(req)
	if err != nil {
		t.Fatalf("Failed to create test task: %v", err)
	}

	return task
}

func TestCreateTimeEntry(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task := createTestTask(t, s, project.ID)

	startTime := time.Now().Add(-2 * time.Hour)
	endTime := time.Now().Add(-1 * time.Hour)

	tests := []struct {
		name        string
		req         types.CreateTimeEntryRequest
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid time entry",
			req: types.CreateTimeEntryRequest{
				TaskID:      task.ID,
				StartTime:   startTime,
				EndTime:     &endTime,
				Description: "Test work",
			},
			expectError: false,
		},
		{
			name: "time entry without end time",
			req: types.CreateTimeEntryRequest{
				TaskID:      task.ID,
				StartTime:   startTime,
				Description: "Ongoing work",
			},
			expectError: false,
		},
		{
			name: "nonexistent task",
			req: types.CreateTimeEntryRequest{
				TaskID:      99999,
				StartTime:   startTime,
				EndTime:     &endTime,
				Description: "Test work",
			},
			expectError: true,
			errorMsg:    "does not exist",
		},
		{
			name: "end time before start time",
			req: types.CreateTimeEntryRequest{
				TaskID:      task.ID,
				StartTime:   endTime,
				EndTime:     &startTime,
				Description: "Invalid time range",
			},
			expectError: true,
			errorMsg:    "end time cannot be before start time",
		},
		{
			name: "start time in future",
			req: types.CreateTimeEntryRequest{
				TaskID:      task.ID,
				StartTime:   time.Now().Add(1 * time.Hour),
				Description: "Future work",
			},
			expectError: true,
			errorMsg:    "start time cannot be in the future",
		},
		{
			name: "duration too long",
			req: types.CreateTimeEntryRequest{
				TaskID:      task.ID,
				StartTime:   startTime,
				EndTime:     &[]time.Time{startTime.Add(25 * time.Hour)}[0],
				Description: "Too long work",
			},
			expectError: true,
			errorMsg:    "cannot exceed 24 hours",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			timeEntry, err := s.CreateTimeEntry(tt.req)

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
				if timeEntry == nil {
					t.Errorf("Expected time entry but got nil")
				}
				if timeEntry != nil && timeEntry.TaskID != tt.req.TaskID {
					t.Errorf("Expected task ID %d, got %d", tt.req.TaskID, timeEntry.TaskID)
				}
			}
		})
	}
}

func TestStartStopTimeEntry(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task := createTestTask(t, s, project.ID)

	// Test starting a time entry
	startReq := types.StartTimeEntryRequest{
		TaskID:      task.ID,
		Description: "Started work",
	}

	timeEntry, err := s.StartTimeEntry(startReq)
	if err != nil {
		t.Fatalf("Failed to start time entry: %v", err)
	}

	if timeEntry.EndTime != nil {
		t.Errorf("Expected end time to be nil for active entry")
	}

	// Test starting another entry for same task (should fail)
	_, err = s.StartTimeEntry(startReq)
	if err == nil {
		t.Errorf("Expected error when starting second time entry for same task")
	}

	// Wait a short time to ensure measurable duration
	time.Sleep(1 * time.Second)

	// Test stopping the time entry
	stopReq := types.StopTimeEntryRequest{
		Description: "Finished work",
	}

	stoppedEntry, err := s.StopTimeEntry(task.ID, stopReq)
	if err != nil {
		t.Fatalf("Failed to stop time entry: %v", err)
	}

	if stoppedEntry.EndTime == nil {
		t.Errorf("Expected end time to be set after stopping")
	}

	if stoppedEntry.Duration == nil || *stoppedEntry.Duration == 0 {
		t.Errorf("Expected duration to be calculated after stopping")
	}

	if stoppedEntry.Description != stopReq.Description {
		t.Errorf("Expected description to be updated to '%s', got '%s'", stopReq.Description, stoppedEntry.Description)
	}
}

func TestGetTimeEntry(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task := createTestTask(t, s, project.ID)

	// Create a time entry
	startTime := time.Now().Add(-2 * time.Hour)
	endTime := time.Now().Add(-1 * time.Hour)
	req := types.CreateTimeEntryRequest{
		TaskID:      task.ID,
		StartTime:   startTime,
		EndTime:     &endTime,
		Description: "Test work",
	}

	created, err := s.CreateTimeEntry(req)
	if err != nil {
		t.Fatalf("Failed to create time entry: %v", err)
	}

	// Test getting the time entry
	retrieved, err := s.GetTimeEntry(created.ID)
	if err != nil {
		t.Fatalf("Failed to get time entry: %v", err)
	}

	if retrieved.ID != created.ID {
		t.Errorf("Expected ID %d, got %d", created.ID, retrieved.ID)
	}

	if retrieved.TaskID != created.TaskID {
		t.Errorf("Expected task ID %d, got %d", created.TaskID, retrieved.TaskID)
	}

	// Test getting nonexistent time entry
	_, err = s.GetTimeEntry(99999)
	if err == nil {
		t.Errorf("Expected error when getting nonexistent time entry")
	}
}

func TestGetTimeEntriesByTask(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task1 := createTestTask(t, s, project.ID)
	task2 := createTestTask(t, s, project.ID)

	// Create multiple time entries for task1 (non-overlapping)
	baseTime := time.Now().Add(-6 * time.Hour)
	for i := 0; i < 3; i++ {
		startTime := baseTime.Add(time.Duration(i*2) * time.Hour)
		endTime := startTime.Add(1 * time.Hour)
		req := types.CreateTimeEntryRequest{
			TaskID:      task1.ID,
			StartTime:   startTime,
			EndTime:     &endTime,
			Description: "Test work",
		}
		_, err := s.CreateTimeEntry(req)
		if err != nil {
			t.Fatalf("Failed to create time entry %d: %v", i, err)
		}
	}

	// Create one time entry for task2
	startTime := time.Now().Add(-1 * time.Hour)
	endTime := time.Now()
	req := types.CreateTimeEntryRequest{
		TaskID:      task2.ID,
		StartTime:   startTime,
		EndTime:     &endTime,
		Description: "Other task work",
	}
	_, err := s.CreateTimeEntry(req)
	if err != nil {
		t.Fatalf("Failed to create time entry for task2: %v", err)
	}

	// Get time entries for task1
	entries, err := s.GetTimeEntriesByTask(task1.ID)
	if err != nil {
		t.Fatalf("Failed to get time entries for task: %v", err)
	}

	if len(entries) != 3 {
		t.Errorf("Expected 3 time entries for task1, got %d", len(entries))
	}

	for _, entry := range entries {
		if entry.TaskID != task1.ID {
			t.Errorf("Expected task ID %d, got %d", task1.ID, entry.TaskID)
		}
	}

	// Get time entries for task2
	entries2, err := s.GetTimeEntriesByTask(task2.ID)
	if err != nil {
		t.Fatalf("Failed to get time entries for task2: %v", err)
	}

	if len(entries2) != 1 {
		t.Errorf("Expected 1 time entry for task2, got %d", len(entries2))
	}

	// Test getting time entries for nonexistent task
	_, err = s.GetTimeEntriesByTask(99999)
	if err == nil {
		t.Errorf("Expected error when getting time entries for nonexistent task")
	}
}

func TestGetTimeEntriesByProject(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project1 := createTestProject(t, s)
	project2 := createTestProject(t, s)

	task1 := createTestTask(t, s, project1.ID)
	task2 := createTestTask(t, s, project2.ID)

	// Create time entries for different projects
	baseTime := time.Now().Add(-6 * time.Hour)

	// Two entries for project1 (non-overlapping)
	for i := 0; i < 2; i++ {
		startTime := baseTime.Add(time.Duration(i*3) * time.Hour)
		endTime := startTime.Add(1 * time.Hour)
		req := types.CreateTimeEntryRequest{
			TaskID:      task1.ID,
			StartTime:   startTime,
			EndTime:     &endTime,
			Description: "Project 1 work",
		}
		_, err := s.CreateTimeEntry(req)
		if err != nil {
			t.Fatalf("Failed to create time entry for project1: %v", err)
		}
	}

	// One entry for project2 (further in the past, non-overlapping)
	startTime := baseTime.Add(-2 * time.Hour) // Earlier than project1 entries
	endTime := startTime.Add(1 * time.Hour)
	req := types.CreateTimeEntryRequest{
		TaskID:      task2.ID,
		StartTime:   startTime,
		EndTime:     &endTime,
		Description: "Project 2 work",
	}
	_, err := s.CreateTimeEntry(req)
	if err != nil {
		t.Fatalf("Failed to create time entry for project2: %v", err)
	}

	// Get time entries for project1
	entries1, err := s.GetTimeEntriesByProject(project1.ID)
	if err != nil {
		t.Fatalf("Failed to get time entries for project1: %v", err)
	}

	if len(entries1) != 2 {
		t.Errorf("Expected 2 time entries for project1, got %d", len(entries1))
	}

	// Get time entries for project2
	entries2, err := s.GetTimeEntriesByProject(project2.ID)
	if err != nil {
		t.Fatalf("Failed to get time entries for project2: %v", err)
	}

	if len(entries2) != 1 {
		t.Errorf("Expected 1 time entry for project2, got %d", len(entries2))
	}
}

func TestUpdateTimeEntry(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task := createTestTask(t, s, project.ID)

	// Create initial time entry
	startTime := time.Now().Add(-2 * time.Hour)
	endTime := time.Now().Add(-1 * time.Hour)
	req := types.CreateTimeEntryRequest{
		TaskID:      task.ID,
		StartTime:   startTime,
		EndTime:     &endTime,
		Description: "Original work",
	}

	created, err := s.CreateTimeEntry(req)
	if err != nil {
		t.Fatalf("Failed to create time entry: %v", err)
	}

	// Update the time entry
	newStartTime := startTime.Add(30 * time.Minute)
	newEndTime := endTime.Add(30 * time.Minute)
	updateReq := types.CreateTimeEntryRequest{
		TaskID:      task.ID,
		StartTime:   newStartTime,
		EndTime:     &newEndTime,
		Description: "Updated work",
	}

	updated, err := s.UpdateTimeEntry(created.ID, updateReq)
	if err != nil {
		t.Fatalf("Failed to update time entry: %v", err)
	}

	if updated.Description != updateReq.Description {
		t.Errorf("Expected description '%s', got '%s'", updateReq.Description, updated.Description)
	}

	if !updated.StartTime.Equal(newStartTime) {
		t.Errorf("Expected start time to be updated")
	}

	// Test updating nonexistent time entry
	_, err = s.UpdateTimeEntry(99999, updateReq)
	if err == nil {
		t.Errorf("Expected error when updating nonexistent time entry")
	}
}

func TestDeleteTimeEntry(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task := createTestTask(t, s, project.ID)

	// Create time entry
	startTime := time.Now().Add(-2 * time.Hour)
	endTime := time.Now().Add(-1 * time.Hour)
	req := types.CreateTimeEntryRequest{
		TaskID:      task.ID,
		StartTime:   startTime,
		EndTime:     &endTime,
		Description: "Test work",
	}

	created, err := s.CreateTimeEntry(req)
	if err != nil {
		t.Fatalf("Failed to create time entry: %v", err)
	}

	// Delete the time entry
	err = s.DeleteTimeEntry(created.ID)
	if err != nil {
		t.Fatalf("Failed to delete time entry: %v", err)
	}

	// Verify it's deleted
	_, err = s.GetTimeEntry(created.ID)
	if err == nil {
		t.Errorf("Expected error when getting deleted time entry")
	}

	// Test deleting nonexistent time entry
	err = s.DeleteTimeEntry(99999)
	if err == nil {
		t.Errorf("Expected error when deleting nonexistent time entry")
	}
}

func TestGetTaskTimeStatistics(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task := createTestTask(t, s, project.ID)

	// Create multiple completed time entries
	baseTime := time.Now().Add(-8 * time.Hour)
	durations := []time.Duration{30 * time.Minute, 45 * time.Minute, 60 * time.Minute}

	for i, duration := range durations {
		startTime := baseTime.Add(time.Duration(i) * 2 * time.Hour)
		endTime := startTime.Add(duration)
		req := types.CreateTimeEntryRequest{
			TaskID:      task.ID,
			StartTime:   startTime,
			EndTime:     &endTime,
			Description: "Test work",
		}
		_, err := s.CreateTimeEntry(req)
		if err != nil {
			t.Fatalf("Failed to create time entry %d: %v", i, err)
		}
	}

	// Get statistics
	stats, err := s.GetTaskTimeStatistics(task.ID)
	if err != nil {
		t.Fatalf("Failed to get time statistics: %v", err)
	}

	totalEntries, ok := stats["total_entries"].(int)
	if !ok || totalEntries != 3 {
		t.Errorf("Expected 3 total entries, got %v", stats["total_entries"])
	}

	totalDuration, ok := stats["total_duration"].(int)
	if !ok || totalDuration == 0 {
		t.Errorf("Expected non-zero total duration, got %v", stats["total_duration"])
	}

	// Verify total duration is sum of individual durations (in seconds)
	expectedTotal := int((30 + 45 + 60) * 60) // Convert minutes to seconds
	if totalDuration != expectedTotal {
		t.Errorf("Expected total duration %d seconds, got %d", expectedTotal, totalDuration)
	}
}

func TestValidateTaskTrackable(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task := createTestTask(t, s, project.ID)

	// Test with pending task (should be trackable)
	err := s.validateTaskTrackable(task.ID)
	if err != nil {
		t.Errorf("Pending task should be trackable, got error: %v", err)
	}

	// Set task to completed
	_, err = s.UpdateTaskStatus(task.ID, types.TaskStatusCompleted)
	if err != nil {
		t.Fatalf("Failed to update task status: %v", err)
	}

	// Test with completed task (should not be trackable)
	err = s.validateTaskTrackable(task.ID)
	if err == nil {
		t.Errorf("Completed task should not be trackable")
	}

	// Set task to cancelled
	_, err = s.UpdateTaskStatus(task.ID, types.TaskStatusCancelled)
	if err != nil {
		t.Fatalf("Failed to update task status: %v", err)
	}

	// Test with cancelled task (should not be trackable)
	err = s.validateTaskTrackable(task.ID)
	if err == nil {
		t.Errorf("Cancelled task should not be trackable")
	}
}

func TestOverlappingTimeEntries(t *testing.T) {
	s, cleanup := setupTestStorage(t)
	defer cleanup()

	project := createTestProject(t, s)
	task := createTestTask(t, s, project.ID)

	// Create first time entry
	startTime1 := time.Now().Add(-3 * time.Hour)
	endTime1 := time.Now().Add(-2 * time.Hour)
	req1 := types.CreateTimeEntryRequest{
		TaskID:      task.ID,
		StartTime:   startTime1,
		EndTime:     &endTime1,
		Description: "First work session",
	}

	_, err := s.CreateTimeEntry(req1)
	if err != nil {
		t.Fatalf("Failed to create first time entry: %v", err)
	}

	// Try to create overlapping time entry (should fail)
	startTime2 := startTime1.Add(30 * time.Minute) // Overlaps with first entry
	endTime2 := endTime1.Add(30 * time.Minute)
	req2 := types.CreateTimeEntryRequest{
		TaskID:      task.ID,
		StartTime:   startTime2,
		EndTime:     &endTime2,
		Description: "Overlapping work session",
	}

	_, err = s.CreateTimeEntry(req2)
	if err == nil {
		t.Errorf("Expected error when creating overlapping time entry")
	}

	// Create non-overlapping time entry (should succeed)
	startTime3 := endTime1.Add(30 * time.Minute) // Starts after first entry ends
	endTime3 := startTime3.Add(1 * time.Hour)
	req3 := types.CreateTimeEntryRequest{
		TaskID:      task.ID,
		StartTime:   startTime3,
		EndTime:     &endTime3,
		Description: "Non-overlapping work session",
	}

	_, err = s.CreateTimeEntry(req3)
	if err != nil {
		t.Errorf("Non-overlapping time entry should succeed, got error: %v", err)
	}
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
		(len(s) > len(substr) && func() bool {
			for i := 0; i <= len(s)-len(substr); i++ {
				if s[i:i+len(substr)] == substr {
					return true
				}
			}
			return false
		}()))
}
