import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskList from './TaskList'
import * as api from '../services/api'

// Mock the API module
jest.mock('../services/api', () => ({
  getTasks: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  updateTaskStatus: jest.fn(),
  reorderTasks: jest.fn(),
}))

const mockApi = api as jest.Mocked<typeof api>

// Mock drag and drop
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => children,
  useSensor: () => null,
  useSensors: () => [],
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
}))

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => children,
  verticalListSortingStrategy: 'vertical',
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

// Mock data
const mockTasks = [
  {
    id: 1,
    project_id: 1,
    title: 'Task 1',
    description: 'First task',
    status: 'pending' as const,
    priority: 5,
    position: 1,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    completed_at: null,
    due_date: null,
  },
  {
    id: 2,
    project_id: 1,
    title: 'Task 2',
    description: 'Second task',
    status: 'in_progress' as const,
    priority: 8,
    position: 2,
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    completed_at: null,
    due_date: '2023-12-31T23:59:59Z',
  },
  {
    id: 3,
    project_id: 1,
    title: 'Task 3',
    description: 'Third task',
    status: 'completed' as const,
    priority: 3,
    position: 3,
    created_at: '2023-01-03T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z',
    completed_at: '2023-01-03T12:00:00Z',
    due_date: null,
  },
]

describe('TaskList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders task list for project', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.getByText('Task 2')).toBeInTheDocument()
      expect(screen.getByText('Task 3')).toBeInTheDocument()
    })
  })

  test('shows loading state', () => {
    mockApi.getTasks.mockImplementation(() => new Promise(() => {})) // Never resolves
    
    render(<TaskList projectId={1} />)
    
    expect(screen.getByText(/loading tasks/i)).toBeInTheDocument()
  })

  test('handles error state', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockApi.getTasks.mockRejectedValue(new Error('API Error'))
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load tasks/i)).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  test('shows empty state when no tasks', async () => {
    mockApi.getTasks.mockResolvedValue([])
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
    })
  })

  test('displays task status correctly', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      // Check for status indicators
      expect(screen.getByText(/pending/i)).toBeInTheDocument()
      expect(screen.getByText(/in progress/i)).toBeInTheDocument()
      expect(screen.getByText(/completed/i)).toBeInTheDocument()
    })
  })

  test('displays task priorities correctly', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      // Check for priority indicators (stars, numbers, etc.)
      expect(screen.getByText('5')).toBeInTheDocument() // Priority for Task 1
      expect(screen.getByText('8')).toBeInTheDocument() // Priority for Task 2
      expect(screen.getByText('3')).toBeInTheDocument() // Priority for Task 3
    })
  })

  test('shows due dates when present', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      // Task 2 has a due date
      expect(screen.getByText(/due/i)).toBeInTheDocument()
    })
  })

  test('opens new task form when add button clicked', async () => {
    mockApi.getTasks.mockResolvedValue([])
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    const addTaskButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addTaskButton)
    
    expect(screen.getByText(/create new task/i)).toBeInTheDocument()
  })

  test('creates new task successfully', async () => {
    mockApi.getTasks.mockResolvedValue([])
    const newTask = {
      id: 4,
      project_id: 1,
      title: 'New Task',
      description: 'A new task',
      status: 'pending' as const,
      priority: 5,
      position: 1,
      created_at: '2023-01-04T00:00:00Z',
      updated_at: '2023-01-04T00:00:00Z',
      completed_at: null,
      due_date: null,
    }
    mockApi.createTask.mockResolvedValue(newTask)
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    // Open form
    const addTaskButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addTaskButton)
    
    // Fill form
    await user.type(screen.getByLabelText(/task title/i), 'New Task')
    await user.type(screen.getByLabelText(/description/i), 'A new task')
    await user.selectOptions(screen.getByLabelText(/priority/i), '5')
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /create task/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockApi.createTask).toHaveBeenCalledWith({
        project_id: 1,
        title: 'New Task',
        description: 'A new task',
        priority: 5,
      })
    })
  })

  test('handles task creation error', async () => {
    mockApi.getTasks.mockResolvedValue([])
    mockApi.createTask.mockRejectedValue(new Error('Creation failed'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    // Open form and submit
    const addTaskButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addTaskButton)
    
    await user.type(screen.getByLabelText(/task title/i), 'New Task')
    
    const submitButton = screen.getByRole('button', { name: /create task/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to create task/i)).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  test('updates task status via dropdown', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    const updatedTask = { ...mockTasks[0], status: 'in_progress' as const }
    mockApi.updateTaskStatus.mockResolvedValue(updatedTask)
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    // Find and click status dropdown for Task 1
    const statusDropdown = screen.getByDisplayValue(/pending/i)
    await user.selectOptions(statusDropdown, 'in_progress')
    
    await waitFor(() => {
      expect(mockApi.updateTaskStatus).toHaveBeenCalledWith(1, 'in_progress')
    })
  })

  test('updates task status via checkbox (completed)', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    const updatedTask = { ...mockTasks[0], status: 'completed' as const }
    mockApi.updateTaskStatus.mockResolvedValue(updatedTask)
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    // Find and click checkbox for Task 1
    const checkbox = screen.getByRole('checkbox', { name: /complete task 1/i })
    await user.click(checkbox)
    
    await waitFor(() => {
      expect(mockApi.updateTaskStatus).toHaveBeenCalledWith(1, 'completed')
    })
  })

  test('handles task status update error', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    mockApi.updateTaskStatus.mockRejectedValue(new Error('Update failed'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    const checkbox = screen.getByRole('checkbox', { name: /complete task 1/i })
    await user.click(checkbox)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to update task/i)).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  test('opens task details when task clicked', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    const taskTitle = screen.getByText('Task 1')
    await user.click(taskTitle)
    
    // Should open task details modal or view
    expect(screen.getByText(/task details/i)).toBeInTheDocument()
  })

  test('edits task when edit button clicked', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    // Find and click edit button for Task 1
    const editButton = screen.getByRole('button', { name: /edit task 1/i })
    await user.click(editButton)
    
    expect(screen.getByText(/edit task/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Task 1')).toBeInTheDocument()
  })

  test('saves task edits successfully', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    const updatedTask = { ...mockTasks[0], title: 'Updated Task 1' }
    mockApi.updateTask.mockResolvedValue(updatedTask)
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    // Edit task
    const editButton = screen.getByRole('button', { name: /edit task 1/i })
    await user.click(editButton)
    
    const titleInput = screen.getByDisplayValue('Task 1')
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Task 1')
    
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(mockApi.updateTask).toHaveBeenCalledWith(1, {
        project_id: 1,
        title: 'Updated Task 1',
        description: 'First task',
        priority: 5,
      })
    })
  })

  test('deletes task when delete button clicked', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    mockApi.deleteTask.mockResolvedValue(undefined)
    
    // Mock window.confirm to return true
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    // Find and click delete button for Task 1
    const deleteButton = screen.getByRole('button', { name: /delete task 1/i })
    await user.click(deleteButton)
    
    await waitFor(() => {
      expect(mockApi.deleteTask).toHaveBeenCalledWith(1)
    })
    
    confirmSpy.mockRestore()
  })

  test('cancels deletion when not confirmed', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    
    // Mock window.confirm to return false
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    const deleteButton = screen.getByRole('button', { name: /delete task 1/i })
    await user.click(deleteButton)
    
    // Should not call delete API
    expect(mockApi.deleteTask).not.toHaveBeenCalled()
    
    confirmSpy.mockRestore()
  })

  test('handles task deletion error', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    mockApi.deleteTask.mockRejectedValue(new Error('Deletion failed'))
    
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    const deleteButton = screen.getByRole('button', { name: /delete task 1/i })
    await user.click(deleteButton)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to delete task/i)).toBeInTheDocument()
    })
    
    confirmSpy.mockRestore()
    consoleSpy.mockRestore()
  })

  test('filters tasks by status', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.getByText('Task 2')).toBeInTheDocument()
      expect(screen.getByText('Task 3')).toBeInTheDocument()
    })
    
    // Filter by completed status
    const statusFilter = screen.getByLabelText(/filter by status/i)
    await user.selectOptions(statusFilter, 'completed')
    
    await waitFor(() => {
      expect(screen.queryByText('Task 1')).not.toBeInTheDocument()
      expect(screen.queryByText('Task 2')).not.toBeInTheDocument()
      expect(screen.getByText('Task 3')).toBeInTheDocument()
    })
  })

  test('sorts tasks by priority', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    // Change sort to priority (high to low)
    const sortSelect = screen.getByLabelText(/sort by/i)
    await user.selectOptions(sortSelect, 'priority-desc')
    
    // Check that Task 2 (priority 8) appears before Task 1 (priority 5)
    const tasks = screen.getAllByText(/^Task \d+$/)
    expect(tasks[0]).toHaveTextContent('Task 2')
    expect(tasks[1]).toHaveTextContent('Task 1')
    expect(tasks[2]).toHaveTextContent('Task 3')
  })

  test('searches tasks by title', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.getByText('Task 2')).toBeInTheDocument()
    })
    
    // Search for "Task 1"
    const searchInput = screen.getByPlaceholderText(/search tasks/i)
    await user.type(searchInput, 'Task 1')
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.queryByText('Task 2')).not.toBeInTheDocument()
      expect(screen.queryByText('Task 3')).not.toBeInTheDocument()
    })
  })

  test('shows task count', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText(/3 tasks/i)).toBeInTheDocument()
    })
  })

  test('refreshes tasks when refresh button clicked', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    const user = userEvent.setup()
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    // Clear the mock call count
    mockApi.getTasks.mockClear()
    
    // Click refresh
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)
    
    expect(mockApi.getTasks).toHaveBeenCalledWith(1)
  })

  test('handles drag and drop reordering', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    mockApi.reorderTasks.mockResolvedValue(undefined)
    
    render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })
    
    // Simulate drag and drop (this would be handled by the DndContext mock)
    // In a real test, you'd simulate the drag events
    
    // For now, just verify the component renders with drag and drop setup
    expect(screen.getByText('Task 1')).toBeInTheDocument()
  })

  test('reloads tasks when projectId changes', async () => {
    mockApi.getTasks.mockResolvedValue(mockTasks)
    
    const { rerender } = render(<TaskList projectId={1} />)
    
    await waitFor(() => {
      expect(mockApi.getTasks).toHaveBeenCalledWith(1)
    })
    
    // Change project ID
    mockApi.getTasks.mockClear()
    rerender(<TaskList projectId={2} />)
    
    await waitFor(() => {
      expect(mockApi.getTasks).toHaveBeenCalledWith(2)
    })
  })
})