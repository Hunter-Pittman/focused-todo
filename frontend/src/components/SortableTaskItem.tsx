import React from 'react';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import { Task, TaskStatus } from '../../../shared/types';

interface SortableTaskItemProps {
  task: Task;
  isDragging: boolean;
  onTaskClick: (task: Task) => void;
  onTaskEdit: (task: Task, event: React.MouseEvent) => void;
  onTaskStatusChange: (task: Task, newStatus: TaskStatus) => void;
  getStatusIcon: (status: TaskStatus) => string;
  getStatusColor: (status: TaskStatus) => string;
  getPriorityLabel: (priority: number) => string;
  getPriorityColor: (priority: number) => string;
  formatDate: (dateString: string) => string;
}

export const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  isDragging,
  onTaskClick,
  onTaskEdit,
  onTaskStatusChange,
  getStatusIcon,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
  formatDate,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleTaskClick = () => {
    if (!isDragging) {
      onTaskClick(task);
    }
  };

  const handleTaskEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isDragging) {
      onTaskEdit(task, event);
    }
  };

  const handleStatusChange = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isDragging) {
      const nextStatus: TaskStatus = task.status === 'pending' ? 'in_progress' :
                                    task.status === 'in_progress' ? 'completed' : 'pending';
      onTaskStatusChange(task, nextStatus);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-item ${task.parent_id ? 'sub-task' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={handleTaskClick}
      {...attributes}
    >
      <div 
        className="drag-handle"
        {...listeners}
        title="Drag to reorder"
      >
        ⋮⋮
      </div>
      <div className="task-status">
        <button
          className="status-button"
          style={{ color: getStatusColor(task.status) }}
          onClick={handleStatusChange}
          title={`Status: ${task.status}`}
        >
          {getStatusIcon(task.status)}
        </button>
      </div>
      <div className="task-content">
        <div className="task-header">
          <h4 className="task-title">{task.title}</h4>
          <div className="task-meta">
            {task.priority > 0 && (
              <span 
                className="priority-badge"
                style={{ backgroundColor: getPriorityColor(task.priority) }}
              >
                {getPriorityLabel(task.priority)}
              </span>
            )}
            {task.due_date && (
              <span className="due-date">
                Due: {formatDate(task.due_date)}
              </span>
            )}
          </div>
        </div>
        {task.description && (
          <p className="task-description">{task.description}</p>
        )}
      </div>
      <div className="task-actions">
        <button
          className="edit-btn"
          onClick={handleTaskEdit}
          title="Edit task"
        >
          ✎
        </button>
      </div>
    </div>
  );
};