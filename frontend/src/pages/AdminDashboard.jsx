import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import AttendanceHeatmap from '../components/AttendanceHeatmap'

function AdminDashboard({ user }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [seedingNotifs, setSeedingNotifs] = useState(false)
    const [seedingHeatmap, setSeedingHeatmap] = useState(false)
    const [seedResult, setSeedResult] = useState(null)

    useEffect(() => {
        api.getAdminDashboard()
            .then(setData)
            .catch(err => console.error('Admin dashboard error:', err))
            .finally(() => setLoading(false))
    }, [])

    const handleLeaveAction = async (leaveId, action) => {
        try {
            await api.updateLeaveStatus(leaveId, action === 'approve' ? 'Accepted' : 'Rejected')
            const updated = await api.getAdminDashboard()
            setData(updated)
        } catch (err) {
            console.error('Leave action failed:', err)
        }
    }

    const handleSeedNotifications = async () => {
        setSeedingNotifs(true)
        setSeedResult(null)
        try {
            const result = await api.seedDemoNotifications()
            setSeedResult(result)
        } catch (err) {
            setSeedResult({ message: 'Failed: ' + err.message })
        }
        setSeedingNotifs(false)
    }

    const handleSeedHeatmap = async () => {
        setSeedingHeatmap(true)
        setSeedResult(null)
        try {
            const result = await api.seedAttendanceHeatmap()
            setSeedResult(result)
            const updated = await api.getAdminDashboard()
            setData(updated)
        } catch (err) {
            setSeedResult({ message: 'Failed: ' + err.message })
        }
        setSeedingHeatmap(false)
    }

    if (loading) return <div className="d-flex justify-content-center p-5"><div className="spinner-border"></div></div>
    if (!data) return <div className="empty-state p-5">Failed to load admin dashboard</div>

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <div className="dashboard-welcome mb-4">
                <h2>Admin Dashboard</h2>
                <p>Welcome, {user.firstName} {user.lastName}</p>
            </div>

            <div className="row g-3">
                <div className="col-12">
                    <div className="card-widget" style={{ background: 'linear-gradient(135deg, #f0f7ff, #eff6ff)', borderColor: '#3b82f6' }}>
                        <h6>Demo and Testing Tools</h6>
                        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>
                            Use these buttons to seed demo data for testing and demonstration purposes.
                        </p>
                        <div className="d-flex gap-2 flex-wrap">
                            <button
                                className="btn-primary-custom"
                                onClick={handleSeedNotifications}
                                disabled={seedingNotifs}
                                style={{ fontSize: 12 }}
                            >
                                {seedingNotifs ? 'Seeding...' : 'Seed Notifications + Send Email'}
                            </button>
                            <button
                                className="btn-secondary-custom"
                                onClick={handleSeedHeatmap}
                                disabled={seedingHeatmap}
                                style={{ fontSize: 12 }}
                            >
                                {seedingHeatmap ? 'Seeding...' : 'Seed Attendance Heatmap'}
                            </button>
                        </div>
                        {seedResult && (
                            <div style={{ marginTop: 10, padding: '8px 12px', background: '#fff', borderRadius: 8, fontSize: 12, border: '1px solid var(--gray-200)' }}>
                                <strong>{seedResult.message}</strong>
                                {seedResult.emailSent && <span style={{ color: 'var(--green-dark)', marginLeft: 8 }}>Email sent to {seedResult.emailTo}</span>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-12">
                    <div className="card-widget">
                        <h6>Attendance Heatmap (Past Year)</h6>
                        <AttendanceHeatmap heatmap={data.heatmap} />
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="card-widget" style={{ height: '100%' }}>
                        <h6>On Leave Today</h6>
                        {data.onLeaveToday.length === 0 ? (
                            <div className="empty-state">No one is on leave today</div>
                        ) : (
                            data.onLeaveToday.map(l => (
                                <div key={l._id} style={{ padding: '6px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 13 }}>
                                    <strong>{l.user?.firstName} {l.user?.lastName}</strong>
                                    <span style={{ color: 'var(--gray-500)', marginLeft: 8 }}>{l.user?.department}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="card-widget" style={{ height: '100%' }}>
                        <h6>Pending Leave Approvals</h6>
                        {data.pendingLeaves.length === 0 ? (
                            <div className="empty-state">No pending approvals</div>
                        ) : (
                            data.pendingLeaves.slice(0, 5).map(l => (
                                <div key={l._id} className="approval-item">
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                                            {l.user?.firstName} {l.user?.lastName}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                                            {l.leaveType} - {new Date(l.StartDate).toLocaleDateString()} - {new Date(l.EndDate).toLocaleDateString()} ({l.TotalDays}d)
                                        </div>
                                    </div>
                                    <div className="approval-actions">
                                        <button className="approve-btn" onClick={() => handleLeaveAction(l._id, 'approve')}>Approve</button>
                                        <button className="reject-btn" onClick={() => handleLeaveAction(l._id, 'reject')}>Reject</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="card-widget">
                        <h6>Department Attendance</h6>
                        {data.deptComparison.map(d => (
                            <div key={d.department} className="dept-bar-container">
                                <div className="dept-bar-label">
                                    <span>{d.department}</span>
                                    <span>{d.attendanceRate}% ({d.employeeCount} staff)</span>
                                </div>
                                <div className="dept-bar">
                                    <div className="fill" style={{
                                        width: `${d.attendanceRate}%`,
                                        background: d.attendanceRate >= 80 ? '#22c55e' : d.attendanceRate >= 50 ? '#f59e0b' : '#ef4444'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-12">
                    <div className="card-widget">
                        <h6>Employee Directory ({data.employees.length} total - showing top 8)</h6>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table table-sm" style={{ fontSize: 12 }}>
                                <thead>
                                    <tr style={{ color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                                        <th>Name</th>
                                        <th>Department</th>
                                        <th>Job Title</th>
                                        <th>Attendance</th>
                                        <th>Leave Days</th>
                                        <th>Tasks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.employees.slice(0, 8).map(e => (
                                        <tr key={e._id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{e.name}</div>
                                                <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{e.email}</div>
                                            </td>
                                            <td>{e.department}</td>
                                            <td>{e.jobTitle}</td>
                                            <td>
                                                <span style={{
                                                    fontWeight: 600,
                                                    color: parseInt(e.attendanceRatio) >= 20 ? 'var(--green-dark)' : 'var(--orange)'
                                                }}>
                                                    {e.attendanceRatio}
                                                </span>
                                            </td>
                                            <td>{e.leaveDaysThisMonth}d</td>
                                            <td>{e.tasksCompleted}/{e.totalTasks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdminDashboard
