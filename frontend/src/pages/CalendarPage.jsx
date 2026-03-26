import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import Sidebar from '../components/Sidebar/Sidebar'
import TaskModal from '../components/Tasks/TaskModal'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const PRIORITY_COLORS = { low: '#6b7280', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' }

export default function CalendarPage() {
    const navigate = useNavigate()
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [tasks, setTasks] = useState([])
    const [today] = useState(new Date())
    const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
    const [editTask, setEditTask] = useState(null)

    useEffect(() => {
        client.get('/tasks').then(r => setTasks(r.data)).catch(() => {})
    }, [])

    const year = current.getFullYear()
    const month = current.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const tasksByDate = {}
    tasks.forEach(t => {
        if (!t.due_date) return
        const d = new Date(t.due_date)
        if (d.getFullYear() === year && d.getMonth() === month) {
            const key = d.getDate()
            if (!tasksByDate[key]) tasksByDate[key] = []
            tasksByDate[key].push(t)
        }
    })

    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)

    const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

    return (
        <div className="app-layout">
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(s => !s)} />
            {sidebarCollapsed && (
                <button className="sidebar-toggle-btn" style={{ position: 'fixed', top: 10, left: 10, zIndex: 100 }}
                    onClick={() => setSidebarCollapsed(false)}>▶</button>
            )}

            <div className="main-content">
                <div className="editor-topbar">
                    {!sidebarCollapsed && (
                        <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(true)}>◀</button>
                    )}
                    <div className="topbar-breadcrumb">
                        <span className="crumb-emoji">📅</span>
                        <span className="crumb-title">Calendar</span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button className="cal-nav-btn" onClick={() => setCurrent(new Date(year, month - 1, 1))}>‹</button>
                        <span className="cal-month-label">{MONTHS[month]} {year}</span>
                        <button className="cal-nav-btn" onClick={() => setCurrent(new Date(year, month + 1, 1))}>›</button>
                    </div>
                </div>

                <div className="editor-scroll">
                    <div className="cal-root">
                        {/* Day names */}
                        <div className="cal-grid">
                            {DAYS.map(d => (
                                <div key={d} className="cal-day-name">{d}</div>
                            ))}
                        </div>

                        {/* Calendar cells */}
                        <div className="cal-grid cal-cells">
                            {cells.map((d, i) => (
                                <div key={i} className={`cal-cell ${d && isToday(d) ? 'cal-today' : ''} ${d ? '' : 'cal-empty'}`}>
                                    {d && (
                                        <>
                                            <div className="cal-date-num">{d}</div>
                                            <div className="cal-task-chips">
                                                {(tasksByDate[d] || []).slice(0, 3).map(t => (
                                                    <div
                                                        key={t.id}
                                                        className="cal-task-chip"
                                                        style={{ borderLeft: `3px solid ${PRIORITY_COLORS[t.priority] || '#7c6af7'}` }}
                                                        onClick={() => setEditTask(t)}
                                                        title={t.title}
                                                    >
                                                        <span className={`cal-chip-status ${t.status === 'done' ? 'done' : ''}`}>
                                                            {t.status === 'done' ? '●' : '○'}
                                                        </span>
                                                        {t.title}
                                                    </div>
                                                ))}
                                                {(tasksByDate[d] || []).length > 3 && (
                                                    <div className="cal-more">+{tasksByDate[d].length - 3} more</div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {editTask && (
                <TaskModal
                    task={editTask}
                    pageId={editTask.page_id}
                    onClose={() => setEditTask(null)}
                />
            )}
        </div>
    )
}
