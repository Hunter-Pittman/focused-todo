import React from 'react';
import { TaskStatus } from '../../../shared/types';
import './TimelineFilter.css';

export type DateRangeFilter = 'current_week' | 'this_month' | 'next_month' | 'custom';
export type TimelineSpecificFilter = 'all' | 'with_due_dates' | 'with_time_logs' | 'overdue' | 'upcoming';

interface TimelineFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: TaskStatus | 'all';
  onStatusFilterChange: (status: TaskStatus | 'all') => void;
  dateRangeFilter: DateRangeFilter;
  onDateRangeFilterChange: (range: DateRangeFilter) => void;
  timelineFilter: TimelineSpecificFilter;
  onTimelineFilterChange: (filter: TimelineSpecificFilter) => void;
  customDateRange?: { start: Date; end: Date };
  onCustomDateRangeChange?: (range: { start: Date; end: Date }) => void;
  projectSelected: boolean;
}

export const TimelineFilter: React.FC<TimelineFilterProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRangeFilter,
  onDateRangeFilterChange,
  timelineFilter,
  onTimelineFilterChange,
  customDateRange,
  onCustomDateRangeChange,
  projectSelected
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusFilterChange(e.target.value as TaskStatus | 'all');
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onDateRangeFilterChange(e.target.value as DateRangeFilter);
  };

  const handleTimelineFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onTimelineFilterChange(e.target.value as TimelineSpecificFilter);
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    if (!onCustomDateRangeChange) return;
    
    const newDate = new Date(value);
    if (customDateRange) {
      const updatedRange = {
        ...customDateRange,
        [type]: newDate
      };
      onCustomDateRangeChange(updatedRange);
    } else {
      const today = new Date();
      onCustomDateRangeChange({
        start: type === 'start' ? newDate : today,
        end: type === 'end' ? newDate : today
      });
    }
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="timeline-filter">
      <div className="filter-section">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      <div className="filter-section">
        <label htmlFor="date-range-filter" className="filter-label">
          Date Range
        </label>
        <select
          id="date-range-filter"
          value={dateRangeFilter}
          onChange={handleDateRangeChange}
          className="filter-select"
        >
          <option value="current_week">Current Week</option>
          <option value="this_month">This Month</option>
          <option value="next_month">Next Month</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {dateRangeFilter === 'custom' && (
        <div className="filter-section custom-date-section">
          <div className="date-input-group">
            <div className="date-input-wrapper">
              <label htmlFor="start-date" className="date-label">From</label>
              <input
                id="start-date"
                type="date"
                value={customDateRange ? formatDateForInput(customDateRange.start) : ''}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="date-input"
              />
            </div>
            <div className="date-input-wrapper">
              <label htmlFor="end-date" className="date-label">To</label>
              <input
                id="end-date"
                type="date"
                value={customDateRange ? formatDateForInput(customDateRange.end) : ''}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="date-input"
              />
            </div>
          </div>
        </div>
      )}

      <div className="filter-section">
        <label htmlFor="timeline-filter" className="filter-label">
          Timeline Filter
        </label>
        <select
          id="timeline-filter"
          value={timelineFilter}
          onChange={handleTimelineFilterChange}
          className="filter-select"
        >
          <option value="all">All Tasks</option>
          <option value="with_due_dates">With Due Dates</option>
          <option value="with_time_logs">With Time Logs</option>
          <option value="overdue">Overdue</option>
          <option value="upcoming">Upcoming (Next 3 Days)</option>
        </select>
      </div>

      <div className="filter-section">
        <label htmlFor="status-filter" className="filter-label">
          Status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={handleStatusChange}
          className="filter-select"
          disabled={!projectSelected}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  );
};