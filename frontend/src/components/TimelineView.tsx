import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { Task, Project, TaskStatus, TimeEntry } from '../../../shared/types';
import { appService } from '../services/api';
import { TimelineFilter, DateRangeFilter, TimelineSpecificFilter } from './TimelineFilter';
import './TimelineView.css';

interface TimelineViewProps {
  selectedProject: Project | null;
  onTaskSelect: (task: Task) => void;
  onEditTask: (task: Task) => void;
  searchQuery?: string;
  statusFilter?: TaskStatus | 'all';
}

interface TimelineTask extends Task {
  startDate: Date;
  endDate: Date;
  duration: number;
  progress: number;
  actualDuration: number;
  timeEntries: TimeEntry[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  selectedProject,
  onTaskSelect,
  onEditTask,
  searchQuery = '',
  statusFilter = 'all'
}) => {
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState<TimelineTask | null>(null);
  
  // Timeline-specific filter states
  const [internalSearchQuery, setInternalSearchQuery] = useState(searchQuery);
  const [internalStatusFilter, setInternalStatusFilter] = useState(statusFilter);
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('current_week');
  const [timelineFilter, setTimelineFilter] = useState<TimelineSpecificFilter>('all');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date()
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (selectedProject) {
      loadTasks();
    } else {
      setTasks([]);
    }
  }, [selectedProject]);

  // Update current week based on date range filter
  useEffect(() => {
    const today = new Date();
    switch (dateRangeFilter) {
      case 'current_week':
        setCurrentWeek(today);
        break;
      case 'this_month':
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setCurrentWeek(thisMonthStart);
        break;
      case 'next_month':
        const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        setCurrentWeek(nextMonthStart);
        break;
      case 'custom':
        if (customDateRange) {
          setCurrentWeek(customDateRange.start);
        }
        break;
    }
  }, [dateRangeFilter, customDateRange]);

  const loadTasks = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      setError(null);
      const projectTasks = await appService.loadTasks(selectedProject.id);
      
      // Transform tasks to timeline tasks
      const timelineTasks = await Promise.all(
        projectTasks.map(async (task): Promise<TimelineTask> => {
          // Get time entries for this task
          const timeEntries = await appService.api.getTimeEntries(task.id);
          
          // Calculate actual duration from time entries (in hours)
          const actualDuration = timeEntries.reduce((total, entry) => {
            if (entry.duration) {
              return total + (entry.duration / 3600); // Convert seconds to hours
            }
            // If no duration, calculate from start/end times
            if (entry.start_time && entry.end_time) {
              const start = new Date(entry.start_time);
              const end = new Date(entry.end_time);
              return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
            }
            return total;
          }, 0);
          
          // Determine start and end dates
          let startDate: Date;
          let endDate: Date;
          
          if (task.due_date) {
            endDate = new Date(task.due_date);
            // For timeline, assume tasks start 1 day before due date by default
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 1);
          } else {
            // Use task creation date as start if no due date
            startDate = new Date(task.created_at);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
          }
          
          // If we have time entries, adjust start date based on earliest entry
          if (timeEntries.length > 0) {
            const earliestEntry = timeEntries.reduce((earliest, entry) => {
              const entryDate = new Date(entry.start_time);
              return !earliest || entryDate < new Date(earliest.start_time) ? entry : earliest;
            });
            
            const earliestDate = new Date(earliestEntry.start_time);
            if (earliestDate < startDate) {
              startDate = earliestDate;
            }
          }
          
          // Default duration is 1 day in hours (8 hours)
          const duration = 8; // 8 hours = 1 work day
          
          // Calculate progress based on task status and actual work
          const progress = getTaskProgress({
            ...task,
            startDate,
            endDate,
            duration,
            actualDuration,
            timeEntries
          });
          
          return {
            ...task,
            startDate,
            endDate,
            duration,
            progress,
            actualDuration,
            timeEntries
          };
        })
      );
      
      setTasks(timelineTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getTaskProgress = (task: TimelineTask): number => {
    // Base progress from status
    let statusProgress = 0;
    switch (task.status) {
      case 'pending':
        statusProgress = 0;
        break;
      case 'in_progress':
        statusProgress = 50;
        break;
      case 'completed':
        statusProgress = 100;
        break;
      case 'cancelled':
        statusProgress = 0;
        break;
    }

    // If task has time logs, calculate progress based on actual vs planned time
    if (task.actualDuration > 0 && task.status !== 'completed') {
      const timeProgress = Math.min((task.actualDuration / task.duration) * 100, 95); // Cap at 95% until completed
      return Math.max(statusProgress, timeProgress);
    }

    return statusProgress;
  };

  const getTaskUrgency = (task: TimelineTask): 'low' | 'medium' | 'high' => {
    if (!task.due_date || task.status === 'completed') return 'low';
    
    const today = new Date();
    const dueDate = new Date(task.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'high'; // Overdue
    if (daysUntilDue <= 1) return 'high'; // Due today or tomorrow
    if (daysUntilDue <= 3) return 'medium'; // Due within 3 days
    return 'low';
  };

  const getProgressColor = (progress: number, urgency: 'low' | 'medium' | 'high'): string => {
    if (progress === 100) return 'var(--color-green)'; // Green for completed
    
    switch (urgency) {
      case 'high':
        return 'var(--color-red)'; // Red for urgent
      case 'medium':
        return 'var(--color-orange)'; // Orange for medium urgency
      case 'low':
      default:
        return 'var(--color-blue)'; // Blue for normal
    }
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case 'pending':
        return 'var(--color-gray)';
      case 'in_progress':
        return 'var(--color-blue)';
      case 'completed':
        return 'var(--color-green)';
      case 'cancelled':
        return 'var(--color-red)';
      default:
        return 'var(--color-gray)';
    }
  };

  const getWeekDays = (date: Date): Date[] => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    
    return weekDays;
  };

  const isTaskInWeek = (task: TimelineTask, weekDays: Date[]): boolean => {
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];
    
    return task.startDate >= weekStart && task.startDate <= weekEnd;
  };

  const getTaskPosition = (task: TimelineTask, weekDays: Date[]): { left: number, width: number } => {
    const weekStart = weekDays[0];
    const totalWeekDays = 7;
    const dayWidth = 100 / totalWeekDays;
    
    const daysSinceWeekStart = Math.floor((task.startDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
    const left = daysSinceWeekStart * dayWidth;
    
    // Calculate width based on duration in days (8 hours = 1 day)
    const durationInDays = task.duration / 8;
    const width = durationInDays * dayWidth;
    
    return { left, width: Math.max(width, dayWidth / 4) }; // Minimum width for visibility
  };

  const getActualDurationWidth = (task: TimelineTask, scheduledWidth: number): number => {
    if (task.actualDuration === 0) return 0;
    
    // Calculate actual duration as percentage of scheduled duration
    const actualDurationInDays = task.actualDuration / 8; // 8 hours = 1 day
    const scheduledDurationInDays = task.duration / 8;
    
    if (scheduledDurationInDays === 0) return 0;
    
    return (actualDurationInDays / scheduledDurationInDays) * 100; // Return as percentage
  };

  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${Math.round(hours * 10) / 10}h`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = parseInt(event.active.id.toString());
    const task = tasks.find(t => t.id === taskId);
    setDraggedTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTask(null);

    if (!over || !selectedProject) {
      return;
    }

    const taskId = parseInt(active.id.toString());
    const task = tasks.find(t => t.id === taskId);
    const dayIndex = parseInt(over.id.toString().split('-')[1]);
    
    if (!task || isNaN(dayIndex)) {
      return;
    }

    const weekDays = getWeekDays(currentWeek);
    const newDueDate = weekDays[dayIndex];
    
    // Only update if the date actually changed
    const currentDueDate = task.due_date ? new Date(task.due_date) : null;
    if (currentDueDate && 
        newDueDate.toDateString() === currentDueDate.toDateString()) {
      return;
    }

    try {
      // Update the task's due date
      await appService.updateTask(task.id, {
        due_date: newDueDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
      });
      
      // Refresh tasks to get the updated data
      await loadTasks();
    } catch (error) {
      console.error('Failed to update task due date:', error);
    }
  };

  const applyTimelineFilters = (tasks: TimelineTask[]): TimelineTask[] => {
    return tasks.filter(task => {
      // Search filter
      const matchesSearch = internalSearchQuery === '' || 
        task.title.toLowerCase().includes(internalSearchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(internalSearchQuery.toLowerCase()));
      
      // Status filter
      const matchesStatus = internalStatusFilter === 'all' || task.status === internalStatusFilter;
      
      // Timeline-specific filters
      let matchesTimelineFilter = true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (timelineFilter) {
        case 'with_due_dates':
          matchesTimelineFilter = !!task.due_date;
          break;
        case 'with_time_logs':
          matchesTimelineFilter = task.actualDuration > 0;
          break;
        case 'overdue':
          if (task.due_date) {
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
            matchesTimelineFilter = dueDate < today && task.status !== 'completed';
          } else {
            matchesTimelineFilter = false;
          }
          break;
        case 'upcoming':
          if (task.due_date) {
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
            const threeDaysFromNow = new Date(today);
            threeDaysFromNow.setDate(today.getDate() + 3);
            matchesTimelineFilter = dueDate >= today && dueDate <= threeDaysFromNow;
          } else {
            matchesTimelineFilter = false;
          }
          break;
        case 'all':
        default:
          matchesTimelineFilter = true;
      }
      
      return matchesSearch && matchesStatus && matchesTimelineFilter;
    });
  };

  const getDateRangeForDisplay = (): { start: Date; end: Date } => {
    const today = new Date();
    
    switch (dateRangeFilter) {
      case 'current_week':
        const weekDays = getWeekDays(currentWeek);
        return { start: weekDays[0], end: weekDays[6] };
      case 'this_month':
        return {
          start: new Date(today.getFullYear(), today.getMonth(), 1),
          end: new Date(today.getFullYear(), today.getMonth() + 1, 0)
        };
      case 'next_month':
        return {
          start: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          end: new Date(today.getFullYear(), today.getMonth() + 2, 0)
        };
      case 'custom':
        return customDateRange;
      default:
        const defaultWeekDays = getWeekDays(today);
        return { start: defaultWeekDays[0], end: defaultWeekDays[6] };
    }
  };

  const filteredTasks = applyTimelineFilters(tasks);
  const dateRange = getDateRangeForDisplay();
  
  // For week view, use the current week days
  const weekDays = getWeekDays(currentWeek);
  const weekTasks = filteredTasks.filter(task => {
    if (dateRangeFilter === 'current_week') {
      return isTaskInWeek(task, weekDays);
    }
    // For other date ranges, show tasks within the date range
    const taskDate = task.due_date ? new Date(task.due_date) : new Date(task.created_at);
    return taskDate >= dateRange.start && taskDate <= dateRange.end;
  });

  // Draggable Gantt Bar Component
  const DraggableGanttBar: React.FC<{
    task: TimelineTask;
    position: { left: number; width: number };
    actualDurationPercent: number;
  }> = ({ task, position, actualDurationPercent }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({
      id: task.id,
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const taskProgress = getTaskProgress(task);
    const urgency = getTaskUrgency(task);
    const progressColor = getProgressColor(taskProgress, urgency);

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`gantt-timeline ${isDragging ? 'dragging' : ''}`}
      >
        <div 
          className="gantt-bar scheduled-bar"
          style={{
            left: `${position.left}%`,
            width: `${position.width}%`,
            backgroundColor: getStatusColor(task.status),
            opacity: isDragging ? 0.5 : 0.7,
            border: urgency === 'high' ? '2px solid #dc3545' : 'none'
          }}
          onClick={() => !isDragging && onTaskSelect(task)}
          title={`Scheduled: ${formatDuration(task.duration)} | Progress: ${taskProgress}%`}
        >
          <div className="gantt-bar-content">
            <span className="task-title-bar">{task.title}</span>
            <div 
              className="progress-bar enhanced"
              style={{ 
                width: `${taskProgress}%`,
                backgroundColor: progressColor,
                opacity: 0.8
              }}
            />
            {taskProgress > 0 && (
              <span className="progress-label">{Math.round(taskProgress)}%</span>
            )}
          </div>
        </div>
        
        {task.actualDuration > 0 && (
          <div 
            className="gantt-bar actual-bar"
            style={{
              left: `${position.left}%`,
              width: `${Math.min(actualDurationPercent, 100)}%`,
              backgroundColor: getStatusColor(task.status),
              opacity: isDragging ? 0.5 : 1,
              height: '20px',
              marginTop: '6px'
            }}
            onClick={() => !isDragging && onTaskSelect(task)}
            title={`Actual time logged: ${formatDuration(task.actualDuration)}`}
          >
            <div className="gantt-bar-content">
              <span className="actual-time-label">
                {formatDuration(task.actualDuration)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Droppable Day Component
  const DroppableDay: React.FC<{
    dayIndex: number;
    day: Date;
  }> = ({ dayIndex, day }) => {
    const {
      isOver,
      setNodeRef,
    } = useDroppable({
      id: `day-${dayIndex}`,
    });

    return (
      <div
        ref={setNodeRef}
        className={`gantt-day-column ${isOver ? 'day-drop-over' : ''}`}
        title={`Drop task here to reschedule to ${day.toLocaleDateString()}`}
      />
    );
  };

  if (!selectedProject) {
    return (
      <div className="timeline-view">
        <div className="timeline-header">
          <h3>Timeline</h3>
        </div>
        <div className="timeline-content">
          <div className="empty-state">
            <p>Select a project to view timeline</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="timeline-view">
        <div className="timeline-header">
          <h3>Timeline - {selectedProject.name}</h3>
        </div>
        <div className="timeline-content">
          <div className="loading-state">Loading timeline...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="timeline-view">
        <div className="timeline-header">
          <h3>Timeline - {selectedProject.name}</h3>
        </div>
        <div className="timeline-content">
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
    <div className="timeline-view">
      <div className="timeline-header">
        <h3>Timeline - {selectedProject.name}</h3>
        <div className="timeline-controls">
          {dateRangeFilter === 'current_week' && (
            <>
              <button 
                className="nav-btn" 
                onClick={() => navigateWeek('prev')}
                title="Previous week"
              >
                ←
              </button>
              <span className="current-week">
                {weekDays[0].toLocaleDateString()} - {weekDays[6].toLocaleDateString()}
              </span>
              <button 
                className="nav-btn" 
                onClick={() => navigateWeek('next')}
                title="Next week"
              >
                →
              </button>
            </>
          )}
          {dateRangeFilter !== 'current_week' && (
            <span className="current-range">
              {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      
      <TimelineFilter
        searchQuery={internalSearchQuery}
        onSearchChange={setInternalSearchQuery}
        statusFilter={internalStatusFilter}
        onStatusFilterChange={setInternalStatusFilter}
        dateRangeFilter={dateRangeFilter}
        onDateRangeFilterChange={setDateRangeFilter}
        timelineFilter={timelineFilter}
        onTimelineFilterChange={setTimelineFilter}
        customDateRange={customDateRange}
        onCustomDateRangeChange={setCustomDateRange}
        projectSelected={!!selectedProject}
      />
      
      <div className="timeline-content">
        {weekTasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks scheduled for this week</p>
            <p className="empty-subtitle">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Tasks with due dates will appear here'}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
          >
            <div className="gantt-chart">
              <div className="gantt-header">
                <div className="gantt-timeline-header">
                  <div className="task-label-column">Tasks</div>
                  <div className="gantt-days-header">
                    {weekDays.map((day, index) => {
                      const today = new Date();
                      const isToday = day.toDateString() === today.toDateString();
                      return (
                        <div key={index} className={`gantt-day-header ${isToday ? 'today' : ''}`}>
                          <div className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className="day-date">{day.getDate()}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="gantt-body">
                <div className="gantt-drop-zones">
                  {weekDays.map((day, index) => (
                    <DroppableDay key={index} dayIndex={index} day={day} />
                  ))}
                </div>
                
                {weekTasks.map((task) => {
                  const position = getTaskPosition(task, weekDays);
                  const actualDurationPercent = getActualDurationWidth(task, position.width);
                  const taskProgress = getTaskProgress(task);
                  const urgency = getTaskUrgency(task);
                  const progressColor = getProgressColor(taskProgress, urgency);
                  
                  return (
                    <div key={task.id} className="gantt-row">
                      <div className="task-label">
                        <div className="task-info">
                          <div className="task-title-row">
                            <span className="task-title" onClick={() => onTaskSelect(task)}>
                              {task.title}
                            </span>
                            <div className="task-indicators">
                              {urgency === 'high' && (
                                <span className="urgency-indicator high" title="High priority/Overdue">
                                  ⚠️
                                </span>
                              )}
                              {urgency === 'medium' && (
                                <span className="urgency-indicator medium" title="Medium priority">
                                  ⏱
                                </span>
                              )}
                              <div className="progress-indicator" title={`${taskProgress}% complete`}>
                                <svg className="progress-ring" width="28" height="28">
                                  <circle
                                    className="progress-ring-bg"
                                    cx="14"
                                    cy="14"
                                    r="12"
                                    fill="none"
                                    stroke="var(--color-fill-secondary)"
                                    strokeWidth="2"
                                  />
                                  <circle
                                    className="progress-ring-fill"
                                    cx="14"
                                    cy="14"
                                    r="12"
                                    fill="none"
                                    stroke={progressColor}
                                    strokeWidth="2"
                                    strokeDasharray={`${(taskProgress / 100) * 75.4} 75.4`}
                                    transform="rotate(-90 14 14)"
                                  />
                                </svg>
                                <span className="progress-text">{Math.round(taskProgress)}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="task-duration-info">
                            <span className="scheduled-duration" title="Scheduled duration">
                              {formatDuration(task.duration)}
                            </span>
                            {task.actualDuration > 0 && (
                              <span className="actual-duration" title="Actual time logged">
                                {formatDuration(task.actualDuration)}
                              </span>
                            )}
                            {task.due_date && (
                              <span className={`due-date ${urgency}`} title="Due date">
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button 
                          className="edit-task-btn"
                          onClick={() => onEditTask(task)}
                          title="Edit task"
                        >
                          ✏️
                        </button>
                      </div>
                      
                      <DraggableGanttBar
                        task={task}
                        position={position}
                        actualDurationPercent={actualDurationPercent}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            
            <DragOverlay>
              {draggedTask ? (
                <div className="gantt-bar drag-overlay">
                  <span className="task-title-bar">{draggedTask.title}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
};