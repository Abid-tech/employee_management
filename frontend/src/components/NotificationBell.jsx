import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

function NotificationBell() {
    const [count, setCount] = useState(0)
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const ref = useRef(null)
    const navigate = useNavigate()

    const fetchCount = () => {
        api.getUnreadCount().then(d => setCount(d.count)).catch(() => {})
    }

    useEffect(() => {
        fetchCount()
        const interval = setInterval(fetchCount, 30000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const handleOpen = async () => {
        setOpen(!open)
        if (!open) {
            try {
                const data = await api.getNotifications(1)
                setNotifications(data.notifications?.slice(0, 5) || [])
            } catch {}
        }
    }

    const handleClick = async (notif) => {
        if (!notif.isRead) {
            await api.markAsRead(notif._id).catch(() => {})
            setCount(c => Math.max(0, c - 1))
        }
        setOpen(false)
        if (notif.link) navigate(notif.link)
    }

    const timeAgo = (d) => {
        const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
        if (s < 60) return 'just now'
        if (s < 3600) return `${Math.floor(s / 60)}m ago`
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`
        return `${Math.floor(s / 86400)}d ago`
    }

    return (
        <div className="notification-bell" ref={ref} onClick={handleOpen}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {count > 0 && <span className="badge-count">{count > 99 ? '99+' : count}</span>}

            {open && (
                <div className="notification-dropdown" onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--blue-color)' }}>Notifications</span>
                        {count > 0 && (
                            <button
                                style={{ border: 'none', background: 'none', fontSize: '11px', color: 'var(--blue-color)', fontWeight: 600, cursor: 'pointer' }}
                                onClick={async (e) => {
                                    e.stopPropagation()
                                    await api.markAllAsRead().catch(() => {})
                                    setCount(0)
                                    setNotifications(n => n.map(x => ({ ...x, isRead: true })))
                                }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <div className="empty-state">
                            No notifications yet
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div key={n._id} className={`notification-item ${n.isRead ? '' : 'unread'}`} onClick={() => handleClick(n)}>
                                <div className="notif-title">{n.title}</div>
                                <div className="notif-message">{n.message}</div>
                                <div className="notif-time">{timeAgo(n.createdAt)}</div>
                            </div>
                        ))
                    )}
                    <div
                        style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid var(--gray-200)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--blue-color)' }}
                        onClick={() => { setOpen(false); navigate('/notifications') }}
                    >
                        View all notifications
                    </div>
                </div>
            )}
        </div>
    )
}

export default NotificationBell
