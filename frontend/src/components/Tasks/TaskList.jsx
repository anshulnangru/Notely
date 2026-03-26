import { useState } from 'react'
import useTasksStore from '../../store/useTasksStore'
import TaskModal from './TaskModal'
import KanbanBoard from './KanbanBoard'

const STATUS_CONFIG = {
    todo: { label: 'To Do', icon: '○', color: '#6b7280' },
    in_progress: { label: 'In Progress', icon: '◑', color: '#f59e0b' },
    done: { label: 'Done', icon: '●', color: '#10b981' },
}

const PRIORITY_CONFIG = {
    low: { label: 'Low', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
    medium: { label: 'Medium', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    high: { label: 'High', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
}

function formatDate(dateStr) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    const now = new Date()
    const isOverdue = d < now
    const opts = { month: 'short', day: 'numeric' }
    return { label: d.toLocaleDateString(undefined, opts), overdue: isOverdue }
}

function TaskRow({ task, pageId, onEdit }) {
    const { setTaskStatus, deleteTask } = useTasksStore()
    const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
    const due = formatDate(task.due_date)
    const [expanded, setExpanded] = useState(false)

    const cycleStatus = (e) => {
        e.stopPropagation()
        const order = ['todo', 'in_progress', 'done']
        const next = order[(order.indexOf(task.status) + 1) % order.length]
        setTaskStatus(task.id, next)
    }

    return (
        <div className="task-row-wrap">
            <div className={`task-row ${task.status === 'done' ? 'task-done' : ''}`} onClick={() => onEdit(task)}>
                <button
                    className="task-status-btn"
                    style={{ color: status.color, borderColor: status.color }}
                    onClick={cycleStatus}
                    title={`Status: ${status.label} — click to advance`}
                >
                    {status.icon}
                </button>

                {task.subtasks?.length > 0 && (
                    <button
                        className="task-expand-btn"
                        onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
                    >
                        {expanded ? '▾' : '▸'}
                    </button>
                )}

                <span className={`task-title ${task.status === 'done' ? 'task-title-done' : ''}`}>
                    {task.title || 'Untitled task'}
                </span>

                <div className="task-meta">
                    <span className="task-priority-chip" style={{ color: priority.color, background: priority.bg }}>
                        {priority.label}
                    </span>
                    {due && (
                        <span className={`task-due ${due.overdue && task.status !== 'done' ? 'task-due-overdue' : ''}`}>
                            📅 {due.label}
                        </span>
                    )}
                    {task.assignee && (
                        <span className="task-assignee-avatar" title={task.assignee.name || task.assignee.email}>
                            {(task.assignee.name || task.assignee.email || 'U')[0].toUpperCase()}
                        </span>
                    )}
                    {task.subtasks?.length > 0 && (
                        <span className="task-subtask-count">
                            ⤷ {task.subtasks.filter(s => s.status === 'done').length}/{task.subtasks.length}
                        </span>
                    )}
                    <button
                        className="task-delete-btn"
                        title="Delete task"
                        onClick={e => { e.stopPropagation(); if (confirm('Delete this task?')) deleteTask(task.id) }}
                    >✕</button>
                </div>
            </div>

            {expanded && task.subtasks?.length > 0 && (
                <div className="task-subtasks">
                    {task.subtasks.map(sub => (
                        <TaskRow key={sub.id} task={sub} pageId={pageId} onEdit={onEdit} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function TaskList({ page }) {
    const { tasks, loading, createTask } = useTasksStore()
    const [editTask, setEditTask] = useState(null)
    const [filter, setFilter] = useState({ status: '', priority: '' })
    const [view, setView] = useState('list')   // 'list' | 'kanban'

    const filtered = tasks.filter(t => {
        if (filter.status && t.status !== filter.status) return false
        if (filter.priority && t.priority !== filter.priority) return false
        return true
    })

    const handleCreate = async () => {
        const t = await createTask(page.id, { title: 'New task', status: 'todo', priority: 'medium' })
        setEditTask(t)
    }

    return (
        <div className="task-list-root">
            {/* Toolbar */}
            <div className="task-toolbar">
                <span className="task-toolbar-title">📋 Tasks</span>

                {view === 'list' && (
                    <div className="task-filters">
                        <select
                            className="task-filter-select"
                            value={filter.status}
                            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
                        >
                            <option value="">All Statuses</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                        <select
                            className="task-filter-select"
                            value={filter.priority}
                            onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
                        >
                            <option value="">All Priorities</option>
                            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* View toggle */}
                <div className="view-toggle">
                    <button
                        className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
                        onClick={() => setView('list')}
                        title="List view"
                    >☰ List</button>
                    <button
                        className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}
                        onClick={() => setView('kanban')}
                        title="Kanban view"
                    >⊞ Board</button>
                </div>

                {view === 'list' && (
                    <button className="task-add-btn" onClick={handleCreate}>+ Add Task</button>
                )}
            </div>

            {/* List view */}
            {view === 'list' && (
                <>
                    <div className="task-legend">
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <span key={k} className="task-legend-item" style={{ color: v.color }}>
                                {v.icon} {filtered.filter(t => t.status === k).length} {v.label}
                            </span>
                        ))}
                    </div>

                    <div className="task-rows">
                        {loading && <div className="task-loading">Loading tasks…</div>}
                        {!loading && filtered.length === 0 && (
                            <div className="task-empty">
                                <span>No tasks yet.</span>
                                <button className="task-empty-btn" onClick={handleCreate}>Create your first task</button>
                            </div>
                        )}
                        {filtered.map(task => (
                            <TaskRow key={task.id} task={task} pageId={page.id} onEdit={setEditTask} />
                        ))}
                    </div>
                </>
            )}

            {/* Kanban view */}
            {view === 'kanban' && <KanbanBoard page={page} />}

            {/* Modal */}
            {editTask !== null && (
                <TaskModal
                    task={editTask}
                    pageId={page.id}
                    onClose={() => setEditTask(null)}
                />
            )}
        </div>
    )
}
