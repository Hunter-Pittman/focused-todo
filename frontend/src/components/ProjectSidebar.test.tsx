import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectSidebar from './ProjectSidebar'
import * as api from '../services/api'

// Mock the API module
jest.mock('../services/api', () => ({
  getProjectsWithTaskCounts: jest.fn(),
  createProject: jest.fn(),
  deleteProject: jest.fn(),
}))

const mockApi = api as jest.Mocked<typeof api>

// Mock data
const mockProjects = [
  {
    id: 1,
    name: 'Project A',
    description: 'First project',
    color: '#FF0000',
    icon: '📋',
    task_count: 5,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Project B',
    description: 'Second project',
    color: '#00FF00',
    icon: '📝',
    task_count: 3,
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  }
]

describe('ProjectSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders project sidebar', () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue(mockProjects)
    
    render(<ProjectSidebar />)
    
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument()
  })

  test('loads and displays projects', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue(mockProjects)
    
    render(<ProjectSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
      expect(screen.getByText('Project B')).toBeInTheDocument()
    })

    expect(screen.getByText('5')).toBeInTheDocument() // task count for Project A
    expect(screen.getByText('3')).toBeInTheDocument() // task count for Project B
  })

  test('handles loading state', () => {
    mockApi.getProjectsWithTaskCounts.mockImplementation(() => new Promise(() => {})) // Never resolves
    
    render(<ProjectSidebar />)
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  test('handles error state', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockApi.getProjectsWithTaskCounts.mockRejectedValue(new Error('API Error'))
    
    render(<ProjectSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  test('shows empty state when no projects', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue([])
    
    render(<ProjectSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText(/no projects yet/i)).toBeInTheDocument()
    })
  })

  test('opens new project form when button clicked', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue([])
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    const newProjectButton = screen.getByRole('button', { name: /new project/i })
    await user.click(newProjectButton)
    
    expect(screen.getByText(/create new project/i)).toBeInTheDocument()
  })

  test('creates new project successfully', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue([])
    const newProject = {
      id: 3,
      name: 'New Project',
      description: 'A new project',
      color: '#0000FF',
      icon: '🆕',
      created_at: '2023-01-03T00:00:00Z',
      updated_at: '2023-01-03T00:00:00Z'
    }
    mockApi.createProject.mockResolvedValue(newProject)
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    // Open form
    const newProjectButton = screen.getByRole('button', { name: /new project/i })
    await user.click(newProjectButton)
    
    // Fill form
    await user.type(screen.getByLabelText(/project name/i), 'New Project')
    await user.type(screen.getByLabelText(/description/i), 'A new project')
    await user.type(screen.getByLabelText(/icon/i), '🆕')
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /create project/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockApi.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'A new project',
        color: expect.any(String),
        icon: '🆕'
      })
    })
  })

  test('handles project creation error', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue([])
    mockApi.createProject.mockRejectedValue(new Error('Creation failed'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    // Open form and submit
    const newProjectButton = screen.getByRole('button', { name: /new project/i })
    await user.click(newProjectButton)
    
    await user.type(screen.getByLabelText(/project name/i), 'New Project')
    
    const submitButton = screen.getByRole('button', { name: /create project/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to create project/i)).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  test('cancels project creation', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue([])
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    // Open form
    const newProjectButton = screen.getByRole('button', { name: /new project/i })
    await user.click(newProjectButton)
    
    expect(screen.getByText(/create new project/i)).toBeInTheDocument()
    
    // Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(screen.queryByText(/create new project/i)).not.toBeInTheDocument()
  })

  test('selects project when clicked', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue(mockProjects)
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
    })
    
    const projectA = screen.getByText('Project A')
    await user.click(projectA)
    
    // Check if project is visually selected (e.g., has active class)
    const projectElement = projectA.closest('div')
    expect(projectElement).toHaveClass('active')
  })

  test('shows project context menu on right click', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue(mockProjects)
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
    })
    
    const projectA = screen.getByText('Project A')
    await user.pointer({ keys: '[MouseRight]', target: projectA })
    
    expect(screen.getByText(/edit project/i)).toBeInTheDocument()
    expect(screen.getByText(/delete project/i)).toBeInTheDocument()
  })

  test('deletes project when confirmed', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue(mockProjects)
    mockApi.deleteProject.mockResolvedValue(undefined)
    
    // Mock window.confirm to return true
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
    })
    
    // Right click to open context menu
    const projectA = screen.getByText('Project A')
    await user.pointer({ keys: '[MouseRight]', target: projectA })
    
    // Click delete
    const deleteButton = screen.getByText(/delete project/i)
    await user.click(deleteButton)
    
    await waitFor(() => {
      expect(mockApi.deleteProject).toHaveBeenCalledWith(1)
    })
    
    confirmSpy.mockRestore()
  })

  test('cancels deletion when not confirmed', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue(mockProjects)
    
    // Mock window.confirm to return false
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
    })
    
    // Right click to open context menu
    const projectA = screen.getByText('Project A')
    await user.pointer({ keys: '[MouseRight]', target: projectA })
    
    // Click delete
    const deleteButton = screen.getByText(/delete project/i)
    await user.click(deleteButton)
    
    // Should not call delete API
    expect(mockApi.deleteProject).not.toHaveBeenCalled()
    
    confirmSpy.mockRestore()
  })

  test('handles deletion error', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue(mockProjects)
    mockApi.deleteProject.mockRejectedValue(new Error('Deletion failed'))
    
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
    })
    
    // Right click and delete
    const projectA = screen.getByText('Project A')
    await user.pointer({ keys: '[MouseRight]', target: projectA })
    
    const deleteButton = screen.getByText(/delete project/i)
    await user.click(deleteButton)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to delete project/i)).toBeInTheDocument()
    })
    
    confirmSpy.mockRestore()
    consoleSpy.mockRestore()
  })

  test('filters projects by search query', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue(mockProjects)
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
      expect(screen.getByText('Project B')).toBeInTheDocument()
    })
    
    // Search for "Project A"
    const searchInput = screen.getByPlaceholderText(/search projects/i)
    await user.type(searchInput, 'Project A')
    
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
      expect(screen.queryByText('Project B')).not.toBeInTheDocument()
    })
  })

  test('shows all projects when search is cleared', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue(mockProjects)
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
      expect(screen.getByText('Project B')).toBeInTheDocument()
    })
    
    // Search and then clear
    const searchInput = screen.getByPlaceholderText(/search projects/i)
    await user.type(searchInput, 'Project A')
    await user.clear(searchInput)
    
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
      expect(screen.getByText('Project B')).toBeInTheDocument()
    })
  })

  test('refreshes projects when refresh button clicked', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue(mockProjects)
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
    })
    
    // Clear the mock call count
    mockApi.getProjectsWithTaskCounts.mockClear()
    
    // Click refresh
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)
    
    expect(mockApi.getProjectsWithTaskCounts).toHaveBeenCalledTimes(1)
  })

  test('keyboard navigation works', async () => {
    mockApi.getProjectsWithTaskCounts.mockResolvedValue(mockProjects)
    const user = userEvent.setup()
    
    render(<ProjectSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
    })
    
    // Test arrow key navigation
    const firstProject = screen.getByText('Project A')
    firstProject.focus()
    
    await user.keyboard('{ArrowDown}')
    expect(screen.getByText('Project B')).toHaveFocus()
    
    await user.keyboard('{ArrowUp}')
    expect(screen.getByText('Project A')).toHaveFocus()
    
    // Test Enter key to select
    await user.keyboard('{Enter}')
    const projectElement = firstProject.closest('div')
    expect(projectElement).toHaveClass('active')
  })
})