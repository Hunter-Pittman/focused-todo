import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { Task, TaskStatus, Project, ReorderTasksRequest } from '../../../shared/types';
import { appService } from '../services/api';
import { SortableTaskItem } from './SortableTaskItem';
import './TaskList.css';

interface TaskListProps {
  selectedProject: Project | null;
  onTaskSelect: (task: Task) => void;
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  searchQuery?: string;
  statusFilter?: TaskStatus | 'all';
  onTasksRefresh?: (refreshFn: () => Promise<void>) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  selectedProject,
  onTaskSelect,
  onCreateTask,
  onEditTask,
  searchQuery = '',
  statusFilter = 'all',
  onTasksRefresh
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (selectedProject) {
      loadTasks();
    } else {
      setTasks([]);
    }
  }, [selectedProject]);

  useEffect(() => {
    // Provide the refresh function to the parent
    if (onTasksRefresh) {
      onTasksRefresh(loadTasks);
    }
  }, [onTasksRefresh, selectedProject]);

  const loadTasks = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      setError(null);
      const projectTasks = await appService.loadTasks(selectedProject.id);
      setTasks(projectTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      await appService.updateTaskStatus(task.id, newStatus);
      await loadTasks(); // Refresh the task list
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleTaskClick = (task: Task) => {
    onTaskSelect(task);
  };

  const handleTaskEdit = (task: Task, event: React.MouseEvent) => {
    event.stopPropagation();
    onEditTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTaskId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = groupedTasks.findIndex((task) => task.id.toString() === active.id);
    const newIndex = groupedTasks.findIndex((task) => task.id.toString() === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Create new array with reordered tasks
    const reorderedTasks = arrayMove(groupedTasks, oldIndex, newIndex);
    
    // Calculate new priorities based on position
    const taskOrders = reorderedTasks.map((task, index) => ({
      task_id: task.id,
      // Higher index = lower priority (reverse order for display)
      priority: reorderedTasks.length - index
    }));

    // Update local state immediately for smooth UX
    setTasks(reorderedTasks);

    try {
      // Send reorder request to backend
      await appService.reorderTasks({ tasks: taskOrders });
      // Refresh tasks from server to ensure consistency
      await loadTasks();
    } catch (error) {
      console.error('Failed to reorder tasks:', error);
      // Revert local state on error
      await loadTasks();
    }
  };

  const handleDragStart = (event: DragEndEvent) => {
    setDraggedTaskId(event.active.id.toString());
  };

  // Filter tasks based on search query and status filter
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchQuery === '' || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Group tasks by hierarchy (parent tasks first, then sub-tasks)
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    if (!task.parent_id) {
      acc.push(task);
      // Add sub-tasks right after parent
      const subTasks = filteredTasks.filter(t => t.parent_id === task.id);
      acc.push(...subTasks);
    } else if (!filteredTasks.some(t => t.id === task.parent_id)) {
      // Sub-task whose parent is not in filtered results
      acc.push(task);
    }
    return acc;
  }, [] as Task[]);

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return '◯';
      case 'in_progress':
        return '◐';
      case 'completed':
        return '●';
      case 'cancelled':
        return '✕';
      default:
        return '◯';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return '#6c757d';
      case 'in_progress':
        return '#007AFF';
      case 'completed':
        return '#28a745';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return 'High';
    if (priority >= 5) return 'Medium';
    if (priority >= 1) return 'Low';
    return '';
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return '#dc3545';
    if (priority >= 5) return '#fd7e14';
    if (priority >= 1) return '#28a745';
    return '#6c757d';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!selectedProject) {
    return (
      <div className="task-list">
        <div className="task-list-header">
          <h3>Tasks</h3>
        </div>
        <div className="task-list-content">
          <div className="empty-state">
            <p>Select a project to view tasks</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="task-list">
        <div className="task-list-header">
          <h3>Tasks - {selectedProject.name}</h3>
          <button 
            className="create-task-btn"
            onClick={onCreateTask}
            title="Create new task"
          >
            +
          </button>
        </div>
        <div className="task-list-content">
          <div className="loading-state">Loading tasks...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-list">
        <div className="task-list-header">
          <h3>Tasks - {selectedProject.name}</h3>
          <button 
            className="create-task-btn"
            onClick={onCreateTask}
            title="Create new task"
          >
            +
          </button>
        </div>
        <div className="task-list-content">
          <div className="error-state">
            <p>{error}</p>
            <button onClick={loadTasks} className="retry-btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="task-list">
      <div className="task-list-header">
        <h3>Tasks - {selectedProject.name}</h3>
        <button 
          className="create-task-btn"
          onClick={onCreateTask}
          title="Create new task"
        >
          +
        </button>
      </div>
      <div className="task-list-content">
        {groupedTasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks found</p>
            <p className="empty-subtitle">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Create your first task to get started'}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext
              items={groupedTasks.map(task => task.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="tasks-container">
                {groupedTasks.map((task) => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    isDragging={draggedTaskId === task.id.toString()}
                    onTaskClick={handleTaskClick}
                    onTaskEdit={handleTaskEdit}
                    onTaskStatusChange={handleTaskStatusChange}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    getPriorityLabel={getPriorityLabel}
                    getPriorityColor={getPriorityColor}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};