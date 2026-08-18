import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import AttendanceLineChart from '../components/AttendanceLineChart'
import AttendancePieChart from '../components/AttendancePieChart'
import TaskDeliveryChart from '../components/TaskDeliveryChart'

function EmployeeDashboard({ user }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [notifs, setNotifs] = useState([])

    useEffect(() => {
        api.getEmployeeDashboard()
            .then(setData)
            .catch(err => console.error('Dashboard error:', err))
            .finally(() => setLoading(false))

        api.getNotifications(1)
            .then(d => setNotifs(d.notifications?.slice(0, 5) || []))
            .catch(() => {})
    }, [])

    if (loading) return <div className="d-flex justify-content-center p-5"><div className="spinner-border"></div></div>
    if (!data) return <div className="empty-state p-5">Failed to load dashboard</div>

    return (
        <div className="dashboard-grid employee">
            <div className="dashboard-welcome">
                <h2>Welcome back, {data.userName || user.firstName}!</h2>
                <p>{data.department} - {data.userRole}</p>
            </div>

            <div className="card-widget">
                <h6>My Projects</h6>
                {data.projects.length === 0 ? (
                    <div className="empty-state">No projects assigned</div>
                ) : (
                    data.projects.map(p => (
                        <div key={p._id} className="project-item">
                            <span className={`priority-dot ${p.isHighPriority ? 'high' : 'normal'}`}></span>
                            <div className="project-info">
                                <h6>{p.title}</h6>
                                <small>{p.doneTasks}/{p.totalTasks} tasks done - Due {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'N/A'}</small>
                                <div className="progress-bar-custom mt-1">
                                    <div className="fill blue" style={{ width: `${p.totalTasks ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="card-widget">
                <h6>Calendar</h6>
                <div style={{ textAlign: 'center', padding: 20 }}>
                    <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--blue-color)' }}>
                        {new Date().getDate()}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--gray-500)', fontWeight: 600 }}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', year: 'numeric' })}
                    </div>
                    <a href="/calendar" className="btn-primary-custom d-inline-block mt-3" style={{ textDecoration: 'none' }}>
                        Open Full Calendar
                    </a>
                </div>
            </div>

            <div className="card-widget">
                <h6>Upcoming Deadlines</h6>
                {data.deadlines.length === 0 ? (
                    <div className="empty-state">No upcoming deadlines</div>
                ) : (
                    data.deadlines.slice(0, 5).map(d => (
                        <div key={d._id} className="project-item">
                            <span className={`priority-dot ${d.priority === 'critical' || d.priority === 'high' ? 'high' : 'normal'}`}></span>
                            <div className="project-info">
                                <h6>{d.title}</h6>
                                <small>{d.project} - Due {new Date(d.dueDate).toLocaleDateString()}</small>
                                <div className="progress-bar-custom mt-1">
                                    <div className={`fill ${d.progress >= 80 ? 'green' : d.progress >= 40 ? 'blue' : 'orange'}`} style={{ width: `${d.progress}%` }}></div>
                                </div>
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>{d.progress}%</span>
                        </div>
                    ))
                )}
            </div>

            <div className="card-widget">
                <h6>Upcoming Meetings</h6>
                {data.meetings.length === 0 ? (
                    <div className="empty-state">No upcoming meetings</div>
                ) : (
                    data.meetings.slice(0, 5).map(m => (
                        <div key={m._id} className="meeting-item">
                            <span className="time-badge">{m.startTime} - {m.endTime}</span>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>Room {m.roomNo}</div>
                                <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{m.date}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="card-widget">
                <h6>Leave Status</h6>
                <div className="leave-stats">
                    <div className="leave-stat-item accepted">
                        <div className="count">{data.leaveStatus.accepted}</div>
                        <div className="label">Approved</div>
                    </div>
                    <div className="leave-stat-item rejected">
                        <div className="count">{data.leaveStatus.rejected}</div>
                        <div className="label">Rejected</div>
                    </div>
                    <div className="leave-stat-item pending">
                        <div className="count">{data.leaveStatus.pending}</div>
                        <div className="label">Pending</div>
                    </div>
                    <div className="leave-stat-item">
                        <div className="count" style={{ color: 'var(--blue-color)' }}>{data.leaveStatus.balance}</div>
                        <div className="label">Balance</div>
                    </div>
                </div>
                <div className="progress-bar-custom mt-3">
                    <div className="fill green" style={{ width: `${data.leaveStatus.total ? Math.round((data.leaveStatus.accepted / data.leaveStatus.total) * 100) : 0}%` }}></div>
                </div>
            </div>

            <div className="card-widget">
                <h6>Attendance Trend (This Week)</h6>
                <AttendanceLineChart data={data.attendanceTrend} />
            </div>

            <div className="card-widget">
                <h6>On-Time Rate (This Month)</h6>
                <AttendancePieChart rate={data.onTimeRate} label={`${data.totalAttendanceDays} days tracked`} />
            </div>

            <div className="card-widget">
                <h6>Task Delivery Rate</h6>
                <TaskDeliveryChart onTime={data.taskDelivery.onTime} late={data.taskDelivery.late} />
            </div>

            <div className="card-widget" style={{ gridColumn: '1 / -1' }}>
                <h6>Recent Notifications</h6>
                {notifs.length === 0 ? (
                    <div className="empty-state">
                        No notifications yet
                    </div>
                ) : (
                    <>
                        {notifs.map(n => (
                            <div key={n._id} className={`notification-item ${n.isRead ? '' : 'unread'}`}>
                                <div className="notif-title">{n.title}</div>
                                <div className="notif-message">{n.message}</div>
                            </div>
                        ))}
                        <div style={{ textAlign: 'center', paddingTop: 8 }}>
                            <a href="/notifications" style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue-color)' }}>
                                View all
                            </a>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default EmployeeDashboard
