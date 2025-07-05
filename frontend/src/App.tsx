import React, { useState, useRef } from 'react'
import { WindowControls } from './components/WindowControls'
import { SystemStatus } from './components/SystemStatus'
import { TrayMenuManager } from './components/TrayMenuManager'
import { QuickTaskModal } from './components/QuickTaskModal'
import { ProjectSidebar } from './components/ProjectSidebar'
import { TaskList } from './components/TaskList'
import { TimelineView } from './components/TimelineView'
import { TaskForm } from './components/TaskForm'
import { ProjectForm } from './components/ProjectForm'
import { SearchAndFilter } from './components/SearchAndFilter'
import { useApp, useTrayMenuState } from './context/AppContext'
import { Project, Task, TaskStatus } from '../../shared/types'
import './App.css'

const App: React.FC = () => {
  const { setQuickTaskModalOpen } = useApp()
  const trayMenuState = useTrayMenuState()

  // Main window state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')

  // Modal states
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false)
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Refresh function refs
  const refreshProjects = useRef<(() => Promise<void>) | null>(null)
  const refreshTasks = useRef<(() => Promise<void>) | null>(null)

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    setSelectedTask(null)
    setSearchQuery('')
    setStatusFilter('all')
  }

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task)
  }

  const handleCreateProject = () => {
    setEditingProject(null)
    setIsProjectFormOpen(true)
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setIsProjectFormOpen(true)
  }

  const handleCreateTask = () => {
    setEditingTask(null)
    setIsTaskFormOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsTaskFormOpen(true)
  }

  const handleProjectFormSubmit = async (project: Project) => {
    if (!editingProject) {
      // New project created, select it
      setSelectedProject(project)
      // Refresh the projects list to show the new project
      if (refreshProjects.current) {
        await refreshProjects.current()
      }
    } else if (selectedProject && selectedProject.id === project.id) {
      // Updated current project, refresh the reference
      setSelectedProject(project)
      // Refresh the projects list to show updated data
      if (refreshProjects.current) {
        await refreshProjects.current()
      }
    }
  }

  const handleTaskFormSubmit = async (task: Task) => {
    // Task created or updated
    setSelectedTask(task)
    // Refresh the tasks list to show the new/updated task
    if (refreshTasks.current) {
      await refreshTasks.current()
    }
  }

  return (
    <div className="app">
      {/* Tray Menu Manager - handles background tray integration */}
      <TrayMenuManager />
      
      {/* Quick Task Modal */}
      <QuickTaskModal
        isOpen={trayMenuState.quickTaskModalOpen}
        onClose={() => setQuickTaskModalOpen(false)}
        onTaskCreated={() => {
          if (refreshTasks.current) {
            refreshTasks.current()
          }
        }}
      />

      {/* Project Form Modal */}
      <ProjectForm
        isOpen={isProjectFormOpen}
        onClose={() => setIsProjectFormOpen(false)}
        onSubmit={handleProjectFormSubmit}
        project={editingProject}
      />

      {/* Task Form Modal */}
      {selectedProject && (
        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={handleTaskFormSubmit}
          task={editingTask}
          project={selectedProject}
        />
      )}

      <header className="app-header">
        <div className="header-content">
          <div className="app-title">
            <h1>Focused To-Do</h1>
            <p className="subtitle">A cross-platform task management application</p>
          </div>
          <WindowControls />
        </div>
      </header>

      <main className="app-main">
        <SystemStatus className="main-status" />

        <div className="main-content">
          <ProjectSidebar
            selectedProjectId={selectedProject?.id}
            onProjectSelect={handleProjectSelect}
            onCreateProject={handleCreateProject}
            onProjectsRefresh={(fn) => { refreshProjects.current = fn }}
          />

          <div className="main-panel">
            <div className="panel-header">
              <SearchAndFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                projectSelected={!!selectedProject}
              />
              
              {selectedProject && (
                <div className="view-toggle">
                  <button
                    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="List view"
                  >
                    ☰
                  </button>
                  <button
                    className={`view-btn ${viewMode === 'timeline' ? 'active' : ''}`}
                    onClick={() => setViewMode('timeline')}
                    title="Timeline view"
                  >
                    📅
                  </button>
                </div>
              )}
            </div>

            {viewMode === 'list' ? (
              <TaskList
                selectedProject={selectedProject}
                onTaskSelect={handleTaskSelect}
                onCreateTask={handleCreateTask}
                onEditTask={handleEditTask}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onTasksRefresh={(fn) => { refreshTasks.current = fn }}
              />
            ) : (
              <TimelineView
                selectedProject={selectedProject}
                onTaskSelect={handleTaskSelect}
                onEditTask={handleEditTask}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App