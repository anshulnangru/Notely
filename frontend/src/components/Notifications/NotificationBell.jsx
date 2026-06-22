import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'

function getNotificationIcon(type) {
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
    return TYPE_ICONS[type] || 'ℹ️'
}

function getBrowserNotificationTitle(type) {
    if (type === 'task_overdue') return 'Task overdue'
    if (type === 'task_due_15m') return 'Task reminder: 15 minutes left'
    if (type === 'task_due_1h') return 'Task reminder: 1 hour left'
    if (type === 'task_due_24h') return 'Task reminder: 24 hours left'
    if (type === 'task_assigned') return 'Task assigned'
    if (type === 'task_updated') return 'Task updated'
    return 'Notely notification'
}

export default function NotificationBell() {
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState([])
    const [unread, setUnread] = useState(0)
    const [open, setOpen] = useState(false)
    const [toast, setToast] = useState(null)   // { body, icon }
    const ref = useRef(null)
    const prevUnreadRef = useRef(null)
    const browserNotificationRef = useRef(null)

    const showBrowserNotification = (notification) => {
        if (typeof window === 'undefined' || !('Notification' in window)) return
        if (Notification.permission !== 'granted') return

        browserNotificationRef.current?.close?.()
        const browserNotification = new Notification(getBrowserNotificationTitle(notification.type), {
            body: notification.body,
            tag: `notely-${notification.id}`,
        })

        browserNotification.onclick = () => {
            window.focus()
            if (notification.link) navigate(notification.link)
            browserNotification.close()
        }

        browserNotificationRef.current = browserNotification
    }

    const load = async () => {
        try {
            const [nRes, cRes] = await Promise.all([
                client.get('/notifications'),
                client.get('/notifications/unread-count'),
            ])
            const newCount = cRes.data.count

            // Show toast when unread count increases (new notifications arrived)
            if (prevUnreadRef.current !== null && newCount > prevUnreadRef.current) {
                // Find the newest unread notification to use as toast body
                const newest = nRes.data.find(n => !n.read)
                if (newest) {
                    setToast({ body: newest.body, icon: getNotificationIcon(newest.type) })
                    showBrowserNotification(newest)
                }
            }
            prevUnreadRef.current = newCount

            setNotifications(nRes.data)
            setUnread(newCount)
        } catch { /* ignore */ }
    }

    // Poll every 10s so minute-level reminders feel close to real-time
    useEffect(() => {
        load()
        const interval = setInterval(load, 10000)
        return () => clearInterval(interval)
    }, [])

    // Auto-dismiss toast after 4 seconds
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 4000)
        return () => clearTimeout(t)
    }, [toast])

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    useEffect(() => () => browserNotificationRef.current?.close?.(), [])

    const markRead = async (id, link) => {
        await client.put(`/notifications/${id}/read`)
        setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x))
        setUnread(u => Math.max(0, u - 1))
        if (link) { setOpen(false); navigate(link) }
    }

    const markAllRead = async () => {
        await client.put('/notifications/read-all')
        setNotifications(n => n.map(x => ({ ...x, read: true })))
        setUnread(0)
    }

    return (
        <div className="notif-bell-wrap" ref={ref}>
            {/* Toast popup */}
            {toast && (
                <div className="notif-toast fade-in" onClick={() => setToast(null)}>
                    <span className="notif-toast-icon">{toast.icon}</span>
                    <span className="notif-toast-body">{toast.body}</span>
                    <button className="notif-toast-close" onClick={() => setToast(null)}>✕</button>
                </div>
            )}

            <button
                className="notif-bell-btn"
                onClick={async () => {
                    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                        try { await Notification.requestPermission() } catch { /* ignore */ }
                    }
                    setOpen(o => !o)
                }}
                title="Notifications"
            >
                🔔
                {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
            </button>

            {open && (
                <div className="notif-dropdown">
                    <div className="notif-header">
                        <span className="notif-title">Notifications</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button className="notif-mark-all" onClick={() => { setOpen(false); navigate('/inbox') }}>Open inbox</button>
                            {unread > 0 && (
                                <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>
                            )}
                        </div>
                    </div>

                    <div className="notif-list">
                        {notifications.length === 0 && (
                            <div className="notif-empty">No notifications yet</div>
                        )}
                        {notifications.map(n => (
                            <div
                                key={n.id}
                                className={`notif-item ${n.read ? '' : 'unread'}`}
                                onClick={() => markRead(n.id, n.link)}
                            >
                                <span className="notif-type-icon">{getNotificationIcon(n.type)}</span>
                                <div className="notif-content">
                                    <div className="notif-body">{n.body}</div>
                                    <div className="notif-time">
                                        {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                {!n.read && <div className="notif-dot" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
