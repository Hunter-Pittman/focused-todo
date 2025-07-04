import React from 'react';
import { TaskStatus } from '../../../shared/types';
import './SearchAndFilter.css';

interface SearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: TaskStatus | 'all';
  onStatusFilterChange: (status: TaskStatus | 'all') => void;
  projectSelected: boolean;
}

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  projectSelected
}) => {
  if (!projectSelected) {
    return null;
  }

  return (
    <div className="search-and-filter">
      <div className="search-input-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="search-icon">🔍</div>
      </div>
      
      <div className="filter-container">
        <select
          className="status-filter"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as TaskStatus | 'all')}
        >
          <option value="all">All Tasks</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  );
};