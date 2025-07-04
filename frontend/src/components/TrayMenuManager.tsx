import React, { useEffect, useCallback } from 'react';
import { useApp, useProjects, useTasks, useRecentTasks, useActiveTimeEntry, useTrayMenuState } from '../context/AppContext';
import { appService } from '../services/api';
import { TaskStatus } from '../../../shared/types';

// Component for managing the tray menu without rendering anything
export const TrayMenuManager: React.FC = () => {
  const { 
    setLoading, 
    setError, 
    setProjects, 
    setTasks, 
    updateTaskStatus,
    addTimeEntry,
    setActiveProject,
    setQuickTaskModalOpen
  } = useApp();
  
  const projects = useProjects();
  const tasks = useTasks();
  const recentTasks = useRecentTasks(5);
  const activeTimeEntry = useActiveTimeEntry();
  const trayMenuState = useTrayMenuState();

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [projectsData, tasksData] = await Promise.all([
        appService.loadProjects(),
        appService.loadTasks()
      ]);
      setProjects(projectsData);
      setTasks(tasksData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setProjects, setTasks]);



  // Update the Electron tray menu with enhanced data including task status indicators
  const updateTrayMenu = useCallback(async () => {
    try {
      if (window.electronAPI?.updateTrayMenu) {
        // Prepare enhanced tray menu data
        const trayMenuData = {
          recentTasks: recentTasks.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            project_id: task.project_id
          })),
          projects: projects.map(project => ({
            id: project.id,
            name: project.name,
            icon: project.icon,
            taskCount: tasks.filter(t => t.project_id === project.id).length,
            completedTasks: tasks.filter(t => t.project_id === project.id && t.status === 'completed').length
          })),
          activeTimeEntry: activeTimeEntry ? {
            id: activeTimeEntry.id,
            task_id: activeTimeEntry.task_id,
            task_title: tasks.find(t => t.id === activeTimeEntry.task_id)?.title
          } : null,
          collapsed: trayMenuState.collapsed
        };
        
        await window.electronAPI.updateTrayMenu(trayMenuData);
      }
    } catch (error) {
      console.error('Failed to update tray menu:', error);
    }
  }, [recentTasks, projects, tasks, activeTimeEntry, trayMenuState]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update tray menu when data changes
  useEffect(() => {
    updateTrayMenu();
  }, [updateTrayMenu]);

  // Listen for tray events from Electron
  useEffect(() => {
    const handleFocusTaskCreation = () => {
      setQuickTaskModalOpen(true);
    };

    const handleOpenProject = (projectId: number) => {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setActiveProject(project);
      }
    };

    const handleUpdateTaskStatus = async (taskId: number, status: string) => {
      try {
        await appService.updateTaskStatus(taskId, status as TaskStatus);
        updateTaskStatus(taskId, status as TaskStatus);
        
        // Show notification
        if (window.electronAPI?.showNotification) {
          const task = tasks.find(t => t.id === taskId);
          await window.electronAPI.showNotification(
            'Task Updated',
            `"${task?.title || 'Task'}" marked as ${status.replace('_', ' ')}`
          );
        }
        
        // Update tray menu to reflect changes
        updateTrayMenu();
      } catch (error) {
        setError('Failed to update task status');
      }
    };

    const handleStartTaskTimer = async (taskId: number) => {
      try {
        const timeEntry = await appService.startTimer(taskId);
        addTimeEntry(timeEntry);
        
        // Show notification
        if (window.electronAPI?.showNotification) {
          const task = tasks.find(t => t.id === taskId);
          await window.electronAPI.showNotification(
            'Timer Started',
            `Timer started for "${task?.title || 'task'}"`
          );
        }
        
        // Update tray menu to show active timer
        updateTrayMenu();
      } catch (error) {
        setError('Failed to start timer');
      }
    };

    const handleStopTimer = async (timeEntryId: number) => {
      try {
        await appService.stopTimer(timeEntryId);
        
        // Show notification
        if (window.electronAPI?.showNotification) {
          const task = activeTimeEntry ? tasks.find(t => t.id === activeTimeEntry.task_id) : null;
          await window.electronAPI.showNotification(
            'Timer Stopped',
            `Timer stopped for "${task?.title || 'task'}"`
          );
        }
        
        // Reload data to refresh time entries
        loadData();
      } catch (error) {
        setError('Failed to stop timer');
      }
    };

    const handleViewTaskDetails = (taskId: number) => {
      // Show task details in the main app
      // This would typically involve setting the selected task and navigating to a detail view
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        // For now, just show a notification with task details
        if (window.electronAPI?.showNotification) {
          window.electronAPI.showNotification(
            'Task Details',
            `${task.title} - Status: ${task.status}, Priority: ${task.priority}`
          );
        }
      }
    };

    const handleAddTaskToProject = (projectId: number) => {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setActiveProject(project);
        setQuickTaskModalOpen(true);
      }
    };

    if (window.electronAPI) {
      window.electronAPI.onFocusTaskCreation(handleFocusTaskCreation);
      window.electronAPI.onOpenProject(handleOpenProject);
      window.electronAPI.onUpdateTaskStatus(handleUpdateTaskStatus);
      window.electronAPI.onStartTaskTimer(handleStartTaskTimer);
      window.electronAPI.onStopTimer(handleStopTimer);
      window.electronAPI.onViewTaskDetails(handleViewTaskDetails);
      window.electronAPI.onAddTaskToProject(handleAddTaskToProject);
    }

    // Cleanup listeners on unmount
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('focus-task-creation');
        window.electronAPI.removeAllListeners('open-project');
        window.electronAPI.removeAllListeners('update-task-status');
        window.electronAPI.removeAllListeners('start-task-timer');
        window.electronAPI.removeAllListeners('stop-timer');
        window.electronAPI.removeAllListeners('view-task-details');
        window.electronAPI.removeAllListeners('add-task-to-project');
      }
    };
  }, [projects, tasks, activeTimeEntry, setQuickTaskModalOpen, setActiveProject, updateTaskStatus, addTimeEntry, setError, updateTrayMenu, loadData]);

  // This component doesn't render anything, it just manages state
  return null;
};

export default TrayMenuManager;