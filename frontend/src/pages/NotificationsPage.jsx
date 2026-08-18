import { useState, useEffect } from 'react'
import { api } from '../lib/api'

function NotificationsPage({ user }) {
    const [data, setData] = useState({ notifications: [], total: 0, page: 1, pages: 1 })
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)

    const load = (p) => {
        setLoading(true)
        api.getNotifications(p)
            .then(d => { setData(d); setPage(p) })
            .catch(() => {})
            .finally(() => setLoading(false))
    }

    useEffect(() => { load(1) }, [])

    const handleMarkRead = async (id) => {
        await api.markAsRead(id).catch(() => {})
        setData(d => ({
            ...d,
            notifications: d.notifications.map(n => n._id === id ? { ...n, isRead: true } : n),
        }))
    }

    const handleMarkAllRead = async () => {
        await api.markAllAsRead().catch(() => {})
        setData(d => ({
            ...d,
            notifications: d.notifications.map(n => ({ ...n, isRead: true })),
        }))
    }

    const timeAgo = (d) => {
        const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
        if (s < 60) return 'just now'
        if (s < 3600) return `${Math.floor(s / 60)} min ago`
        if (s < 86400) return `${Math.floor(s / 3600)} hours ago`
        return new Date(d).toLocaleDateString()
    }

    const typeBadge = (type) => {
        return (
            <span style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: 4,
                background: 'var(--gray-100)',
                color: 'var(--gray-700)',
                marginTop: 2
            }}>
                {type}
            </span>
        )
    }

    return (
        <div className="notifications-page">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 style={{ fontWeight: 700, color: 'var(--blue-color)', fontSize: 20 }}>Notifications</h4>
                <button className="btn-secondary-custom" onClick={handleMarkAllRead}>
                    Mark all as read
                </button>
            </div>

            <div className="notif-full">
                {loading ? (
                    <div className="d-flex justify-content-center p-4"><div className="spinner-border spinner-border-sm"></div></div>
                ) : data.notifications.length === 0 ? (
                    <div className="empty-state p-5">
                        No notifications found
                    </div>
                ) : (
                    data.notifications.map(n => (
                        <div
                            key={n._id}
                            className={`notification-item ${n.isRead ? '' : 'unread'}`}
                            onClick={() => !n.isRead && handleMarkRead(n._id)}
                        >
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <div>{typeBadge(n.type)}</div>
                                <div style={{ flex: 1 }}>
                                    <div className="notif-title">{n.title}</div>
                                    <div className="notif-message">{n.message}</div>
                                    <div className="notif-time">
                                        {timeAgo(n.createdAt)}
                                        {n.emailSent && <span style={{ marginLeft: 8, color: 'var(--green-dark)' }}>Email Sent</span>}
                                    </div>
                                </div>
                                {!n.isRead && (
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue-color)', flexShrink: 0, marginTop: 6 }}></span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {data.pages > 1 && (
                <div className="d-flex justify-content-center gap-2 mt-3">
                    <button className="btn-secondary-custom" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</button>
                    <span style={{ fontSize: 13, lineHeight: '36px', color: 'var(--gray-500)' }}>
                        Page {page} of {data.pages}
                    </span>
                    <button className="btn-secondary-custom" disabled={page >= data.pages} onClick={() => load(page + 1)}>Next</button>
                </div>
            )}
        </div>
    )
}

export default NotificationsPage
