// Common types shared between frontend and backend

export interface Project {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  parent_id?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: number;
  task_id: number;
  start_time: string;
  end_time?: string;
  duration?: number;
  description?: string;
  created_at: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: number;
}

// IPC Message types for Electron
export interface IPCMessage {
  type: string;
  payload?: unknown;
}

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Application state types
export interface AppState {
  projects: Project[];
  tasks: Task[];
  activeProject?: Project;
  activeTask?: Task;
  timeEntries: TimeEntry[];
}

// Task reordering types
export interface TaskOrder {
  task_id: number;
  priority: number;
}

export interface ReorderTasksRequest {
  tasks: TaskOrder[];
}

// Configuration types
export interface AppConfig {
  port: number;
  database_path: string;
  log_level: string;
  window_bounds?: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
}