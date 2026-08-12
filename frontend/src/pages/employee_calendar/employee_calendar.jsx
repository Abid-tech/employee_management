import { useState, useEffect } from 'react'
import '../../index.css'
import './employee_calendar.css'
import { MONTH_NAMES, DAY_HEADERS, getCalendarDays, formatDate, isSameDay, EVENT_COLORS } from '../../lib/calendarUtils'

const API = import.meta.env.VITE_API_URL || ''

// Mock data that varies per employee (modules not yet connected)
function getMockLeaves(empName) {
    const m = new Date().getMonth(), y = new Date().getFullYear()
    if (!empName) return []
    const hash = empName.length % 5
    const allLeaves = [
        { _id: 'lv1', title: 'Annual Leave', date: new Date(y, m, 5 + hash), eventType: 'leave' },
        { _id: 'lv2', title: 'Medical Leave', date: new Date(y, m, 19 + hash), eventType: 'leave' },
        { _id: 'lv3', title: 'Casual Leave', date: new Date(y, m, 12 + hash), eventType: 'leave' },
        { _id: 'lv4', title: 'Emergency Leave', date: new Date(y, m, 26), eventType: 'leave' },
    ]
    // Each employee gets 1-2 leaves based on name length
    return allLeaves.slice(hash % 2, hash % 2 + 1 + (hash % 2))
        .map(l => ({ ...l, date: l.date.toISOString(), status: 'Accepted' }))
}
function getMockMeetings(empName) {
    const m = new Date().getMonth(), y = new Date().getFullYear()
    if (!empName) return []
    const hash = empName.length % 4
    const allMeetings = [
        { _id: 'mt1', title: 'Sprint Planning', date: new Date(y, m, 8 + hash) },
        { _id: 'mt2', title: 'Team Standup', date: new Date(y, m, 14 + hash) },
        { _id: 'mt3', title: 'Client Review Call', date: new Date(y, m, 20 + hash) },
        { _id: 'mt4', title: '1-on-1 with Manager', date: new Date(y, m, 11 + hash) },
        { _id: 'mt5', title: 'Design Review', date: new Date(y, m, 17 + hash) },
    ]
    // Each employee gets 2-3 meetings
    return allMeetings.slice(hash, hash + 2 + (hash % 2))
        .map(m => ({ ...m, date: m.date.toISOString(), eventType: 'meeting' }))
}
function getMockDeadlines(empName) {
    const m = new Date().getMonth(), y = new Date().getFullYear()
    if (!empName) return []
    const hash = empName.length % 3
    const allDeadlines = [
        { _id: 'dl1', title: 'Portal v2 Launch', date: new Date(y, m, 28) },
        { _id: 'dl2', title: 'Q3 Report Due', date: new Date(y, m, 25 + hash) },
        { _id: 'dl3', title: 'Code Review Deadline', date: new Date(y, m, 16 + hash) },
    ]
    return allDeadlines.slice(hash, hash + 1)
        .map(d => ({ ...d, date: d.date.toISOString(), eventType: 'deadline' }))
}

function EmployeeCalendar() {
    const [employees, setEmployees] = useState([])
    const [selectedEmp, setSelectedEmp] = useState(null)
    const [holidays, setHolidays] = useState([])
    const [reminders, setReminders] = useState([])
    const [feedback, setFeedback] = useState(null)
    const [calendarDate, setCalendarDate] = useState(new Date())
    const [selectedDay, setSelectedDay] = useState(null)
    const [subscribeUrl, setSubscribeUrl] = useState('')

    // Layers
    const [layers, setLayers] = useState({ holiday: true, leave: true, meeting: true, deadline: true, reminder: true })

    // Reminder form
    const [showReminderForm, setShowReminderForm] = useState(false)
    const [reminderForm, setReminderForm] = useState({ title: '', date: '', note: '', isAlarm: false })
    const [editingReminderId, setEditingReminderId] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)

    useEffect(() => {
        fetchEmployees()
        fetchHolidays()
        fetchSubscribeUrl()
    }, [])

    useEffect(() => {
        if (selectedEmp) fetchReminders(selectedEmp._id)
        else setReminders([])
    }, [selectedEmp])

    useEffect(() => {
        if (feedback) { const t = setTimeout(() => setFeedback(null), 4000); return () => clearTimeout(t) }
    }, [feedback])

    async function fetchEmployees() {
        try {
            const res = await fetch(`${API}/api/employees`)
            const data = await res.json()
            setEmployees(data)
            if (data.length > 0) setSelectedEmp(data[0])
        } catch { console.error('Failed to load employees') }
    }

    async function fetchHolidays() {
        try {
            const res = await fetch(`${API}/api/holidays`)
            setHolidays(await res.json())
        } catch { console.error('Failed to load holidays') }
    }

    async function fetchReminders(empId) {
        try {
            const res = await fetch(`${API}/api/reminders/${empId}`)
            setReminders(await res.json())
        } catch { setReminders([]) }
    }

    async function fetchSubscribeUrl() {
        try {
            const res = await fetch(`${API}/api/calendar/subscribe-link`)
            if (res.ok) {
                const data = await res.json()
                setSubscribeUrl(data.url || '')
            }
        } catch { /* ignore */ }
    }

    function toggleLayer(key) { setLayers(prev => ({ ...prev, [key]: !prev[key] })) }

    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    function prevMonth() { setCalendarDate(new Date(year, month - 1, 1)); setSelectedDay(null) }
    function nextMonth() { setCalendarDate(new Date(year, month + 1, 1)); setSelectedDay(null) }
    function goToday() { setCalendarDate(new Date()); setSelectedDay(null) }

    // Gather events for a day
    function getEventsForDay(dateStr) {
        const events = []
        if (layers.holiday) {
            holidays.forEach(h => { if (isSameDay(h.date, dateStr)) events.push({ ...h, title: h.name, eventType: 'holiday' }) })
        }
        if (selectedEmp) {
            if (layers.leave) {
                getMockLeaves(selectedEmp.name).forEach(l => { if (isSameDay(l.date, dateStr)) events.push(l) })
            }
            if (layers.meeting) {
                getMockMeetings(selectedEmp.name).forEach(m => { if (isSameDay(m.date, dateStr)) events.push(m) })
            }
            if (layers.deadline) {
                getMockDeadlines(selectedEmp.name).forEach(d => { if (isSameDay(d.date, dateStr)) events.push(d) })
            }
            if (layers.reminder) {
                reminders.forEach(r => { if (isSameDay(r.date, dateStr)) events.push({ ...r, eventType: 'reminder' }) })
            }
        }
        return events
    }

    // Reminder CRUD
    function resetReminderForm() {
        setReminderForm({ title: '', date: '', note: '', isAlarm: false })
        setEditingReminderId(null)
    }

    function openReminderForm(dateStr) {
        resetReminderForm()
        if (dateStr) setReminderForm(prev => ({ ...prev, date: dateStr }))
        setShowReminderForm(true)
    }

    function startEditReminder(rem) {
        setReminderForm({
            title: rem.title,
            date: rem.date.slice(0, 10),
            note: rem.note || '',
            isAlarm: rem.isAlarm || false,
        })
        setEditingReminderId(rem._id)
        setShowReminderForm(true)
    }

    async function handleReminderSubmit(e) {
        e.preventDefault()
        if (!selectedEmp) { setFeedback({ type: 'error', message: 'Select an employee first' }); return }
        const body = { ...reminderForm, employeeId: selectedEmp._id }

        try {
            const url = editingReminderId ? `${API}/api/reminders/${editingReminderId}` : `${API}/api/reminders`
            const method = editingReminderId ? 'PUT' : 'POST'
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const data = await res.json()
            if (!res.ok) { setFeedback({ type: 'error', message: data.error || 'Failed' }); return }
            setFeedback({ type: 'success', message: editingReminderId ? 'Reminder updated!' : 'Reminder added!' })
            resetReminderForm(); setShowReminderForm(false); fetchReminders(selectedEmp._id)
        } catch { setFeedback({ type: 'error', message: 'Network error' }) }
    }

    async function confirmDeleteReminder() {
        if (!deleteTarget) return
        try {
            const res = await fetch(`${API}/api/reminders/${deleteTarget._id}`, { method: 'DELETE' })
            if (res.ok) { setFeedback({ type: 'success', message: 'Reminder deleted!' }); fetchReminders(selectedEmp._id) }
            else { setFeedback({ type: 'error', message: 'Delete failed' }) }
        } catch { setFeedback({ type: 'error', message: 'Network error' }) }
        setDeleteTarget(null)
    }

    const days = getCalendarDays(year, month)

    return (
        <>
            <section id="employee-calendar-page">
                <div className="container">
                    <div className="ec-page-header">
                        <div>
                            <h2>My Calendar</h2>
                            <p>Your personalized schedule: holidays, leaves, meetings, deadlines and reminders</p>
                        </div>
                        {/* Employee selector */}
                        <div className="ec-emp-selector">
                            <label>Viewing as:</label>
                            <select className="form-select ec-emp-select"
                                value={selectedEmp?._id || ''} onChange={e => {
                                    const emp = employees.find(x => x._id === e.target.value)
                                    setSelectedEmp(emp || null)
                                    setSelectedDay(null)
                                }}>
                                <option value="">Select employee</option>
                                {employees.map(emp => (
                                    <option key={emp._id} value={emp._id}>{emp.name} - {emp.role}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {feedback && (
                        <div className={`hm-alert ${feedback.type === 'success' ? 'hm-alert-success' : 'hm-alert-error'}`}>
                            {feedback.message}
                        </div>
                    )}

                    {!selectedEmp ? (
                        <div className="hm-card">
                            <div className="empty-state" style={{ padding: '60px 20px' }}>
                                <h5 style={{ color: 'var(--color-navy)', marginBottom: 8 }}>Select an employee above</h5>
                                <p style={{ color: '#999', margin: 0 }}>Choose who you are viewing the calendar as to see their personalized schedule</p>
                            </div>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {/* Sidebar */}
                            <div className="col-md-3">
                                {/* Layers */}
                                <div className="hm-card ec-layers-card">
                                    <div className="hm-card-title">Layers</div>
                                    {Object.entries(EVENT_COLORS).map(([key, val]) => (
                                        <label key={key} className="ac-layer-toggle">
                                            <input type="checkbox" checked={layers[key]} onChange={() => toggleLayer(key)} />
                                            <span className="ac-layer-dot" style={{ background: val.dot }}></span>
                                            <span className="ac-layer-label">{val.label}s</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Subscribe to Google Calendar */}
                                {subscribeUrl && (
                                    <div className="hm-card ec-subscribe-card">
                                        <a href={subscribeUrl} target="_blank" rel="noopener noreferrer"
                                            className="hm-btn-primary ec-subscribe-btn">
                                            Subscribe to Company Calendar
                                        </a>
                                        <p className="ec-subscribe-help">
                                            This adds company holidays to your personal Google Calendar automatically going forward
                                        </p>
                                    </div>
                                )}

                                {/* Add reminder */}
                                <button className="hm-btn-primary ac-add-btn" onClick={() => openReminderForm('')}>
                                    + Add Reminder
                                </button>

                                {showReminderForm && (
                                    <div className="hm-card ac-form-card">
                                        <div className="hm-card-title">
                                            {editingReminderId ? 'Edit Reminder' : 'New Reminder'}
                                        </div>
                                        <form className="hm-form" onSubmit={handleReminderSubmit}>
                                            <div className="mb-3">
                                                <label className="form-label">Title *</label>
                                                <input type="text" className="form-control" placeholder="e.g. Submit report"
                                                    value={reminderForm.title} onChange={e => setReminderForm(p => ({ ...p, title: e.target.value }))} required />
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">Date *</label>
                                                <input type="date" className="form-control"
                                                    value={reminderForm.date} onChange={e => setReminderForm(p => ({ ...p, date: e.target.value }))} required />
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">Note</label>
                                                <textarea className="form-control" rows="2" placeholder="Optional note..."
                                                    value={reminderForm.note} onChange={e => setReminderForm(p => ({ ...p, note: e.target.value }))} />
                                            </div>
                                            <div className="mb-3">
                                                <label className="ec-alarm-toggle">
                                                    <input type="checkbox" checked={reminderForm.isAlarm}
                                                        onChange={e => setReminderForm(p => ({ ...p, isAlarm: e.target.checked }))} />
                                                    <span>Set as alarm</span>
                                                </label>
                                            </div>
                                            <div className="d-flex gap-2">
                                                <button type="submit" className="hm-btn-primary">{editingReminderId ? 'Update' : 'Add'}</button>
                                                <button type="button" className="hm-btn-secondary" onClick={() => { resetReminderForm(); setShowReminderForm(false) }}>Cancel</button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* My reminders list */}
                                <div className="hm-card">
                                    <div className="hm-card-title">My Reminders ({reminders.length})</div>
                                    {reminders.length === 0 ? (
                                        <div className="empty-state">No reminders yet</div>
                                    ) : (
                                        reminders.map(r => (
                                            <div key={r._id} className="ec-reminder-item">
                                                <div className="ec-reminder-info">
                                                    <div className="ec-reminder-title">
                                                        {r.isAlarm && '[Alarm] '}{r.title}
                                                    </div>
                                                    <div className="ec-reminder-date">{formatDate(r.date)}</div>
                                                    {r.note && <div className="ec-reminder-note">{r.note}</div>}
                                                </div>
                                                <div className="holiday-list-actions">
                                                    <button className="btn-edit" onClick={() => startEditReminder(r)}>Edit</button>
                                                    <button className="btn-delete" onClick={() => setDeleteTarget(r)}>Delete</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Calendar */}
                            <div className="col-md-9">
                                <div className="calendar-wrapper ac-calendar">
                                    <div className="calendar-header">
                                        <button className="calendar-nav-btn" onClick={prevMonth}>&#8249;</button>
                                        <div className="ac-header-center">
                                            <h5>{MONTH_NAMES[month]} {year}</h5>
                                            <button className="ac-today-btn" onClick={goToday}>Today</button>
                                        </div>
                                        <button className="calendar-nav-btn" onClick={nextMonth}>&#8250;</button>
                                    </div>

                                    <div className="calendar-grid">
                                        {DAY_HEADERS.map(d => (
                                            <div key={d} className="calendar-day-header">{d}</div>
                                        ))}
                                        {days.map((info, i) => {
                                            if (info.day === null) return <div key={`e-${i}`} className="calendar-day empty"></div>

                                            const events = getEventsForDay(info.dateStr)
                                            const hasEvents = events.length > 0

                                            let classes = 'calendar-day ac-day'
                                            if (info.isToday) classes += ' today'
                                            if (hasEvents) classes += ' has-events'

                                            return (
                                                <div key={`d-${info.day}`} className={classes}
                                                    onClick={() => setSelectedDay(hasEvents ? { ...info, events } : null)}>
                                                    <span className="ac-day-num">{info.day}</span>
                                                    {hasEvents && (
                                                        <div className="ac-day-dots">
                                                            {[...new Set(events.map(e => e.eventType))].map(type => (
                                                                <span key={type} className="ac-dot" style={{ background: EVENT_COLORS[type]?.dot }}></span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {hasEvents && events.length <= 2 && (
                                                        <div className="ac-day-labels">
                                                            {events.slice(0, 2).map((ev, idx) => (
                                                                <div key={idx} className="ac-day-label" style={{
                                                                    background: EVENT_COLORS[ev.eventType]?.bg,
                                                                    color: EVENT_COLORS[ev.eventType]?.text,
                                                                }}>
                                                                    {(ev.name || ev.title || '').slice(0, 12)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Day detail */}
                                    {selectedDay && selectedDay.events && (
                                        <div className="calendar-detail ac-detail">
                                            <div className="ac-detail-header">
                                                <div className="calendar-detail-date">{formatDate(selectedDay.dateStr)}</div>
                                                <button className="ac-detail-close" onClick={() => setSelectedDay(null)}>x</button>
                                            </div>
                                            {selectedDay.events.map((ev, idx) => (
                                                <div key={idx} className="ac-detail-item" style={{
                                                    borderLeft: `3px solid ${EVENT_COLORS[ev.eventType]?.dot}`,
                                                }}>
                                                    <div className="ac-detail-name">
                                                        {ev.eventType === 'reminder' && ev.isAlarm && '[Alarm] '}
                                                        {ev.name || ev.title}
                                                    </div>
                                                    <span className="ac-detail-type" style={{
                                                        background: EVENT_COLORS[ev.eventType]?.bg,
                                                        color: EVENT_COLORS[ev.eventType]?.text,
                                                    }}>
                                                        {EVENT_COLORS[ev.eventType]?.label}
                                                    </span>
                                                    {ev.note && <div className="ec-detail-note">{ev.note}</div>}
                                                    {ev.eventType === 'reminder' && (
                                                        <div className="ac-detail-actions">
                                                            <button className="btn-edit" onClick={() => startEditReminder(ev)}>Edit</button>
                                                            <button className="btn-delete" onClick={() => setDeleteTarget(ev)}>Delete</button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Delete confirm */}
            {deleteTarget && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <h5>Delete Reminder?</h5>
                        <p>Remove "<strong>{deleteTarget.title}</strong>"?</p>
                        <div className="confirm-actions">
                            <button className="hm-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                            <button className="hm-btn-primary" onClick={confirmDeleteReminder}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default EmployeeCalendar
