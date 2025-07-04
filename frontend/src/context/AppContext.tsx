import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Project, Task, TimeEntry, TaskStatus, AppState } from '../../../shared/types';

// Extended AppState for UI-specific state
interface UIAppState extends Omit<AppState, 'activeProject' | 'activeTask'> {
  // Override optional properties to be explicitly undefined
  activeProject: Project | undefined;
  activeTask: Task | undefined;
  
  // UI-specific state
  isLoading: boolean;
  error: string | null;
  selectedTaskId: number | null;
  isTrayMenuOpen: boolean;
  quickTaskModalOpen: boolean;
  
  // Tray menu state
  trayMenuCollapsed: {
    recentTasks: boolean;
    recentProjects: boolean;
    timeTracking: boolean;
  };
}

// Action types for state management
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_TIME_ENTRIES'; payload: TimeEntry[] }
  | { type: 'SET_ACTIVE_PROJECT'; payload: Project | undefined }
  | { type: 'SET_ACTIVE_TASK'; payload: Task | undefined }
  | { type: 'SET_SELECTED_TASK'; payload: number | null }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: number }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: number }
  | { type: 'UPDATE_TASK_STATUS'; payload: { taskId: number; status: TaskStatus } }
  | { type: 'ADD_TIME_ENTRY'; payload: TimeEntry }
  | { type: 'UPDATE_TIME_ENTRY'; payload: TimeEntry }
  | { type: 'DELETE_TIME_ENTRY'; payload: number }
  | { type: 'SET_TRAY_MENU_OPEN'; payload: boolean }
  | { type: 'SET_QUICK_TASK_MODAL_OPEN'; payload: boolean }
  | { type: 'TOGGLE_TRAY_MENU_SECTION'; payload: keyof UIAppState['trayMenuCollapsed'] }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: UIAppState = {
  projects: [],
  tasks: [],
  timeEntries: [],
  activeProject: undefined,
  activeTask: undefined,
  isLoading: false,
  error: null,
  selectedTaskId: null,
  isTrayMenuOpen: false,
  quickTaskModalOpen: false,
  trayMenuCollapsed: {
    recentTasks: false,
    recentProjects: false,
    timeTracking: false,
  },
};

// App reducer
function appReducer(state: UIAppState, action: AppAction): UIAppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    
    case 'SET_TIME_ENTRIES':
      return { ...state, timeEntries: action.payload };
    
    case 'SET_ACTIVE_PROJECT':
      return { ...state, activeProject: action.payload };
    
    case 'SET_ACTIVE_TASK':
      return { ...state, activeTask: action.payload };
    
    case 'SET_SELECTED_TASK':
      return { ...state, selectedTaskId: action.payload };
    
    case 'ADD_PROJECT':
      return { 
        ...state, 
        projects: [...state.projects, action.payload],
        error: null 
      };
    
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p => 
          p.id === action.payload.id ? action.payload : p
        ),
        activeProject: state.activeProject?.id === action.payload.id 
          ? action.payload 
          : state.activeProject,
        error: null
      };
    
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
        tasks: state.tasks.filter(t => t.project_id !== action.payload),
        activeProject: state.activeProject?.id === action.payload 
          ? undefined 
          : state.activeProject,
        error: null
      };
    
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...state.tasks, action.payload],
        error: null
      };
    
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t => 
          t.id === action.payload.id ? action.payload : t
        ),
        activeTask: state.activeTask?.id === action.payload.id 
          ? action.payload 
          : state.activeTask,
        error: null
      };
    
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload),
        activeTask: state.activeTask?.id === action.payload 
          ? undefined 
          : state.activeTask,
        selectedTaskId: state.selectedTaskId === action.payload 
          ? null 
          : state.selectedTaskId,
        error: null
      };
    
    case 'UPDATE_TASK_STATUS':
      return {
        ...state,
        tasks: state.tasks.map(t => 
          t.id === action.payload.taskId 
            ? { ...t, status: action.payload.status, updated_at: new Date().toISOString() }
            : t
        ),
        error: null
      };
    
    case 'ADD_TIME_ENTRY':
      return {
        ...state,
        timeEntries: [...state.timeEntries, action.payload],
        error: null
      };
    
    case 'UPDATE_TIME_ENTRY':
      return {
        ...state,
        timeEntries: state.timeEntries.map(te => 
          te.id === action.payload.id ? action.payload : te
        ),
        error: null
      };
    
    case 'DELETE_TIME_ENTRY':
      return {
        ...state,
        timeEntries: state.timeEntries.filter(te => te.id !== action.payload),
        error: null
      };
    
    case 'SET_TRAY_MENU_OPEN':
      return { ...state, isTrayMenuOpen: action.payload };
    
    case 'SET_QUICK_TASK_MODAL_OPEN':
      return { ...state, quickTaskModalOpen: action.payload };
    
    case 'TOGGLE_TRAY_MENU_SECTION':
      return {
        ...state,
        trayMenuCollapsed: {
          ...state.trayMenuCollapsed,
          [action.payload]: !state.trayMenuCollapsed[action.payload]
        }
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Context type
interface AppContextType {
  state: UIAppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Action creators (convenience methods)
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProjects: (projects: Project[]) => void;
  setTasks: (tasks: Task[]) => void;
  setTimeEntries: (timeEntries: TimeEntry[]) => void;
  setActiveProject: (project: Project | undefined) => void;
  setActiveTask: (task: Task | undefined) => void;
  setSelectedTask: (taskId: number | null) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: number) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: number) => void;
  updateTaskStatus: (taskId: number, status: TaskStatus) => void;
  addTimeEntry: (timeEntry: TimeEntry) => void;
  updateTimeEntry: (timeEntry: TimeEntry) => void;
  deleteTimeEntry: (timeEntryId: number) => void;
  setTrayMenuOpen: (open: boolean) => void;
  setQuickTaskModalOpen: (open: boolean) => void;
  toggleTrayMenuSection: (section: keyof UIAppState['trayMenuCollapsed']) => void;
  resetState: () => void;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Action creators
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);
  
  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);
  
  const setProjects = useCallback((projects: Project[]) => {
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  }, []);
  
  const setTasks = useCallback((tasks: Task[]) => {
    dispatch({ type: 'SET_TASKS', payload: tasks });
  }, []);
  
  const setTimeEntries = useCallback((timeEntries: TimeEntry[]) => {
    dispatch({ type: 'SET_TIME_ENTRIES', payload: timeEntries });
  }, []);
  
  const setActiveProject = useCallback((project: Project | undefined) => {
    dispatch({ type: 'SET_ACTIVE_PROJECT', payload: project });
  }, []);
  
  const setActiveTask = useCallback((task: Task | undefined) => {
    dispatch({ type: 'SET_ACTIVE_TASK', payload: task });
  }, []);
  
  const setSelectedTask = useCallback((taskId: number | null) => {
    dispatch({ type: 'SET_SELECTED_TASK', payload: taskId });
  }, []);
  
  const addProject = useCallback((project: Project) => {
    dispatch({ type: 'ADD_PROJECT', payload: project });
  }, []);
  
  const updateProject = useCallback((project: Project) => {
    dispatch({ type: 'UPDATE_PROJECT', payload: project });
  }, []);
  
  const deleteProject = useCallback((projectId: number) => {
    dispatch({ type: 'DELETE_PROJECT', payload: projectId });
  }, []);
  
  const addTask = useCallback((task: Task) => {
    dispatch({ type: 'ADD_TASK', payload: task });
  }, []);
  
  const updateTask = useCallback((task: Task) => {
    dispatch({ type: 'UPDATE_TASK', payload: task });
  }, []);
  
  const deleteTask = useCallback((taskId: number) => {
    dispatch({ type: 'DELETE_TASK', payload: taskId });
  }, []);
  
  const updateTaskStatus = useCallback((taskId: number, status: TaskStatus) => {
    dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId, status } });
  }, []);
  
  const addTimeEntry = useCallback((timeEntry: TimeEntry) => {
    dispatch({ type: 'ADD_TIME_ENTRY', payload: timeEntry });
  }, []);
  
  const updateTimeEntry = useCallback((timeEntry: TimeEntry) => {
    dispatch({ type: 'UPDATE_TIME_ENTRY', payload: timeEntry });
  }, []);
  
  const deleteTimeEntry = useCallback((timeEntryId: number) => {
    dispatch({ type: 'DELETE_TIME_ENTRY', payload: timeEntryId });
  }, []);
  
  const setTrayMenuOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_TRAY_MENU_OPEN', payload: open });
  }, []);
  
  const setQuickTaskModalOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_QUICK_TASK_MODAL_OPEN', payload: open });
  }, []);
  
  const toggleTrayMenuSection = useCallback((section: keyof UIAppState['trayMenuCollapsed']) => {
    dispatch({ type: 'TOGGLE_TRAY_MENU_SECTION', payload: section });
  }, []);
  
  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);
  
  const contextValue: AppContextType = {
    state,
    dispatch,
    setLoading,
    setError,
    setProjects,
    setTasks,
    setTimeEntries,
    setActiveProject,
    setActiveTask,
    setSelectedTask,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    setTrayMenuOpen,
    setQuickTaskModalOpen,
    toggleTrayMenuSection,
    resetState,
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the app context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Selector hooks for specific data
export function useProjects() {
  const { state } = useApp();
  return state.projects;
}

export function useTasks() {
  const { state } = useApp();
  return state.tasks;
}

export function useTasksByProject(projectId: number) {
  const { state } = useApp();
  return state.tasks.filter(task => task.project_id === projectId);
}

export function useTasksByStatus(status: TaskStatus) {
  const { state } = useApp();
  return state.tasks.filter(task => task.status === status);
}

export function useRecentTasks(limit: number = 5) {
  const { state } = useApp();
  return state.tasks
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);
}

export function useActiveProject() {
  const { state } = useApp();
  return state.activeProject;
}

export function useActiveTask() {
  const { state } = useApp();
  return state.activeTask;
}

export function useTimeEntries() {
  const { state } = useApp();
  return state.timeEntries;
}

export function useActiveTimeEntry() {
  const { state } = useApp();
  return state.timeEntries.find(entry => !entry.end_time);
}

export function useIsLoading() {
  const { state } = useApp();
  return state.isLoading;
}

export function useError() {
  const { state } = useApp();
  return state.error;
}

export function useTrayMenuState() {
  const { state } = useApp();
  return {
    isOpen: state.isTrayMenuOpen,
    collapsed: state.trayMenuCollapsed,
    quickTaskModalOpen: state.quickTaskModalOpen,
  };
}