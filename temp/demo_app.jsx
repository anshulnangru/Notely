import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import client from './api/client'
import useAuthStore from './store/useAuthStore'
import usePagesStore from './store/usePagesStore'
import usePresenceStore from './store/usePresenceStore'
import useThemeStore from './store/useThemeStore'
import Sidebar from './components/Sidebar/Sidebar'
import NotificationBell from './components/Notifications/NotificationBell'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EditorPage from './pages/EditorPage'
import DashboardPage from './pages/DashboardPage'
import CalendarPage from './pages/CalendarPage'
import InboxPage from './pages/InboxPage'
import LandingPage from './pages/LandingPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import { createPageSocket } from './collaboration/socket'

function ProtectedRoute({ children }) {
    const { token } = useAuthStore()
    if (!token) return <Navigate to="/landing" replace />
    return children
}

function HomeRedirect() {
    const tree = usePagesStore(s => s.tree)
    const fetchTree = usePagesStore(s => s.fetchTree)
    const createPage = usePagesStore(s => s.createPage)
    const navigate = useNavigate()
    const [error, setError] = useState(null)

    useEffect(() => {
        const init = async () => {
            try {
                const pages = await fetchTree()
                if (!pages || pages.length === 0) {
                    await createPage(null)
                    await fetchTree()
                }
            } catch (err) {
                console.error('Failed to load workspace:', err)
                setError(err?.response?.data?.detail || err?.message || 'Could not connect to backend.')
            }
        }
        init()
    }, [])

    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-secondary)', gap: 12 }}>
                <span style={{ fontSize: 32 }}>⚠️</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Failed to load workspace</span>
                <span style={{ fontSize: 13, maxWidth: 360, textAlign: 'center' }}>{error}</span>
                <button
                    style={{ marginTop: 8, padding: '8px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 6, fontWeight: 600 }}
                    onClick={() => { setError(null); window.location.reload() }}
                >Retry</button>
                <button
                    style={{ fontSize: 13, color: 'var(--text-secondary)' }}
                    onClick={() => navigate('/login')}
                >← Back to login</button>
            </div>
        )
    }

    if (tree.length > 0) return <Navigate to="/dashboard" replace />

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div className="spinner" /> Setting up your workspace...
            </div>
        </div>
    )
}

export default function App() {
    const fetchTree = usePagesStore(s => s.fetchTree)
    const { token } = useAuthStore()

    useEffect(() => {
        if (token) fetchTree()
    }, [token])

    const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/" element={<P><HomeRedirect /></P>} />
                <Route path="/dashboard" element={<P><DashboardPage /></P>} />
                <Route path="/calendar" element={<P><CalendarPage /></P>} />
                <Route path="/inbox" element={<P><InboxPage /></P>} />
                <Route path="/page/:id" element={<P><EditorPage /></P>} />
                <Route path="*" element={<Navigate to="/landing" />} />
            </Routes>
        </BrowserRouter>
    )
}

// ============================================================================
// Frontend Appendix: Dashboard page
// ============================================================================

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

export function DemoDashboardPage() {
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

// ============================================================================
// Frontend Appendix: Collaboration provider
// ============================================================================

const DemoCollaborationContext = createContext({
    focusBlock: () => {},
})

export function useDemoCollaboration() {
    return useContext(DemoCollaborationContext)
}

export function DemoCollaborationProvider({ pageId, children }) {
    const token = useAuthStore(s => s.token)
    const setConnecting = usePresenceStore(s => s.setConnecting)
    const setDisconnected = usePresenceStore(s => s.setDisconnected)
    const applySnapshot = usePresenceStore(s => s.applySnapshot)
    const upsertParticipant = usePresenceStore(s => s.upsertParticipant)
    const removeParticipant = usePresenceStore(s => s.removeParticipant)
    const applyRemotePageUpdate = usePagesStore(s => s.applyRemotePageUpdate)
    const applyRemoteBlockCreated = usePagesStore(s => s.applyRemoteBlockCreated)
    const applyRemoteBlockUpdated = usePagesStore(s => s.applyRemoteBlockUpdated)
    const applyRemoteBlockDeleted = usePagesStore(s => s.applyRemoteBlockDeleted)
    const applyRemoteBlocksReordered = usePagesStore(s => s.applyRemoteBlocksReordered)

    const socketRef = useRef(null)
    const reconnectTimerRef = useRef(null)
    const heartbeatTimerRef = useRef(null)
    const mountedRef = useRef(false)

    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    useEffect(() => {
        if (!pageId || !token) {
            setDisconnected()
            return
        }

        let shouldReconnect = true
        let reconnectDelay = 1000

        const clearTimers = () => {
            if (reconnectTimerRef.current) {
                window.clearTimeout(reconnectTimerRef.current)
                reconnectTimerRef.current = null
            }
            if (heartbeatTimerRef.current) {
                window.clearInterval(heartbeatTimerRef.current)
                heartbeatTimerRef.current = null
            }
        }

        const sendHeartbeat = () => {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({ type: 'presence.heartbeat', payload: {} }))
            }
        }

        const connect = () => {
            setConnecting(pageId)
            const socket = createPageSocket(pageId, token, {
                onOpen: () => {
                    reconnectDelay = 1000
                    heartbeatTimerRef.current = window.setInterval(sendHeartbeat, 20000)
                },
                onMessage: (event) => {
                    if (event.type === 'presence.snapshot') {
                        applySnapshot(pageId, event.payload?.participants || [], event.payload?.selfSessionId || null)
                    } else if (event.type === 'presence.join' || event.type === 'presence.focus_block') {
                        if (event.payload) upsertParticipant(event.payload)
                    } else if (event.type === 'presence.leave') {
                        removeParticipant(event.payload?.sessionId)
                    } else if (event.type === 'page.updated') {
                        if (event.payload?.page) applyRemotePageUpdate(event.payload.page)
                    } else if (event.type === 'block.created') {
                        if (event.payload?.block) applyRemoteBlockCreated(event.payload.pageId, event.payload.block)
                    } else if (event.type === 'block.updated') {
                        if (event.payload?.block) applyRemoteBlockUpdated(event.payload.pageId, event.payload.block)
                    } else if (event.type === 'block.deleted') {
                        if (event.payload?.blockId) applyRemoteBlockDeleted(event.payload.pageId, event.payload.blockId)
                    } else if (event.type === 'blocks.reordered') {
                        if (event.payload?.blocks) applyRemoteBlocksReordered(event.payload.pageId, event.payload.blocks)
                    }
                },
                onClose: (event) => {
                    clearTimers()
                    const code = event?.code
                    const reason = event?.reason || ''
                    const isPolicyOrFatal = code === 1008 || code === 1002 || code === 1003
                    setDisconnected(reason)

                    if (!mountedRef.current || !shouldReconnect || isPolicyOrFatal) return

                    reconnectTimerRef.current = window.setTimeout(() => {
                        connect()
                    }, reconnectDelay)
                    reconnectDelay = Math.min(reconnectDelay * 2, 10000)
                },
                onError: () => {
                    clearTimers()
                },
            })

            socketRef.current = socket
        }

        connect()

        return () => {
            shouldReconnect = false
            clearTimers()
            socketRef.current?.close()
            socketRef.current = null
            setDisconnected()
        }
    }, [
        pageId,
        token,
        setConnecting,
        setDisconnected,
        applySnapshot,
        upsertParticipant,
        removeParticipant,
        applyRemotePageUpdate,
        applyRemoteBlockCreated,
        applyRemoteBlockUpdated,
        applyRemoteBlockDeleted,
        applyRemoteBlocksReordered,
    ])

    const value = useMemo(() => ({
        focusBlock(blockId) {
            if (socketRef.current?.readyState !== WebSocket.OPEN) return
            socketRef.current.send(JSON.stringify({
                type: 'presence.focus_block',
                payload: { blockId },
            }))
        },
    }), [])

    return (
        <DemoCollaborationContext.Provider value={value}>
            {children}
        </DemoCollaborationContext.Provider>
    )
}
