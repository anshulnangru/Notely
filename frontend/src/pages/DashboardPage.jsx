import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import Sidebar from '../components/Sidebar/Sidebar'

const STATUS_COLORS = { todo: '#6b7280', in_progress: '#f59e0b', done: '#10b981' }
const PRIORITY_COLORS = { low: '#6b7280', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' }

function StatCard({ label, value, icon, color }) {
    return (
        <div className="dash-stat-card" style={{ '--stat-color': color }}>
            <div className="dash-stat-icon">{icon}</div>
            <div className="dash-stat-value" style={{ color }}>{value}</div>
            <div className="dash-stat-label">{label}</div>
        </div>
    )
}

function TaskItem({ task, navigate }) {
    const color = STATUS_COLORS[task.status] || '#6b7280'
    const pColor = PRIORITY_COLORS[task.priority] || '#6b7280'
    return (
        <div className="dash-task-row" onClick={() => task.page_id && navigate(`/page/${task.page_id}`)}>
            <span className="dash-task-status" style={{ color }}>{task.status === 'done' ? '●' : task.status === 'in_progress' ? '◑' : '○'}</span>
            <span className="dash-task-title">{task.title}</span>
            <span className="dash-task-priority" style={{ color: pColor }}>{task.priority}</span>
            {task.due_date && (
                <span className="dash-task-due">
                    {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
            )}
        </div>
    )
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    useEffect(() => {
        client.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
    }, [])

    const stats = data?.stats || {}
    const progress = stats.progress_pct || 0

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
                        <span className="crumb-emoji">🏠</span>
                        <span className="crumb-title">Dashboard</span>
                    </div>
                </div>

                <div className="editor-scroll">
                    {loading ? (
                        <div className="loading-overlay"><div className="spinner" /> Loading dashboard…</div>
                    ) : (
                        <div className="dash-root">
                            {/* Stats row */}
                            <div className="dash-stats-row">
                                <StatCard label="Total Tasks" value={stats.total || 0} icon="📋" color="#7c6af7" />
                                <StatCard label="To Do" value={stats.todo || 0} icon="○" color="#6b7280" />
                                <StatCard label="In Progress" value={stats.in_progress || 0} icon="◑" color="#f59e0b" />
                                <StatCard label="Done" value={stats.done || 0} icon="●" color="#10b981" />
                            </div>

                            {/* Progress bar */}
                            <div className="dash-progress-section">
                                <div className="dash-progress-header">
                                    <span className="dash-section-title">Overall Progress</span>
                                    <span className="dash-progress-pct">{progress}%</span>
                                </div>
                                <div className="dash-progress-bar">
                                    <div className="dash-progress-fill" style={{ width: `${progress}%` }} />
                                </div>
                            </div>

                            <div className="dash-columns">
                                {/* Today */}
                                <div className="dash-section">
                                    <div className="dash-section-title">📅 Due Today ({data?.today_tasks?.length || 0})</div>
                                    {data?.today_tasks?.length === 0
                                        ? <div className="dash-empty">Nothing due today 🎉</div>
                                        : data?.today_tasks?.map(t => <TaskItem key={t.id} task={t} navigate={navigate} />)}
                                </div>

                                {/* Overdue */}
                                <div className="dash-section">
                                    <div className="dash-section-title" style={{ color: '#ef4444' }}>⚠️ Overdue ({data?.overdue_tasks?.length || 0})</div>
                                    {data?.overdue_tasks?.length === 0
                                        ? <div className="dash-empty">No overdue tasks ✅</div>
                                        : data?.overdue_tasks?.map(t => <TaskItem key={t.id} task={t} navigate={navigate} />)}
                                </div>

                                {/* Upcoming */}
                                <div className="dash-section">
                                    <div className="dash-section-title">🗓 Upcoming 7 Days ({data?.upcoming_tasks?.length || 0})</div>
                                    {data?.upcoming_tasks?.length === 0
                                        ? <div className="dash-empty">Nothing upcoming</div>
                                        : data?.upcoming_tasks?.map(t => <TaskItem key={t.id} task={t} navigate={navigate} />)}
                                </div>
                            </div>

                            {/* Recent pages */}
                            <div className="dash-section">
                                <div className="dash-section-title">📄 Recently Updated Pages</div>
                                <div className="dash-recent-pages">
                                    {data?.recent_pages?.map(p => (
                                        <div key={p.id} className="dash-recent-page" onClick={() => navigate(`/page/${p.id}`)}>
                                            <span className="dash-recent-emoji">{p.emoji || '📄'}</span>
                                            <span className="dash-recent-title">{p.title || 'Untitled'}</span>
                                            <span className="dash-recent-date">
                                                {new Date(p.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
