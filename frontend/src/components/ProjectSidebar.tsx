import React, { useState, useEffect } from 'react';
import { Project } from '../../../shared/types';
import { appService } from '../services/api';
import { Card, Button } from './ui';
import { getIconEmoji } from '../utils';
import './ProjectSidebar.css';

interface ProjectSidebarProps {
  selectedProjectId?: number;
  onProjectSelect: (project: Project) => void;
  onCreateProject: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  selectedProjectId,
  onProjectSelect,
  onCreateProject
}) => {
  const [projects, setProjects] = useState<(Project & { task_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectsWithCounts = await appService.getProjectsWithCounts();
      setProjects(projectsWithCounts);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (project: Project) => {
    onProjectSelect(project);
  };

  if (loading) {
    return (
      <Card variant="elevated" padding="none" className="project-sidebar">
        <div className="sidebar-header">
          <h3>Projects</h3>
          <Button 
            variant="primary"
            size="small"
            onClick={onCreateProject}
            title="Create new project"
          >
            +
          </Button>
        </div>
        <div className="sidebar-content">
          <div className="loading-state">Loading projects...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="elevated" padding="none" className="project-sidebar">
        <div className="sidebar-header">
          <h3>Projects</h3>
          <Button 
            variant="primary"
            size="small"
            onClick={onCreateProject}
            title="Create new project"
          >
            +
          </Button>
        </div>
        <div className="sidebar-content">
          <div className="error-state">
            <p>{error}</p>
            <Button onClick={loadProjects} variant="secondary" size="small">
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="none" className="project-sidebar">
      <div className="sidebar-header">
        <h3>Projects</h3>
        <Button 
          variant="primary"
          size="small"
          onClick={onCreateProject}
          title="Create new project"
        >
          +
        </Button>
      </div>
      <div className="sidebar-content">
        {projects.length === 0 ? (
          <div className="empty-state">
            <p>No projects yet</p>
            <p className="empty-subtitle">Create your first project to get started</p>
          </div>
        ) : (
          <div className="projects-list">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`project-item ${selectedProjectId === project.id ? 'selected' : ''}`}
                onClick={() => handleProjectClick(project)}
              >
                <div className="project-icon" style={{ backgroundColor: project.color }}>
                  {getIconEmoji(project.icon)}
                </div>
                <div className="project-info">
                  <div className="project-name">{project.name}</div>
                  <div className="project-count">
                    {project.task_count} {project.task_count === 1 ? 'task' : 'tasks'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};