# Notely

Notely is a full-stack collaborative workspace for writing notes, organizing pages, managing tasks, sharing documents, uploading files, and tracking activity in one place. The project combines a React frontend with a FastAPI backend, PostgreSQL persistence, optional email delivery, and WebSocket-based live collaboration.

## What the application does

Notely is designed to replace scattered productivity workflows with a single connected workspace. Instead of splitting work across separate note apps, task boards, calendars, file repositories, and message threads, users can create structured pages, write in a block editor, attach tasks to documents, comment with teammates, upload files, review notifications in an inbox, and monitor deadlines from dashboard and calendar views.

The application supports both solo use and team collaboration. Each page can be shared with different access levels, comments can mention other users, task assignments trigger notifications, and page activity can be seen in real time through collaborative presence updates.

## Core features

### 1. Authentication and account access

- User registration and login with JWT-based authentication
- Email verification flow before login is allowed
- Resend verification email support
- Current-user profile fetch endpoint
- User search for collaboration and assignment flows

### 2. Workspace and page management

- Hierarchical page tree with nested pages and sub-pages
- Page creation with automatic starter block
- Edit page title, emoji, cover, and favorite state
- Move pages within the hierarchy
- Soft delete to Trash and restore support
- Permanent delete for pages in Trash
- Recently viewed pages in the sidebar

### 3. Block-based editor

- Editable block-driven page content
- Create, update, delete, and reorder blocks
- Block types supported in the editor layer
- Status bar and page header around the editing experience
- Real-time block sync across collaborators on the same page

### 4. Tasks and planning

- Tasks attached to pages for context-rich execution
- List view and Kanban board view
- Task priorities: low, medium, high, urgent
- Task statuses: todo, in progress, done
- Subtasks through parent-child task relationships
- Due dates with overdue and countdown indicators
- Task assignment to users
- Task filtering by status and priority
- Reordering support inside a page

### 5. Collaboration and permissions

- Share pages with viewer, commenter, or editor access
- Owner-only permission management
- Invite registered users directly
- Invite unregistered users by email and grant access after signup
- Inherited page permissions through the page tree
- Live WebSocket presence for active collaborators
- Focus-state broadcasting for block-level awareness

### 6. Comments, mentions, and communication

- Comments on pages
- Comments on tasks
- Edit and delete own comments
- Mention parsing using `@name` style references
- Mention notifications for tagged users
- Combined inbox showing notifications and teammate messages

### 7. Notifications and reminders

- In-app notification center
- Unread notification count
- Mark single notification as read
- Mark all notifications as read
- Notifications for task assignment and task updates
- Mention notifications from comments
- Page share notifications
- Scheduled reminders for tasks due in 24 hours, 1 hour, 15 minutes, and overdue

### 8. Dashboard and calendar views

- Dashboard summary of total, pending, in-progress, and completed tasks
- Progress percentage for the workspace
- Overdue, today, and upcoming task panels
- Recently updated pages section
- Calendar-style planning page for due-date review
- Selected-day agenda view and upcoming follow-ups

### 9. Attachments and uploads

- Upload files to pages or tasks
- Store attachment metadata in the database
- Serve uploaded files from the backend
- Delete uploaded files by uploader

### 10. User experience features

- Landing page and marketing entry screen
- Login, register, and verify-email pages
- Theme toggle support
- Sidebar with navigation, favorites, recents, trash, and settings
- Notification bell in the main workspace views

## How the application works end to end

### User journey

1. A user registers with name, email, and password.
2. The backend creates the account and sends a verification email if SMTP is configured.
3. After verification, the user logs in and receives a JWT token.
4. On first workspace load, the app ensures at least one page exists.
5. The user can create pages, add nested pages, and open them in tabs.
6. Inside a page, the user writes content with blocks and can switch between editor, tasks, comments, and files.
7. Tasks can be created, prioritized, assigned, and given due dates.
8. Comments and mentions create communication and notifications.
9. Shared collaborators can open the same page and receive live presence and document updates.
10. Dashboard, inbox, and calendar views help users monitor work, communication, and upcoming deadlines.

### Collaboration flow

- A page owner grants access to another user or invites them by email.
- Permissions are enforced in the backend before page, block, task, and comment actions are allowed.
- When multiple users open the same page, a WebSocket connection is created.
- Presence snapshots, joins, leaves, focused blocks, and editor changes are broadcast to other clients.

### Reminder flow

- A background scheduler runs periodically in the backend.
- It checks all active tasks with due dates.
- Notifications are created automatically for upcoming and overdue work.

## Tech stack

### Frontend

- React 18
- React Router
- Zustand
- Axios
- Vite
- Emoji Picker React

### Backend

- FastAPI
- SQLAlchemy
- Pydantic
- Uvicorn
- Python-JOSE for JWT handling
- Passlib with bcrypt for password hashing
- Python Multipart for file uploads

### Data and infrastructure

- PostgreSQL database
- Local file storage for uploads
- SMTP integration for verification and invite emails
- Native WebSocket endpoint for collaboration presence

## Project structure

```text
Notely/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── scheduler.py
│   ├── routers/
│   ├── services/
│   └── uploads/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   └── collaboration/
│   └── package.json
└── start.sh
```

## Backend API modules

- `auth`: registration, login, verification, current user, user lookup
- `pages`: page CRUD, trash, movement, favorites, sharing, invites
- `blocks`: page content blocks and reorder operations
- `tasks`: page tasks, global tasks, updates, delete, reorder
- `comments`: page comments, task comments, mentions
- `notifications`: notification feed and read-state actions
- `inbox`: combined notifications and message-style comment feed
- `dashboard`: workspace metrics and recent activity summary
- `uploads`: file upload, list, delete
- `collaboration`: WebSocket endpoint for live presence and page updates

## Frontend pages

- `LandingPage`: public landing and marketing screen
- `RegisterPage`: account creation
- `LoginPage`: authentication
- `VerifyEmailPage`: token-based email verification
- `DashboardPage`: workspace overview
- `EditorPage`: page editor with tabs for content, tasks, comments, and files
- `CalendarPage`: date-based planning and upcoming work
- `InboxPage`: merged notifications and teammate messages

## Environment variables

The backend reads configuration from environment variables. Based on the codebase, these are the important ones:

```env
DATABASE_URL=postgresql://notionuser@localhost:5432/notiondb
APP_BASE_URL=http://localhost:5173

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_USE_TLS=true
```

Notes:

- `DATABASE_URL` defaults to a PostgreSQL connection string if not supplied.
- Email features still work at the application level without SMTP, but verification and invite delivery will fail until SMTP is configured.
- The frontend API base URL is currently hardcoded to `http://localhost:8000` in the client setup.

## Installation and setup

### Prerequisites

- Python 3.11+ recommended
- Node.js and npm
- PostgreSQL

### 1. Clone the project

```bash
git clone <your-repository-url>
cd Notely
```

### 2. Set up the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create your environment variables and make sure PostgreSQL is running with a database that matches `DATABASE_URL`.

### 3. Set up the frontend

```bash
cd ../frontend
npm install
```

### 4. Start the application

You can start both services with the helper script:

```bash
./start.sh
```

Or run them separately.

Backend:

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm run dev
```

### 5. Open the app

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

## Data model overview

The application is built around these primary entities:

- `User`: authentication, profile, comments, notifications
- `Page`: workspace documents with hierarchy and sharing
- `Block`: structured editor content inside a page
- `Task`: page-linked work items with assignees and due dates
- `Comment`: discussion on pages and tasks
- `Notification`: reminders, mentions, assignments, invites
- `Attachment`: uploaded files
- `PagePermission`: direct page access rules
- `PageInvite`: pending email-based collaboration invites
- `ActivityLog`: action history entries

## Key application strengths

- Keeps notes, tasks, comments, files, and reminders in one workflow
- Supports both personal productivity and lightweight team collaboration
- Enforces role-based access on shared content
- Includes real-time collaborative awareness without requiring external services
- Provides multiple productivity views: editor, board, dashboard, inbox, and calendar

## Current implementation notes

- The scheduler runs inside the FastAPI app process and checks due tasks periodically.
- File uploads are stored locally in `backend/uploads`.
- Tables are created automatically at startup through SQLAlchemy metadata.
- The backend also applies a few additive runtime schema updates for email-verification fields.
- The helper script expects a backend virtual environment at `backend/venv`.

## Possible future enhancements

- Full-text search across pages, blocks, and tasks
- Richer activity history views
- Team or workspace-level roles
- Cloud file storage integration
- Better deployment configuration for production
- Automated test coverage and CI pipelines

## Summary

Notely is a collaborative document and task management platform that combines writing, planning, communication, sharing, notifications, and scheduling in one web application. It is especially well suited for teams or individuals who want a Notion-style workspace with built-in task planning, inbox-style updates, real-time presence, and page-level collaboration.
