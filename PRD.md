# Product Requirements Document: Focused To-Do

## 1. Product Overview

### 1.1 Product Name
Focused To-Do

### 1.2 Product Vision
A lightweight, always-accessible Mac menu bar application that helps users track tasks, manage sub-tasks, and visualize their work through an intuitive interface with AI-powered task enrichment capabilities.

### 1.3 Target Users
- Desktop users who need quick access to task management
- Professionals who track time spent on various activities
- Users who prefer minimal, non-intrusive productivity tools
- Individuals who benefit from AI assistance in task planning
- Cross-platform users who want consistent experience across OS

### 1.4 Key Differentiators
- Lives in the system tray/menu bar for instant access
- AI-powered task enrichment
- Hierarchical task structure with sub-tasks
- Visual timeline representation of tasks
- Minimal UI footprint while maximizing functionality
- Apple design language across all platforms

## 2. Core Features

### 2.1 System Tray/Menu Bar Integration
- **Icon**: Distinctive icon in menu bar (macOS) or system tray (Windows/Linux)
- **Click behavior**: Single click opens dropdown window
- **Status indicator**: Optional badge showing active task count
- **Keyboard shortcut**: Global hotkey for quick access (customizable)
- **Platform-specific behavior**:
    - macOS: Native menu bar positioning
    - Windows: System tray with jump list support
    - Linux: System tray with desktop environment integration

### 2.2 Project Management

#### 2.2.1 Project Creation
- **Add Project button**: Prominent button in sidebar or toolbar
- **Project properties**:
    - Name (required)
    - Description (optional)
    - Color theme (for visual identification)
    - Icon selection (SF Symbols style)
    - Default task settings (optional)

#### 2.2.2 Project Organization
- **Sidebar navigation**: Collapsible project list
- **Project hierarchy**: Support for nested projects/sub-projects
- **Quick switcher**: Cmd/Ctrl+P for project switching
- **All Tasks view**: Default view showing tasks across all projects
- **Project filtering**: View tasks from specific project(s)

#### 2.2.3 Project Features
- **Task count**: Display number of tasks per project
- **Progress indicator**: Visual completion percentage
- **Time tracking**: Total time spent per project
- **Archive projects**: Hide completed projects
- **Project templates**: Save project structure for reuse

### 2.3 Task Management (Default Tab)

#### 2.3.1 Task Creation
- **Add Task button**: Prominent "+" button or "Add Task" field
- **Task properties**:
    - Title (required)
    - Description (optional)
    - Project assignment (dropdown/picker)
    - Duration tracking (automatic start/stop)
    - Color coding (inherits from project or custom)
    - Priority level (optional)
    - Due date/time (optional)
- **Quick add**: Create task in current project context
- **Project prefix**: Use "@projectname" in quick add for assignment

#### 2.3.2 Sub-task Management
- **Expandable/collapsible**: Each task can be expanded to show sub-tasks
- **Add sub-task**: Quick add button within each parent task
- **Sub-task properties**:
    - Title (required)
    - Duration tracking (independent of parent)
    - Completion checkbox
    - Drag-and-drop reordering
    - Inherits parent's project assignment

#### 2.2.3 LLM Enrich Feature
- **Button placement**: "LLM Enrich" button on each task
- **Functionality**:
    - Improves task descriptions with more detail
    - Suggests relevant sub-tasks based on task title/description
    - Estimates time requirements
    - Identifies dependencies or prerequisites
- **User control**: Preview suggested changes before applying
- **API integration**: Configurable LLM provider (OpenAI, Anthropic, etc.)

#### 2.2.4 Duration Tracking
- **Start/Stop button**: Toggle button for each task
- **Timer display**: Shows elapsed time in HH:MM:SS format
- **Background tracking**: Continues tracking when window is closed
- **Multiple timers**: Only one task can be active at a time
- **Pause functionality**: Ability to pause and resume

#### 2.3.6 Task List UI
- **List view**: Vertical scrollable list with Apple-style design
- **Project grouping**:
    - Tasks grouped by project with collapsible sections
    - Project header shows name, color, and task count
    - Option to view flat list or grouped by project
- **Visual hierarchy**:
    - Parent tasks in cards with subtle shadow
    - Sub-tasks indented with connecting lines
    - Project color accent on task cards
    - Smooth expand/collapse animations
- **Status indicators**:
    - Active (pulsing blue dot)
    - Completed (checkmark with strike-through)
    - Paused (pause icon)
    - Not started (empty circle)
- **Interactions**:
    - Swipe gestures (on trackpad/touch)
    - Right-click context menu
    - Hover states with elevation
    - Drag tasks between projects
- **Search**: Apple-style search bar with icon
- **Filters**:
    - By project(s)
    - By status
    - By date range
    - Saved filter presets

#### 2.3.7 JSON Import
- **Import button**: "Import Tasks" in menu or toolbar
- **Supported format**:
  ```json
  {
    "title": "Task Name",
    "description": "Optional description",
    "project": "Project Name",
    "subtasks": [
      {"title": "Subtask 1"},
      {"title": "Subtask 2"}
    ],
    "duration": 3600,
    "color": "#FF5733"
  }
  ```
- **Project handling**:
    - Auto-create projects if they don't exist
    - Option to map to existing projects
- **Bulk import**: Support array of task objects
- **Validation**: Schema validation with error reporting
- **Preview**: Show tasks and projects to be imported before confirming

#### 2.3.8 Pomodoro Timer
- **Integration**: Built into each task's timer controls
- **Settings**: Configurable work/break durations
- **Default intervals**:
    - Work: 25 minutes
    - Short break: 5 minutes
    - Long break: 15 minutes (after 4 pomodoros)
- **Notifications**: System notifications for interval changes
- **Visual indicator**: Show pomodoro progress in task row
- **Auto-start**: Option to auto-start next interval

### 2.4 Calendar View (Second Tab)

#### 2.4.1 Timeline Visualization
- **View type**: Weekly Gantt chart
- **Default view**: Current week (Monday-Sunday)
- **Layout**:
    - Y-axis: Days of the week
    - X-axis: Hours of the day (24-hour format)
- **Task representation**:
    - Horizontal colored bars per task
    - Color matches project color
    - Length represents duration
    - Sub-tasks shown as segments within parent bar
    - Multiple tasks per day stack vertically
- **Project lanes**: Option to group by project with swim lanes
- **Project filter**: Show/hide specific projects

#### 2.4.2 Interaction
- **Hover details**: Show task name, project, duration, sub-tasks
- **Click to edit**: Click bar to jump to task in default view
- **Week navigation**: Previous/Next week buttons
- **Current time indicator**: Vertical line showing current day/time
- **Zoom controls**: Adjust hour granularity (1hr, 30min, 15min)
- **Project legend**: Color-coded project list

#### 2.4.3 Week Navigation
- **Week picker**: Select specific week
- **Today button**: Jump to current week
- **Keyboard shortcuts**: Arrow keys for week navigation
- **Week summary**:
    - Total hours tracked per week
    - Hours per project breakdown
    - Project distribution pie chart

## 3. User Interface Design

### 3.1 Window Specifications
- **Window type**: Floating dropdown from menu bar/system tray
- **Default size**: 400px wide x 600px tall (resizable)
- **Sidebar**: 200px collapsible project sidebar
- **Position**:
    - macOS: Below menu bar icon
    - Windows/Linux: Above system tray icon
    - Auto-adjust near screen edges
- **Persistence**: Option to keep window open or auto-close on blur

### 3.2 Visual Design
- **Design System**: Apple Human Interface Guidelines
- **Key principles**:
    - SF Pro font family (or system equivalent)
    - Consistent spacing using 8pt grid
    - Subtle shadows and transparency
    - Smooth animations and transitions
- **Theme**: Light and dark modes
- **Colors**:
    - Apple system colors (systemBlue, systemGreen, etc.)
    - Project colors (12 preset options)
    - Consistent color inheritance (project → task → subtask)
    - Vibrancy effects where supported
- **Components**:
    - Rounded corners (12px radius for cards)
    - Flat design with subtle depth
    - iOS/macOS-style switches and buttons
    - San Francisco symbols/icons
    - Sidebar with translucent background

### 3.3 Tab Navigation
- **Tab bar**: Segmented control style (iOS/macOS pattern)
- **Location**: Below window title/header
- **Visual style**: Rounded rectangle background
- **Animation**: Smooth slide transition between tabs
- **Keyboard navigation**: Cmd+1, Cmd+2 (Ctrl on Windows/Linux)

## 4. Technical Requirements

### 4.1 Platform
- **Operating Systems**:
    - macOS 11.0 (Big Sur) or later
    - Windows 10 version 1903 or later
    - Linux (Ubuntu 20.04+, Fedora 33+, Debian 10+)
- **Architecture**: x64 and ARM64 support
- **Frontend**: Electron for cross-platform compatibility
- **Backend**: Go for performance and efficiency
- **IPC**: Communication between Electron frontend and Go backend
- **UI Framework**: React with Apple-style component library

### 4.2 Data Storage
- **Local storage**: SQLite for task persistence
- **Data structure**:
    - Projects table (id, name, color, parent_id, created_at)
    - Tasks table (id, title, project_id, parent_task_id, etc.)
    - Time entries table (task tracking history)
- **Data location**: Application support directory
- **Export options**: CSV, JSON for data portability
- **Import options**: JSON structure for bulk task/project import

### 4.3 Performance
- **Launch time**: < 1 second to display window
- **Memory usage**: < 50MB baseline
- **CPU usage**: < 1% when idle, < 5% when tracking

### 4.4 LLM Integration
- **API support**: Multiple LLM providers
- **API key management**: Secure storage in Keychain
- **Offline mode**: App functions without LLM features
- **Rate limiting**: Respect API limits, queue requests

## 5. User Flows

### 5.1 First Launch
1. System tray/menu bar icon appears after installation
2. Click icon shows welcome screen with Apple-style onboarding
3. Platform-specific setup (permissions, auto-start options)
4. Optional quick tutorial with smooth transitions
5. Prompt to configure LLM API (skippable)

### 5.2 Creating a Project
1. Click system tray/menu bar icon
2. Click "New Project" button in sidebar
3. Enter project name and select color
4. Optionally add description and icon
5. Press Create with smooth animation
6. Project appears in sidebar

### 5.3 Creating a Task
1. Select project in sidebar (or stay in "All Tasks")
2. Click "Add Task" or press Cmd+N (Ctrl+N on Windows/Linux)
3. Enter task title in Apple-style input field
4. Task automatically assigned to selected project
5. Optionally add description and other properties
6. Press Enter to create with smooth animation
7. Task appears in list under project grouping

### 5.4 Importing Tasks via JSON
1. Click "Import Tasks" button
2. Paste JSON structure in import dialog
3. System validates JSON format
4. Preview shows tasks and projects to be imported
5. Option to create new projects or map to existing
6. Click "Import" to add tasks
7. Tasks appear in appropriate projects

### 5.5 Using LLM Enrich
1. Select existing task
2. Click "LLM Enrich" button
3. Loading indicator appears
4. Preview window shows suggestions
5. Accept/modify/reject suggestions
6. Changes applied to task

### 5.6 Tracking Time with Pomodoro
1. Click play button on task
2. Choose regular timer or Pomodoro mode
3. If Pomodoro: timer starts 25-min countdown
4. System notification at interval end
5. Auto-switch to break period
6. Track completion of pomodoros per task

### 5.7 Organizing with Projects
1. Drag task to different project in sidebar
2. Or use task edit menu to change project
3. View filtered by project using sidebar selection
4. Calendar view shows project colors
5. Track time per project in summary views

## 6. Launch Requirements

### 6.1 MVP Features (Version 1.0)
- ✓ Cross-platform system tray/menu bar integration
- ✓ Apple design language throughout
- ✓ Project management with hierarchy
- ✓ Basic task creation/editing with project assignment
- ✓ Sub-task support
- ✓ Duration tracking
- ✓ Pomodoro timer integration
- ✓ LLM Enrich functionality
- ✓ JSON import for tasks and projects
- ✓ Two-tab interface
- ✓ Weekly calendar/Gantt view with project grouping
- ✓ Local data storage
- ✓ Platform-specific features (notifications, shortcuts)

### 6.2 Documentation
- User guide with platform-specific instructions
- JSON import examples and schema
- API configuration guide
- Build instructions for all platforms
- Design system documentation

### 6.3 Distribution
- GitHub releases page
- Platform-specific packages:
    - macOS: .dmg with app bundle
    - Windows: .exe installer and portable version
    - Linux: .AppImage, .deb, .rpm packages
- Build from source instructions
- Package manager support:
    - Homebrew (macOS)
    - Chocolatey (Windows)
    - Snap/Flatpak (Linux)

## 7. Privacy & Security

### 7.1 Data Privacy
- All task data stored locally only
- No cloud sync or external data transmission
- No analytics or telemetry
- LLM API calls contain only task text when explicitly triggered

### 7.2 Security
- API keys stored securely:
    - macOS: Keychain
    - Windows: Credential Manager
    - Linux: Secret Service API
- Electron security best practices
- Content Security Policy implementation
- Regular dependency updates
- Code signing for all platform distributions