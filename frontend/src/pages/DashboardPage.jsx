import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import Sidebar from '../components/Sidebar/Sidebar'
import NotificationBell from '../components/Notifications/NotificationBell'
import useAuthStore from '../store/useAuthStore'

function useAnimatedNumber(target, delay = 0) {
    const [value, setValue] = useState(0)

    useEffect(() => {
        setValue(0)
        const timeout = setTimeout(() => {
            let current = 0
            const step = Math.max(1, Math.ceil(target / 15))
            const interval = setInterval(() => {
                current = Math.min(current + step, target)
                setValue(current)
                if (current >= target) clearInterval(interval)
            }, 40)
            return () => clearInterval(interval)
        }, delay)

        return () => clearTimeout(timeout)
    }, [target, delay])

    return value
}

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}

function getClock() {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function formatDueDate(value) {
    if (!value) return ''
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function StatCard({ label, value, color, borderColor, delay }) {
    const animated = useAnimatedNumber(value, delay)
    return (
        <div className="dash-stat-card" style={{ borderTopColor: borderColor }}>
            <div className="dash-stat-value" style={{ color }}>{animated}</div>
            <div className="dash-stat-label">{label}</div>
        </div>
    )
}

function ProgressBar({ percent, label }) {
    const [width, setWidth] = useState(0)

    useEffect(() => {
        const timeout = setTimeout(() => setWidth(percent), 500)
        return () => clearTimeout(timeout)
    }, [percent])

    return (
        <div>
            <div className="dash-progress-inline">
                <span className="dash-progress-pct">{percent}%</span>
                <span className="dash-progress-caption">{label}</span>
            </div>
            <div className="dash-progress-bar">
                <div className="dash-progress-fill" style={{ width: `${width}%` }} />
            </div>
        </div>
    )
}

function AlertChip({ count, label, tone, delay }) {
    const animated = useAnimatedNumber(count, delay)
    return (
        <div className={`dash-alert-chip ${tone}`}>
            <div className="dash-alert-count">{animated}</div>
            <div className="dash-alert-label">{label}</div>
        </div>
    )
}

function TaskItem({ task, navigate, tone }) {
    const done = task.status === 'done'
    const tag = tone === 'overdue' ? 'Overdue' : tone === 'today' ? 'Today' : tone === 'upcoming' ? 'Upcoming' : task.priority

    return (
        <div className="dash-task-row" onClick={() => task.page_id && navigate(`/page/${task.page_id}`)}>
            <div className={`dash-task-check ${done ? 'done' : ''}`}>
                {done && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <polyline points="1,3.5 3,5.5 7,1" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
            <span className={`dash-task-title ${done ? 'done' : ''}`}>{task.title}</span>
            <span className={`dash-task-badge ${tone}`}>{tag}</span>
        </div>
    )
}

function PageItem({ page, navigate }) {
    return (
        <div className="dash-page-item" onClick={() => navigate(`/page/${page.id}`)}>
            <div className="dash-page-icon">{page.emoji || '📄'}</div>
            <span className="dash-page-name">{page.title || 'Untitled'}</span>
            <span className="dash-page-time">{formatDueDate(page.updated_at)}</span>
        </div>
    )
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const user = useAuthStore(s => s.user)
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [clock, setClock] = useState(getClock())

    useEffect(() => {
        client.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        const interval = setInterval(() => setClock(getClock()), 60000)
        return () => clearInterval(interval)
    }, [])

    const stats = data?.stats || {}
    const total = stats.total || 0
    const progress = stats.progress_pct || 0
    const overdueCount = data?.overdue_tasks?.length || 0
    const todayCount = data?.today_tasks?.length || 0
    const upcomingCount = data?.upcoming_tasks?.length || 0
    const completedCount = stats.done || 0

    const statCards = [
        { label: 'Total Tasks', value: total, color: '#4f46e5', borderColor: '#4f46e5', delay: 240 },
        { label: 'To Do', value: stats.todo || 0, color: '#185FA5', borderColor: '#378ADD', delay: 320 },
        { label: 'In Progress', value: stats.in_progress || 0, color: '#BA7517', borderColor: '#BA7517', delay: 400 },
        { label: 'Done', value: completedCount, color: '#3B6D11', borderColor: '#3B6D11', delay: 480 },
    ]

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
                        <span className="crumb-title">Home</span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <NotificationBell />
                    </div>
                </div>

                <div className="editor-scroll">
                    {loading ? (
                        <div className="loading-overlay"><div className="spinner" /> Loading dashboard…</div>
                    ) : (
                        <div className="dash-root dash-home">
                            <section className="dash-hero">
                                <div>
                                    <div className="dash-hero-greeting">{getGreeting()}, {user?.name || user?.email || 'there'}</div>
                                    <h1 className="dash-hero-title">Here&apos;s your workspace overview for today.</h1>
                                    <p className="dash-hero-subtitle">A calmer snapshot of tasks, progress, recent pages, and what deserves attention next.</p>
                                </div>
                                <div className="dash-hero-meta">
                                    <span className="dash-hero-clock">{clock}</span>
                                    <div className="dash-hero-avatar">{(user?.name || user?.email || 'U')[0].toUpperCase()}</div>
                                </div>
                            </section>

                            <section className="dash-stats-row">
                                {statCards.map(card => <StatCard key={card.label} {...card} />)}
                            </section>

                            <section className="dash-home-grid">
                                <div className="dash-card dash-progress-card">
                                    <div className="dash-card-kicker">Overall progress</div>
                                    <ProgressBar percent={progress} label={`${completedCount} of ${total} tasks complete`} />
                                    <div className="dash-alert-row">
                                        <AlertChip count={overdueCount} label="Overdue" tone="overdue" delay={560} />
                                        <AlertChip count={todayCount} label="Due today" tone="today" delay={620} />
                                        <AlertChip count={upcomingCount} label="This week" tone="upcoming" delay={680} />
                                    </div>
                                </div>

                                <div className="dash-card dash-priority-card">
                                    <div className="dash-card-header">
                                        <div className="dash-card-kicker">Priority tasks</div>
                                    </div>
                                    {data?.overdue_tasks?.slice(0, 2).map(task => (
                                        <TaskItem key={task.id} task={task} navigate={navigate} tone="overdue" />
                                    ))}
                                    {data?.today_tasks?.slice(0, 2).map(task => (
                                        <TaskItem key={task.id} task={task} navigate={navigate} tone="today" />
                                    ))}
                                    {overdueCount === 0 && todayCount === 0 && (
                                        <div className="dash-empty">No urgent tasks right now.</div>
                                    )}
                                </div>
                            </section>

                            <section className="dash-home-grid">
                                <div className="dash-card">
                                    <div className="dash-card-kicker">Recently updated pages</div>
                                    <div className="dash-page-list">
                                        {data?.recent_pages?.length === 0 && <div className="dash-empty">No page updates yet.</div>}
                                        {data?.recent_pages?.map(page => (
                                            <PageItem key={page.id} page={page} navigate={navigate} />
                                        ))}
                                    </div>
                                </div>

                                <div className="dash-card dash-agents-card">
                                    <div className="dash-card-header">
                                        <div className="dash-card-kicker">Agents</div>
                                        <span className="dash-beta-pill">Beta</span>
                                    </div>
                                    <p className="dash-agent-copy">
                                        No agents configured yet. Add one when you want recurring work, triage, or assistant-led research from your home view.
                                    </p>
                                    <button className="dash-agent-btn">+ New agent</button>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
