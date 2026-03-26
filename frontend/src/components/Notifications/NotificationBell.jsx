import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'

export default function NotificationBell() {
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState([])
    const [unread, setUnread] = useState(0)
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    const load = async () => {
        try {
            const [nRes, cRes] = await Promise.all([
                client.get('/notifications'),
                client.get('/notifications/unread-count'),
            ])
            setNotifications(nRes.data)
            setUnread(cRes.data.count)
        } catch { /* ignore */ }
    }

    // Poll every 30s
    useEffect(() => {
        load()
        const interval = setInterval(load, 30000)
        return () => clearInterval(interval)
    }, [])

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

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

    const TYPE_ICONS = { mention: '💬', comment: '📝', task_assigned: '✅', due_soon: '⏰', info: 'ℹ️' }

    return (
        <div className="notif-bell-wrap" ref={ref}>
            <button
                className="notif-bell-btn"
                onClick={() => setOpen(o => !o)}
                title="Notifications"
            >
                🔔
                {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
            </button>

            {open && (
                <div className="notif-dropdown">
                    <div className="notif-header">
                        <span className="notif-title">Notifications</span>
                        {unread > 0 && (
                            <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>
                        )}
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
                                <span className="notif-type-icon">{TYPE_ICONS[n.type] || 'ℹ️'}</span>
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
