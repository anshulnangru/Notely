import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import Sidebar from '../components/Sidebar/Sidebar'
import NotificationBell from '../components/Notifications/NotificationBell'

const TYPE_ICONS = {
    mention: '💬',
    comment: '📝',
    task_assigned: '✅',
    task_updated: '🛠️',
    task_due_24h: '🕒',
    task_due_1h: '⏳',
    task_due_15m: '⏰',
    task_overdue: '⚠️',
    due_soon: '⏰',
    info: 'ℹ️',
}

function formatTime(value) {
    return new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default function InboxPage() {
    const navigate = useNavigate()
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [loading, setLoading] = useState(true)
    const [activeView, setActiveView] = useState('all')
    const [data, setData] = useState({ notifications: [], messages: [], stats: null })

    const loadInbox = async () => {
        setLoading(true)
        try {
            const res = await client.get('/inbox')
            setData(res.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadInbox()
    }, [])

    const feed = useMemo(() => {
        const notificationItems = (data.notifications || []).map((item) => ({
            ...item,
            feedType: 'notification',
            timestamp: item.created_at,
        }))
        const messageItems = (data.messages || []).map((item) => ({
            ...item,
            feedType: 'message',
            timestamp: item.created_at,
        }))

        const merged = [...notificationItems, ...messageItems].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        )

        if (activeView === 'notifications') return notificationItems
        if (activeView === 'messages') return messageItems
        return merged
    }, [activeView, data.messages, data.notifications])

    const markRead = async (notification) => {
        if (!notification || notification.feedType !== 'notification') return
        if (!notification.read) await client.put(`/notifications/${notification.id}/read`)
        await loadInbox()
        if (notification.link) navigate(notification.link)
    }

    const markAllRead = async () => {
        await client.put('/notifications/read-all')
        await loadInbox()
    }

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
                        <span className="crumb-emoji">📥</span>
                        <span className="crumb-title">Inbox</span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <NotificationBell />
                    </div>
                </div>

                <div className="editor-scroll">
                    <div className="inbox-root">
                        <section className="inbox-hero">
                            <div>
                                <div className="inbox-kicker">Workspace updates</div>
                                <h1 className="inbox-title">Everything that needs your attention</h1>
                                <p className="inbox-subtitle">
                                    Notifications and teammate messages now land in one place so triage feels more like a real inbox.
                                </p>
                            </div>
                            <div className="inbox-actions">
                                <button className="inbox-action-btn" onClick={loadInbox}>Refresh</button>
                                <button className="inbox-action-btn solid" onClick={markAllRead}>Mark All Read</button>
                            </div>
                        </section>

                        <section className="inbox-stats-grid">
                            <div className="inbox-stat-card">
                                <span className="inbox-stat-label">Unread Notifications</span>
                                <span className="inbox-stat-value">{data.stats?.unread_notifications || 0}</span>
                            </div>
                            <div className="inbox-stat-card">
                                <span className="inbox-stat-label">Unread Mentions</span>
                                <span className="inbox-stat-value">{data.stats?.unread_mentions || 0}</span>
                            </div>
                            <div className="inbox-stat-card">
                                <span className="inbox-stat-label">Recent Messages</span>
                                <span className="inbox-stat-value">{data.stats?.recent_messages || 0}</span>
                            </div>
                            <div className="inbox-stat-card">
                                <span className="inbox-stat-label">Items In 24h</span>
                                <span className="inbox-stat-value">{data.stats?.today_items || 0}</span>
                            </div>
                        </section>

                        <section className="inbox-feed-shell">
                            <div className="inbox-view-tabs">
                                {[
                                    { id: 'all', label: 'All activity' },
                                    { id: 'notifications', label: 'Notifications' },
                                    { id: 'messages', label: 'Messages' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        className={`inbox-view-btn ${activeView === tab.id ? 'active' : ''}`}
                                        onClick={() => setActiveView(tab.id)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {loading ? (
                                <div className="inbox-empty-state"><div className="spinner" /> Loading inbox…</div>
                            ) : feed.length === 0 ? (
                                <div className="inbox-empty-state">No inbox activity yet.</div>
                            ) : (
                                <div className="inbox-feed-list">
                                    {feed.map(item => item.feedType === 'notification' ? (
                                        <button
                                            key={`notification-${item.id}`}
                                            className={`inbox-feed-card ${item.read ? '' : 'unread'}`}
                                            onClick={() => markRead(item)}
                                        >
                                            <div className="inbox-feed-icon">{TYPE_ICONS[item.type] || 'ℹ️'}</div>
                                            <div className="inbox-feed-body">
                                                <div className="inbox-feed-meta">
                                                    <span className="inbox-feed-kind">Notification</span>
                                                    <span className="inbox-feed-time">{formatTime(item.created_at)}</span>
                                                </div>
                                                <div className="inbox-feed-title">{item.body}</div>
                                                <div className="inbox-feed-context">
                                                    {item.link ? 'Open related page' : 'Stored in your activity stream'}
                                                </div>
                                            </div>
                                            {!item.read && <span className="inbox-unread-dot" />}
                                        </button>
                                    ) : (
                                        <button
                                            key={`message-${item.id}`}
                                            className="inbox-feed-card"
                                            onClick={() => item.link && navigate(item.link)}
                                        >
                                            <div className="inbox-feed-avatar">
                                                {(item.author?.name || item.author?.email || 'U')[0].toUpperCase()}
                                            </div>
                                            <div className="inbox-feed-body">
                                                <div className="inbox-feed-meta">
                                                    <span className="inbox-feed-kind">Message</span>
                                                    <span className="inbox-feed-time">{formatTime(item.created_at)}</span>
                                                </div>
                                                <div className="inbox-feed-title">
                                                    {item.author?.name || item.author?.email} commented
                                                </div>
                                                <div className="inbox-feed-message">{item.body}</div>
                                                <div className="inbox-feed-context">
                                                    {item.page_title || 'Untitled page'}
                                                    {item.task_title ? ` • ${item.task_title}` : ''}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
