import { Project, Task, TimeEntry, TaskStatus, APIResponse, HealthResponse, ReorderTasksRequest } from '../../../shared/types';

// Base API configuration
class ApiClient {
  private baseUrl: string;

  constructor() {
    // Initialize with default URL, will be updated from Electron API
    this.baseUrl = 'http://localhost:8080';
    this.initializeBaseUrl();
  }

  private async initializeBaseUrl(): Promise<void> {
    try {
      if (window.electronAPI?.getBackendUrl) {
        this.baseUrl = await window.electronAPI.getBackendUrl();
      }
    } catch (error) {
      console.warn('Failed to get backend URL from Electron API:', error);
    }
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<APIResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  // Health check
  async health(): Promise<HealthResponse> {
    const response = await this.fetch<HealthResponse>('/api/health');
    return response.data;
  }

  // Projects API
  async getProjects(): Promise<Project[]> {
    const response = await this.fetch<Project[]>('/api/projects');
    return response.data;
  }

  async getProject(id: number): Promise<Project> {
    const response = await this.fetch<Project>(`/api/projects/${id}`);
    return response.data;
  }

  async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const response = await this.fetch<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
    return response.data;
  }

  async updateProject(id: number, project: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>): Promise<Project> {
    const response = await this.fetch<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
    return response.data;
  }

  async deleteProject(id: number): Promise<void> {
    await this.fetch<void>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async getProjectsWithTaskCounts(): Promise<(Project & { task_count: number })[]> {
    const response = await this.fetch<(Project & { task_count: number })[]>('/api/projects/with-counts');
    return response.data;
  }

  // Tasks API
  async getTasks(projectId?: number): Promise<Task[]> {
    const query = projectId ? `?project_id=${projectId}` : '';
    const response = await this.fetch<Task[]>(`/api/tasks${query}`);
    return response.data;
  }

  async getTask(id: number): Promise<Task> {
    const response = await this.fetch<Task>(`/api/tasks/${id}`);
    return response.data;
  }

  async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const response = await this.fetch<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    return response.data;
  }

  async updateTask(id: number, task: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>): Promise<Task> {
    const response = await this.fetch<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });
    return response.data;
  }

  async updateTaskStatus(id: number, status: TaskStatus): Promise<Task> {
    const response = await this.fetch<Task>(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return response.data;
  }

  async deleteTask(id: number): Promise<void> {
    await this.fetch<void>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async getSubtasks(parentId: number): Promise<Task[]> {
    const response = await this.fetch<Task[]>(`/api/tasks/${parentId}/subtasks`);
    return response.data;
  }

  // Time Entries API
  async getTimeEntries(taskId?: number, projectId?: number): Promise<TimeEntry[]> {
    const params = new URLSearchParams();
    if (taskId) params.append('task_id', taskId.toString());
    if (projectId) params.append('project_id', projectId.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetch<TimeEntry[]>(`/api/time-entries${query}`);
    return response.data;
  }

  async getTimeEntry(id: number): Promise<TimeEntry> {
    const response = await this.fetch<TimeEntry>(`/api/time-entries/${id}`);
    return response.data;
  }

  async createTimeEntry(timeEntry: Omit<TimeEntry, 'id' | 'created_at'>): Promise<TimeEntry> {
    const response = await this.fetch<TimeEntry>('/api/time-entries', {
      method: 'POST',
      body: JSON.stringify(timeEntry),
    });
    return response.data;
  }

  async startTimeEntry(taskId: number, description?: string): Promise<TimeEntry> {
    const response = await this.fetch<TimeEntry>('/api/time-entries/start', {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId, description }),
    });
    return response.data;
  }

  async stopTimeEntry(id: number): Promise<TimeEntry> {
    const response = await this.fetch<TimeEntry>(`/api/time-entries/${id}/stop`, {
      method: 'PATCH',
    });
    return response.data;
  }

  async updateTimeEntry(id: number, timeEntry: Partial<Omit<TimeEntry, 'id' | 'created_at'>>): Promise<TimeEntry> {
    const response = await this.fetch<TimeEntry>(`/api/time-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(timeEntry),
    });
    return response.data;
  }

  async deleteTimeEntry(id: number): Promise<void> {
    await this.fetch<void>(`/api/time-entries/${id}`, {
      method: 'DELETE',
    });
  }

  async getActiveTimeEntry(): Promise<TimeEntry | null> {
    try {
      const response = await this.fetch<TimeEntry>('/api/time-entries/active');
      return response.data;
    } catch (error) {
      // Active time entry endpoint might return 404 if no active entry
      return null;
    }
  }

  async getTaskTimeStatistics(taskId: number): Promise<{
    total_duration: number;
    entry_count: number;
    average_duration: number;
  }> {
    const response = await this.fetch<{
      total_duration: number;
      entry_count: number;
      average_duration: number;
    }>(`/api/tasks/${taskId}/time-stats`);
    return response.data;
  }

  async reorderTasks(reorderRequest: ReorderTasksRequest): Promise<void> {
    await this.fetch<void>('/api/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify(reorderRequest),
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// High-level service functions that integrate with the app context
export class AppService {
  constructor(private api: ApiClient) {}

  // Project operations
  async loadProjects(): Promise<Project[]> {
    try {
      return await this.api.getProjects();
    } catch (error) {
      console.error('Failed to load projects:', error);
      throw new Error('Failed to load projects');
    }
  }

  async createProject(projectData: {
    name: string;
    description?: string;
    color: string;
    icon: string;
  }): Promise<Project> {
    try {
      return await this.api.createProject(projectData);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw new Error('Failed to create project');
    }
  }

  async updateProject(id: number, updates: Partial<{
    name: string;
    description?: string;
    color: string;
    icon: string;
  }>): Promise<Project> {
    try {
      return await this.api.updateProject(id, updates);
    } catch (error) {
      console.error('Failed to update project:', error);
      throw new Error('Failed to update project');
    }
  }

  async deleteProject(id: number): Promise<void> {
    try {
      await this.api.deleteProject(id);
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw new Error('Failed to delete project');
    }
  }

  // Task operations
  async loadTasks(projectId?: number): Promise<Task[]> {
    try {
      return await this.api.getTasks(projectId);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      throw new Error('Failed to load tasks');
    }
  }

  async createTask(taskData: {
    project_id: number;
    parent_id?: number;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: number;
    due_date?: string;
  }): Promise<Task> {
    try {
      const task: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
        project_id: taskData.project_id,
        title: taskData.title,
        status: taskData.status || 'pending',
        priority: taskData.priority || 0,
        ...(taskData.parent_id !== undefined && { parent_id: taskData.parent_id }),
        ...(taskData.description && { description: taskData.description }),
        ...(taskData.due_date && { due_date: taskData.due_date }),
      };
      return await this.api.createTask(task);
    } catch (error) {
      console.error('Failed to create task:', error);
      throw new Error('Failed to create task');
    }
  }

  async updateTask(id: number, updates: Partial<{
    title: string;
    description?: string;
    status: TaskStatus;
    priority: number;
    due_date?: string;
    parent_id?: number;
  }>): Promise<Task> {
    try {
      return await this.api.updateTask(id, updates);
    } catch (error) {
      console.error('Failed to update task:', error);
      throw new Error('Failed to update task');
    }
  }

  async updateTaskStatus(id: number, status: TaskStatus): Promise<Task> {
    try {
      return await this.api.updateTaskStatus(id, status);
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw new Error('Failed to update task status');
    }
  }

  async deleteTask(id: number): Promise<void> {
    try {
      await this.api.deleteTask(id);
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw new Error('Failed to delete task');
    }
  }

  // Time tracking operations
  async startTimer(taskId: number, description?: string): Promise<TimeEntry> {
    try {
      return await this.api.startTimeEntry(taskId, description);
    } catch (error) {
      console.error('Failed to start timer:', error);
      throw new Error('Failed to start timer');
    }
  }

  async stopTimer(timeEntryId: number): Promise<TimeEntry> {
    try {
      return await this.api.stopTimeEntry(timeEntryId);
    } catch (error) {
      console.error('Failed to stop timer:', error);
      throw new Error('Failed to stop timer');
    }
  }

  async getActiveTimer(): Promise<TimeEntry | null> {
    try {
      return await this.api.getActiveTimeEntry();
    } catch (error) {
      console.error('Failed to get active timer:', error);
      return null;
    }
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const health = await this.api.health();
      return health.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  // Recent data helpers for tray menu
  async getRecentTasks(limit: number = 5): Promise<Task[]> {
    try {
      const tasks = await this.api.getTasks();
      return tasks
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent tasks:', error);
      return [];
    }
  }

  async getProjectsWithCounts(): Promise<(Project & { task_count: number })[]> {
    try {
      return await this.api.getProjectsWithTaskCounts();
    } catch (error) {
      console.error('Failed to get projects with counts:', error);
      // Fallback to regular projects without counts
      const projects = await this.api.getProjects();
      return projects.map(project => ({ ...project, task_count: 0 }));
    }
  }

  // Task reordering
  async reorderTasks(reorderRequest: ReorderTasksRequest): Promise<void> {
    try {
      await this.api.reorderTasks(reorderRequest);
    } catch (error) {
      console.error('Failed to reorder tasks:', error);
      throw new Error('Failed to reorder tasks');
    }
  }
}

// Create singleton service instance
export const appService = new AppService(apiClient);

// Export the API client for direct use if needed
export { apiClient as api };