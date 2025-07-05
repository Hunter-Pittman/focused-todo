import React, { useState, useEffect } from 'react';
import { Project } from '../../../shared/types';
import { appService } from '../services/api';
import { getIconEmoji } from '@/utils/iconMap';
import './ProjectForm.css';

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Project) => void;
  project?: Project | null;
}

const DEFAULT_COLORS = [
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D92', '#FF3B30',
  '#FF9500', '#FFCC02', '#34C759', '#00C7BE', '#5AC8FA'
];

const DEFAULT_ICONS = [
  'clipboard', 'note', 'briefcase', 'target', 'bolt', 'fire', 'lightbulb', 'rocket', 'star', 'gem',
  'trophy', 'palette', 'wrench', 'chart-bar', 'chart-line', 'music', 'gamepad', 'running', 'pizza', 'coffee'
];

export const ProjectForm: React.FC<ProjectFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  project
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: DEFAULT_COLORS[0],
    icon: DEFAULT_ICONS[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (project) {
        // Editing existing project
        setFormData({
          name: project.name,
          description: project.description || '',
          color: project.color,
          icon: project.icon
        });
      } else {
        // Creating new project
        setFormData({
          name: '',
          description: '',
          color: DEFAULT_COLORS[0],
          icon: DEFAULT_ICONS[0]
        });
      }
      setError(null);
    }
  }, [isOpen, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result: Project;
      
      if (project) {
        // Update existing project
        result = await appService.updateProject(project.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          color: formData.color,
          icon: formData.icon
        });
      } else {
        // Create new project
        result = await appService.createProject({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          color: formData.color,
          icon: formData.icon
        });
      }

      onSubmit(result);
      onClose();
    } catch (error) {
      console.error('Failed to save project:', error);
      setError('Failed to save project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({
      ...prev,
      color
    }));
  };

  const handleIconSelect = (icon: string) => {
    setFormData(prev => ({
      ...prev,
      icon
    }));
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="project-form-overlay" onClick={handleClose}>
      <div className="project-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="project-form-header">
          <h3>{project ? 'Edit Project' : 'Create New Project'}</h3>
          <button 
            className="close-btn"
            onClick={handleClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-group">
            <label htmlFor="name">Project Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter project name"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter project description (optional)"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Project Color</label>
            <div className="color-picker">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Project Icon</label>
            <div className="icon-picker">
              {DEFAULT_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                  onClick={() => handleIconSelect(icon)}
                  disabled={loading}
                >
                  {getIconEmoji(icon)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-preview">
            <div className="preview-label">Preview:</div>
            <div className="project-preview">
              <div className="preview-icon" style={{ backgroundColor: formData.color }}>
                {getIconEmoji(formData.icon)}
              </div>
              <div className="preview-info">
                <div className="preview-name">{formData.name || 'Project Name'}</div>
                <div className="preview-description">{formData.description || 'No description'}</div>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Saving...' : (project ? 'Update Project' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};