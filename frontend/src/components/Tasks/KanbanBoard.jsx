import { useState, useRef } from 'react'
import useTasksStore from '../../store/useTasksStore'
import TaskModal from './TaskModal'

const COLUMNS = [
    { id: 'todo', label: '○ To Do', color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
    { id: 'in_progress', label: '◑ In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    { id: 'done', label: '● Done', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
]

const PRIORITY_COLORS = {
    low: '#6b7280', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444',
}

function KanbanCard({ task, onEdit, onDragStart, onDragEnd }) {
    const due = task.due_date ? new Date(task.due_date) : null
    const isOverdue = due && due < new Date() && task.status !== 'done'

    return (
        <div
            className="kanban-card"
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('taskId', task.id)
                e.dataTransfer.setData('fromStatus', task.status)
                onDragStart?.(task.id)
            }}
            onDragEnd={() => onDragEnd?.()}
            onClick={() => onEdit(task)}
        >
            {/* Priority bar */}
            <div
                className="kanban-card-priority-bar"
                style={{ background: PRIORITY_COLORS[task.priority] || '#6b7280' }}
            />

            <div className="kanban-card-body">
                <div className="kanban-card-title">{task.title || 'Untitled task'}</div>

                {task.description && (
                    <div className="kanban-card-desc">{task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}</div>
                )}

                <div className="kanban-card-meta">
                    {due && (
                        <span className={`kanban-due ${isOverdue ? 'overdue' : ''}`}>
                            📅 {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                    )}
                    {task.subtasks?.length > 0 && (
                        <span className="kanban-subtask-count">
                            ⤷ {task.subtasks.filter(s => s.status === 'done').length}/{task.subtasks.length}
                        </span>
                    )}
                    {task.assignee && (
                        <span className="kanban-assignee-avatar" title={task.assignee.name}>
                            {(task.assignee.name || task.assignee.email || 'U')[0].toUpperCase()}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

function KanbanColumn({ col, tasks, onEdit, onDrop, dragging }) {
    const [over, setOver] = useState(false)

    return (
        <div
            className={`kanban-column ${over ? 'kanban-column-over' : ''}`}
            style={{ '--col-color': col.color, '--col-bg': col.bg }}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
                e.preventDefault()
                setOver(false)
                const taskId = e.dataTransfer.getData('taskId')
                if (taskId) onDrop(taskId, col.id)
            }}
        >
            <div className="kanban-col-header">
                <span className="kanban-col-title" style={{ color: col.color }}>{col.label}</span>
                <span className="kanban-col-count">{tasks.length}</span>
            </div>

            <div className="kanban-col-cards">
                {tasks.map(task => (
                    <KanbanCard
                        key={task.id}
                        task={task}
                        onEdit={onEdit}
                        onDragStart={() => {}}
                        onDragEnd={() => {}}
                    />
                ))}

                {tasks.length === 0 && !over && (
                    <div className="kanban-col-empty">Drop tasks here</div>
                )}

                {over && (
                    <div className="kanban-drop-indicator">Drop here</div>
                )}
            </div>
        </div>
    )
}

export default function KanbanBoard({ page }) {
    const { tasks, updateTask, createTask } = useTasksStore()
    const [editTask, setEditTask] = useState(null)
    const [dragging, setDragging] = useState(null)

    const tasksByStatus = {
        todo: tasks.filter(t => t.status === 'todo'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        done: tasks.filter(t => t.status === 'done'),
    }

    const handleDrop = async (taskId, newStatus) => {
        setDragging(null)
        await updateTask(taskId, { status: newStatus })
    }

    const handleAddToColumn = async (status) => {
        const t = await createTask(page.id, { title: 'New task', status, priority: 'medium' })
        setEditTask(t)
    }

    return (
        <div className="kanban-root">
            {COLUMNS.map(col => (
                <div key={col.id} className="kanban-column-wrap">
                    <KanbanColumn
                        col={col}
                        tasks={tasksByStatus[col.id] || []}
                        onEdit={setEditTask}
                        onDrop={handleDrop}
                        dragging={dragging}
                    />
                    <button
                        className="kanban-add-btn"
                        onClick={() => handleAddToColumn(col.id)}
                    >
                        + Add task
                    </button>
                </div>
            ))}

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
