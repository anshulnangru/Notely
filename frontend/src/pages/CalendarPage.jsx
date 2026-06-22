import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar/Sidebar'
import TaskModal from '../components/Tasks/TaskModal'
import NotificationBell from '../components/Notifications/NotificationBell'
import client from '../api/client'
import usePagesStore from '../store/usePagesStore'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PRIORITY_COLORS = { low: '#64748b', medium: '#2563eb', high: '#f59e0b', urgent: '#dc2626' }

function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate()
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatShortDate(value) {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function flattenTree(nodes) {
    return nodes.flatMap(node => [node, ...flattenTree(node.children || [])])
}

export default function CalendarPage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [tasks, setTasks] = useState([])
    const [editTask, setEditTask] = useState(null)
    const [today] = useState(startOfDay(new Date()))
    const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
    const [selectedDate, setSelectedDate] = useState(today)
    const tree = usePagesStore(s => s.tree)

    const loadTasks = () => client.get('/tasks').then(r => setTasks(r.data)).catch(() => {})

    useEffect(() => {
        loadTasks()
    }, [])

    const pageLookup = useMemo(() => {
        const map = {}
        flattenTree(tree).forEach(page => {
            map[page.id] = page
        })
        return map
    }, [tree])

    const normalizedTasks = useMemo(() => tasks.map(task => ({
        ...task,
        dueDateObj: task.due_date ? new Date(task.due_date) : null,
    })), [tasks])

    const year = current.getFullYear()
    const month = current.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const tasksByDate = useMemo(() => {
        const grouped = {}
        normalizedTasks.forEach(task => {
            if (!task.dueDateObj) return
            if (task.dueDateObj.getFullYear() === year && task.dueDateObj.getMonth() === month) {
                const key = task.dueDateObj.getDate()
                if (!grouped[key]) grouped[key] = []
                grouped[key].push(task)
            }
        })
        return grouped
    }, [month, normalizedTasks, year])

    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let day = 1; day <= daysInMonth; day++) cells.push(day)

    const upcomingTasks = normalizedTasks
        .filter(task => task.dueDateObj && startOfDay(task.dueDateObj) >= today && task.status !== 'done')
        .sort((a, b) => a.dueDateObj - b.dueDateObj)
        .slice(0, 6)

    const selectedDateTasks = normalizedTasks
        .filter(task => task.dueDateObj && sameDay(startOfDay(task.dueDateObj), selectedDate))
        .sort((a, b) => a.dueDateObj - b.dueDateObj)

    const overdueTasks = normalizedTasks.filter(task =>
        task.dueDateObj && startOfDay(task.dueDateObj) < today && task.status !== 'done',
    )
    const todayTasks = normalizedTasks.filter(task =>
        task.dueDateObj && sameDay(startOfDay(task.dueDateObj), today),
    )
    const weekLimit = new Date(today)
    weekLimit.setDate(today.getDate() + 7)
    const weekTasks = normalizedTasks.filter(task =>
        task.dueDateObj
        && startOfDay(task.dueDateObj) >= today
        && startOfDay(task.dueDateObj) <= weekLimit,
    )

    const pageClusters = Object.values(normalizedTasks.reduce((acc, task) => {
        if (!task.page_id) return acc
        if (!acc[task.page_id]) {
            acc[task.page_id] = {
                pageId: task.page_id,
                pageTitle: pageLookup[task.page_id]?.title || 'Untitled page',
                emoji: pageLookup[task.page_id]?.emoji || '📄',
                total: 0,
                pending: 0,
            }
        }
        acc[task.page_id].total += 1
        if (task.status !== 'done') acc[task.page_id].pending += 1
        return acc
    }, {})).sort((a, b) => b.pending - a.pending).slice(0, 4)

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
                        <span className="crumb-emoji">🗓</span>
                        <span className="crumb-title">Meetings</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                        <button className="cal-nav-btn" onClick={() => setCurrent(new Date(year, month - 1, 1))}>‹</button>
                        <span className="cal-month-label">{MONTHS[month]} {year}</span>
                        <button className="cal-nav-btn" onClick={() => setCurrent(new Date(year, month + 1, 1))}>›</button>
                        <NotificationBell />
                    </div>
                </div>

                <div className="editor-scroll">
                    <div className="meetings-root">
                        <section className="meetings-hero">
                            <div>
                                <div className="meetings-kicker">Planning hub</div>
                                <h1 className="meetings-title">Meetings that actually lead to follow-up</h1>
                                <p className="meetings-subtitle">
                                    Inspired by the way apps like Notion Calendar pair a broad date view with agenda context, this space blends your month, next actions, and day-by-day focus.
                                </p>
                            </div>
                            <div className="meetings-hero-actions">
                                <button className="meetings-action-btn" onClick={() => setSelectedDate(today)}>Jump To Today</button>
                                <button className="meetings-action-btn solid" onClick={loadTasks}>Refresh agenda</button>
                            </div>
                        </section>

                        <section className="meetings-stats-grid">
                            <div className="meetings-stat-card">
                                <span className="meetings-stat-label">Today</span>
                                <span className="meetings-stat-value">{todayTasks.length}</span>
                                <span className="meetings-stat-foot">Items on the agenda</span>
                            </div>
                            <div className="meetings-stat-card">
                                <span className="meetings-stat-label">Next 7 Days</span>
                                <span className="meetings-stat-value">{weekTasks.length}</span>
                                <span className="meetings-stat-foot">Upcoming touchpoints</span>
                            </div>
                            <div className="meetings-stat-card alert">
                                <span className="meetings-stat-label">Overdue</span>
                                <span className="meetings-stat-value">{overdueTasks.length}</span>
                                <span className="meetings-stat-foot">Loose ends to close</span>
                            </div>
                            <div className="meetings-stat-card">
                                <span className="meetings-stat-label">Tracked Pages</span>
                                <span className="meetings-stat-value">{pageClusters.length}</span>
                                <span className="meetings-stat-foot">Active meeting lanes</span>
                            </div>
                        </section>

                        <section className="meetings-board">
                            <div className="meetings-panel meetings-agenda-panel">
                                <div className="meetings-panel-head">
                                    <div>
                                        <span className="meetings-panel-kicker">Selected day</span>
                                        <h2 className="meetings-panel-title">
                                            {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </h2>
                                    </div>
                                    <span className="meetings-panel-badge">{selectedDateTasks.length} items</span>
                                </div>
                                {selectedDateTasks.length === 0 ? (
                                    <div className="meetings-empty">Nothing scheduled. Use this as prep time or pick another date.</div>
                                ) : (
                                    <div className="meetings-agenda-list">
                                        {selectedDateTasks.map(task => (
                                            <button key={task.id} className="meetings-agenda-item" onClick={() => setEditTask(task)}>
                                                <span className="meetings-agenda-dot" style={{ background: PRIORITY_COLORS[task.priority] || '#111827' }} />
                                                <div className="meetings-agenda-copy">
                                                    <div className="meetings-agenda-title">{task.title}</div>
                                                    <div className="meetings-agenda-meta">
                                                        {(pageLookup[task.page_id]?.emoji || '📄')} {pageLookup[task.page_id]?.title || 'Untitled page'}
                                                        {' • '}
                                                        {task.status.replace('_', ' ')}
                                                    </div>
                                                </div>
                                                <span className="meetings-agenda-date">{formatShortDate(task.due_date)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="meetings-side-column">
                                <div className="meetings-panel">
                                    <div className="meetings-panel-head">
                                        <div>
                                            <span className="meetings-panel-kicker">Upcoming</span>
                                            <h2 className="meetings-panel-title">Next follow-ups</h2>
                                        </div>
                                    </div>
                                    <div className="meetings-mini-list">
                                        {upcomingTasks.length === 0 && <div className="meetings-empty compact">No upcoming items yet.</div>}
                                        {upcomingTasks.map(task => (
                                            <button key={task.id} className="meetings-mini-item" onClick={() => {
                                                setCurrent(new Date(task.dueDateObj.getFullYear(), task.dueDateObj.getMonth(), 1))
                                                setSelectedDate(startOfDay(task.dueDateObj))
                                            }}>
                                                <div>
                                                    <div className="meetings-mini-title">{task.title}</div>
                                                    <div className="meetings-mini-meta">{formatShortDate(task.due_date)} • {pageLookup[task.page_id]?.title || 'Untitled page'}</div>
                                                </div>
                                                <span className={`meetings-priority-pill ${task.priority}`}>{task.priority}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="meetings-panel">
                                    <div className="meetings-panel-head">
                                        <div>
                                            <span className="meetings-panel-kicker">Meeting lanes</span>
                                            <h2 className="meetings-panel-title">Active pages</h2>
                                        </div>
                                    </div>
                                    <div className="meetings-cluster-list">
                                        {pageClusters.length === 0 && <div className="meetings-empty compact">No page activity yet.</div>}
                                        {pageClusters.map(cluster => (
                                            <div key={cluster.pageId} className="meetings-cluster-item">
                                                <div className="meetings-cluster-title">{cluster.emoji} {cluster.pageTitle}</div>
                                                <div className="meetings-cluster-meta">{cluster.pending} pending • {cluster.total} total items</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="meetings-panel meetings-calendar-panel">
                            <div className="meetings-panel-head">
                                <div>
                                    <span className="meetings-panel-kicker">Month view</span>
                                    <h2 className="meetings-panel-title">{MONTHS[month]} overview</h2>
                                </div>
                                <span className="meetings-panel-badge">Click a day to focus</span>
                            </div>
                            <div className="cal-grid">
                                {DAYS.map(day => (
                                    <div key={day} className="cal-day-name">{day}</div>
                                ))}
                            </div>
                            <div className="cal-grid cal-cells">
                                {cells.map((day, index) => {
                                    const cellDate = day ? new Date(year, month, day) : null
                                    const isSelected = cellDate && sameDay(cellDate, selectedDate)
                                    const isTodayCell = cellDate && sameDay(cellDate, today)
                                    return (
                                        <button
                                            key={`${day || 'empty'}-${index}`}
                                            className={`cal-cell ${isTodayCell ? 'cal-today' : ''} ${!day ? 'cal-empty' : ''} ${isSelected ? 'cal-selected' : ''}`}
                                            onClick={() => day && setSelectedDate(cellDate)}
                                            disabled={!day}
                                        >
                                            {day && (
                                                <>
                                                    <div className="cal-date-num">{day}</div>
                                                    <div className="cal-task-chips">
                                                        {(tasksByDate[day] || []).slice(0, 3).map(task => (
                                                            <div
                                                                key={task.id}
                                                                className="cal-task-chip"
                                                                style={{ borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || '#7c6af7'}` }}
                                                                onClick={(event) => {
                                                                    event.stopPropagation()
                                                                    setEditTask(task)
                                                                }}
                                                                title={task.title}
                                                            >
                                                                <span className={`cal-chip-status ${task.status === 'done' ? 'done' : ''}`}>
                                                                    {task.status === 'done' ? '●' : '○'}
                                                                </span>
                                                                {task.title}
                                                            </div>
                                                        ))}
                                                        {(tasksByDate[day] || []).length > 3 && (
                                                            <div className="cal-more">+{tasksByDate[day].length - 3} more</div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {editTask && (
                <TaskModal
                    task={editTask}
                    pageId={editTask.page_id}
                    onClose={() => setEditTask(null)}
                    onSaved={loadTasks}
                />
            )}
        </div>
    )
}
