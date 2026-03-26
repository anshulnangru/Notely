import { useState, useEffect } from 'react'
import useTasksStore from '../../store/useTasksStore'

const STATUS_OPTIONS = [
    { value: 'todo', label: '○ To Do' },
    { value: 'in_progress', label: '◑ In Progress' },
    { value: 'done', label: '● Done' },
]

const PRIORITY_OPTIONS = [
    { value: 'low', label: '🔵 Low' },
    { value: 'medium', label: '🟡 Medium' },
    { value: 'high', label: '🟠 High' },
    { value: 'urgent', label: '🔴 Urgent' },
]

export default function TaskModal({ task, pageId, onClose }) {
    const { createTask, updateTask, fetchTasks } = useTasksStore()
    const isNew = !task?.id

    const [form, setForm] = useState({
        title: task?.title || '',
        description: task?.description || '',
        status: task?.status || 'todo',
        priority: task?.priority || 'medium',
        due_date: task?.due_date ? task.due_date.slice(0, 10) : '',
        assignee_id: task?.assignee_id || '',
    })
    const [saving, setSaving] = useState(false)
    const [subtaskInput, setSubtaskInput] = useState('')

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

    const handleSave = async () => {
        setSaving(true)
        try {
            const payload = {
                ...form,
                due_date: form.due_date ? `${form.due_date}T00:00:00` : null,
                assignee_id: form.assignee_id || null,
            }
            if (isNew) {
                await createTask(pageId, payload)
            } else {
                await updateTask(task.id, payload)
            }
            await fetchTasks(pageId)
            onClose()
        } finally {
            setSaving(false)
        }
    }

    const handleAddSubtask = async () => {
        if (!subtaskInput.trim()) return
        await createTask(pageId, {
            title: subtaskInput.trim(),
            status: 'todo',
            priority: 'medium',
            parent_task_id: task?.id,
        })
        setSubtaskInput('')
        await fetchTasks(pageId)
    }

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="task-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="task-modal-header">
                    <h2 className="task-modal-title">{isNew ? 'New Task' : 'Edit Task'}</h2>
                    <button className="modal-close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div className="task-modal-body">
                    {/* Title */}
                    <input
                        className="task-modal-input task-modal-title-input"
                        placeholder="Task title…"
                        value={form.title}
                        onChange={e => set('title', e.target.value)}
                        autoFocus
                    />

                    {/* Description */}
                    <textarea
                        className="task-modal-textarea"
                        placeholder="Add description…"
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        rows={3}
                    />

                    {/* Row: Status + Priority */}
                    <div className="task-modal-row">
                        <div className="task-modal-field">
                            <label className="task-modal-label">Status</label>
                            <select
                                className="task-modal-select"
                                value={form.status}
                                onChange={e => set('status', e.target.value)}
                            >
                                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="task-modal-field">
                            <label className="task-modal-label">Priority</label>
                            <select
                                className="task-modal-select"
                                value={form.priority}
                                onChange={e => set('priority', e.target.value)}
                            >
                                {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Due date */}
                    <div className="task-modal-field">
                        <label className="task-modal-label">Due Date</label>
                        <input
                            type="date"
                            className="task-modal-input"
                            value={form.due_date}
                            onChange={e => set('due_date', e.target.value)}
                        />
                    </div>

                    {/* Subtasks (only when editing existing task) */}
                    {!isNew && (
                        <div className="task-modal-subtasks">
                            <label className="task-modal-label">Subtasks</label>
                            {task.subtasks?.length > 0 && (
                                <div className="task-modal-subtask-list">
                                    {task.subtasks.map(sub => (
                                        <div key={sub.id} className="task-modal-subtask-row">
                                            <span className={`subtask-status ${sub.status === 'done' ? 'done' : ''}`}>
                                                {sub.status === 'done' ? '●' : '○'}
                                            </span>
                                            <span className={sub.status === 'done' ? 'subtask-title-done' : ''}>
                                                {sub.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="task-modal-subtask-add">
                                <input
                                    className="task-modal-input"
                                    placeholder="Add subtask…"
                                    value={subtaskInput}
                                    onChange={e => setSubtaskInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask() }}
                                />
                                <button className="task-subtask-add-btn" onClick={handleAddSubtask}>+</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="task-modal-footer">
                    <button className="task-modal-cancel-btn" onClick={onClose}>Cancel</button>
                    <button className="task-modal-save-btn" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : isNew ? 'Create Task' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}
