import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp, useProjects, useActiveProject } from '../context/AppContext';
import { appService } from '../services/api';
import { TaskStatus } from '../../../shared/types';
import './QuickTaskModal.css';

interface QuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: number;
}

export const QuickTaskModal: React.FC<QuickTaskModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultProjectId 
}) => {
  const { addTask, setError } = useApp();
  const projects = useProjects();
  const activeProject = useActiveProject();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<number | undefined>(defaultProjectId);
  const [priority, setPriority] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Set default project
  useEffect(() => {
    if (isOpen) {
      if (defaultProjectId) {
        setProjectId(defaultProjectId);
      } else if (activeProject) {
        setProjectId(activeProject.id);
      } else if (projects && projects.length > 0 && projects[0]) {
        setProjectId(projects[0].id);
      }
    }
  }, [isOpen, defaultProjectId, activeProject, projects]);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Reset form when modal closes
  const handleClose = useCallback(() => {
    setTitle('');
    setDescription('');
    setPriority(0);
    setIsLoading(false);
    onClose();
  }, [onClose]);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && e.target instanceof Node && !modalRef.current.contains(e.target)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClose]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    if (!projectId) {
      setError('Please select a project');
      return;
    }

    try {
      setIsLoading(true);
      
      const taskData: {
        project_id: number;
        title: string;
        status: TaskStatus;
        priority: number;
        description?: string;
      } = {
        project_id: projectId,
        title: title.trim(),
        status: 'pending' as TaskStatus,
        priority,
      };

      if (description.trim()) {
        taskData.description = description.trim();
      }

      const newTask = await appService.createTask(taskData);

      addTask(newTask);

      // Show success notification
      if (window.electronAPI?.showNotification) {
        const project = projects.find(p => p.id === projectId);
        await window.electronAPI.showNotification(
          'Task Created',
          `"${title}" added to ${project ? project.name : 'project'}`
        );
      }

      handleClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  // Get priority label
  const getPriorityLabel = (value: number): string => {
    if (value >= 8) return 'High';
    if (value >= 5) return 'Medium';
    if (value >= 2) return 'Low';
    return 'None';
  };

  // Get priority color
  const getPriorityColor = (value: number): string => {
    if (value >= 8) return '#FF3B30';
    if (value >= 5) return '#FF9500';
    if (value >= 2) return '#34C759';
    return '#8E8E93';
  };

  if (!isOpen) return null;

  return (
    <div className="quick-task-overlay">
      <div ref={modalRef} className="quick-task-modal">
        <div className="quick-task-header">
          <h2>Quick Task</h2>
          <button 
            className="close-button"
            onClick={handleClose}
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="quick-task-form">
          <div className="form-group">
            <label htmlFor="task-title">Title *</label>
            <input
              ref={titleInputRef}
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter task title..."
              disabled={isLoading}
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="task-project">Project *</label>
            <select
              id="task-project"
              value={projectId || ''}
              onChange={(e) => setProjectId(Number(e.target.value))}
              disabled={isLoading}
              required
            >
              <option value="">Select a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.icon} {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Optional description..."
              disabled={isLoading}
              maxLength={1000}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="task-priority">
              Priority: <span 
                style={{ color: getPriorityColor(priority) }}
                className="priority-label"
              >
                {getPriorityLabel(priority)}
              </span>
            </label>
            <input
              id="task-priority"
              type="range"
              min="0"
              max="10"
              step="1"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              disabled={isLoading}
              className="priority-slider"
            />
            <div className="priority-markers">
              <span>None</span>
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim() || !projectId}
              className="create-button"
            >
              {isLoading ? 'Creating...' : 'Create Task'}
            </button>
          </div>

          <div className="keyboard-hint">
            Press <kbd>{window.navigator?.userAgent?.includes('Mac') ? '⌘' : 'Ctrl'}</kbd> + <kbd>Enter</kbd> to create task
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickTaskModal;