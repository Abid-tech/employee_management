import { useState, useEffect } from 'react'
import '../../index.css'
import './admin_calendar.css'
import { MONTH_NAMES, DAY_HEADERS, getCalendarDays, formatDate, isSameDay, HOLIDAY_TYPE_COLORS, EVENT_COLORS } from '../../lib/calendarUtils'

const API = import.meta.env.VITE_API_URL || ''

// --- Mock data for layers that aren't built yet ---
const MOCK_LEAVES = [
    { _id: 'ml1', title: 'Golam Rabbani Shanto - Annual Leave', date: new Date(new Date().getFullYear(), new Date().getMonth(), 18), type: 'leave' },
    { _id: 'ml2', title: 'Rima Sultana - Medical Leave', date: new Date(new Date().getFullYear(), new Date().getMonth(), 22), type: 'leave' },
]
const MOCK_MEETINGS = [
    { _id: 'mm1', title: 'Sprint Planning', date: new Date(new Date().getFullYear(), new Date().getMonth(), 10), type: 'meeting' },
    { _id: 'mm2', title: 'Client Review Call', date: new Date(new Date().getFullYear(), new Date().getMonth(), 15), type: 'meeting' },
    { _id: 'mm3', title: 'Team Standup', date: new Date(new Date().getFullYear(), new Date().getMonth(), 25), type: 'meeting' },
]
const MOCK_DEADLINES = [
    { _id: 'md1', title: 'Portal v2 Launch', date: new Date(new Date().getFullYear(), new Date().getMonth(), 28), type: 'deadline' },
    { _id: 'md2', title: 'Q3 Report Due', date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5), type: 'deadline' },
]

function AdminCalendar() {
    const [holidays, setHolidays] = useState([])
    const [feedback, setFeedback] = useState(null)
    const [calendarDate, setCalendarDate] = useState(new Date())
    const [selectedDay, setSelectedDay] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)

    // Layer toggles
    const [layers, setLayers] = useState({ holiday: true, leave: true, meeting: true, deadline: true })

    // Holiday form
    const [holidayForm, setHolidayForm] = useState({ name: '', date: '', type: '', description: '' })
    const [editingId, setEditingId] = useState(null)
    const [showForm, setShowForm] = useState(false)

    useEffect(() => { fetchHolidays() }, [])
    useEffect(() => {
        if (feedback) { const t = setTimeout(() => setFeedback(null), 4000); return () => clearTimeout(t) }
    }, [feedback])

    async function fetchHolidays() {
        try {
            const res = await fetch(`${API}/api/holidays`)
            setHolidays(await res.json())
        } catch { setFeedback({ type: 'error', message: 'Failed to load holidays' }) }
    }

    function toggleLayer(key) {
        setLayers(prev => ({ ...prev, [key]: !prev[key] }))
    }

    // Calendar navigation
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    function prevMonth() { setCalendarDate(new Date(year, month - 1, 1)); setSelectedDay(null) }
    function nextMonth() { setCalendarDate(new Date(year, month + 1, 1)); setSelectedDay(null) }
    function goToday() { setCalendarDate(new Date()); setSelectedDay(null) }

    // Collect all events for a specific day
    function getEventsForDay(dateStr) {
        const events = []
        if (layers.holiday) {
            holidays.forEach(h => { if (isSameDay(h.date, dateStr)) events.push({ ...h, eventType: 'holiday' }) })
        }
        if (layers.leave) {
            MOCK_LEAVES.forEach(l => { if (isSameDay(l.date, dateStr)) events.push({ ...l, eventType: 'leave' }) })
        }
        if (layers.meeting) {
            MOCK_MEETINGS.forEach(m => { if (isSameDay(m.date, dateStr)) events.push({ ...m, eventType: 'meeting' }) })
        }
        if (layers.deadline) {
            MOCK_DEADLINES.forEach(d => { if (isSameDay(d.date, dateStr)) events.push({ ...d, eventType: 'deadline' }) })
        }
        return events
    }

    // Holiday CRUD
    function resetForm() { setHolidayForm({ name: '', date: '', type: '', description: '' }); setEditingId(null) }

    function openCreateForm(dateStr) {
        resetForm()
        if (dateStr) setHolidayForm(prev => ({ ...prev, date: dateStr }))
        setShowForm(true)
    }

    function startEdit(holiday) {
        setHolidayForm({
            name: holiday.name,
            date: holiday.date.slice(0, 10),
            type: holiday.type,
            description: holiday.description || '',
        })
        setEditingId(holiday._id)
        setShowForm(true)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        const body = { name: holidayForm.name, date: holidayForm.date, type: holidayForm.type, description: holidayForm.description }
        try {
            const url = editingId ? `${API}/api/holidays/${editingId}` : `${API}/api/holidays`
            const method = editingId ? 'PUT' : 'POST'
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            const data = await res.json()
            if (!res.ok) { setFeedback({ type: 'error', message: data.error || 'Failed' }); return }
            setFeedback({ type: 'success', message: editingId ? 'Holiday updated & synced to Google Calendar!' : 'Holiday added & synced to Google Calendar!' })
            resetForm(); setShowForm(false); fetchHolidays()
        } catch { setFeedback({ type: 'error', message: 'Network error' }) }
    }

    async function confirmDelete() {
        if (!deleteTarget) return
        try {
            const res = await fetch(`${API}/api/holidays/${deleteTarget._id}`, { method: 'DELETE' })
            if (res.ok) { setFeedback({ type: 'success', message: 'Holiday deleted & removed from Google Calendar!' }); fetchHolidays() }
            else { setFeedback({ type: 'error', message: 'Delete failed' }) }
        } catch { setFeedback({ type: 'error', message: 'Network error' }) }
        setDeleteTarget(null)
    }

    // Upcoming holidays
    function getUpcomingHolidays() {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        return holidays.filter(h => new Date(h.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 8)
    }

    const days = getCalendarDays(year, month)

    return (
        <>
            <section id="admin-calendar-page">
                <div className="container">
                    <div className="ac-page-title">
                        <h2>Admin Calendar</h2>
                        <p>Manage company holidays and view the organization calendar</p>
                    </div>

                    {feedback && (
                        <div className={`hm-alert ${feedback.type === 'success' ? 'hm-alert-success' : 'hm-alert-error'}`}>
                            {feedback.message}
                        </div>
                    )}

                    <div className="row g-4">
                        {/* Left sidebar */}
                        <div className="col-md-4">
                            {/* Layer toggles */}
                            <div className="hm-card ac-layers-card">
                                <div className="hm-card-title">Calendar Layers</div>
                                <div className="ac-layers">
                                    {Object.entries(EVENT_COLORS).filter(([k]) => k !== 'reminder').map(([key, val]) => (
                                        <label key={key} className="ac-layer-toggle">
                                            <input type="checkbox" checked={layers[key]} onChange={() => toggleLayer(key)} />
                                            <span className="ac-layer-dot" style={{ background: val.dot }}></span>
                                            <span className="ac-layer-label">{val.label}s</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Add holiday button */}
                            <button className="hm-btn-primary ac-add-btn" onClick={() => openCreateForm('')}>
                                + Add Holiday
                            </button>

                            {/* Holiday form (slide down) */}
                            {showForm && (
                                <div className="hm-card ac-form-card">
                                    <div className="hm-card-title">
                                        {editingId ? 'Edit Holiday' : 'New Holiday'}
                                    </div>
                                    <form className="hm-form" onSubmit={handleSubmit}>
                                        <div className="mb-3">
                                            <label className="form-label">Holiday Name *</label>
                                            <input type="text" className="form-control" placeholder="e.g. Independence Day"
                                                value={holidayForm.name} onChange={e => setHolidayForm(p => ({ ...p, name: e.target.value }))} required minLength={2} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Date *</label>
                                            <input type="date" className="form-control"
                                                value={holidayForm.date} onChange={e => setHolidayForm(p => ({ ...p, date: e.target.value }))} required />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Type *</label>
                                            <select className="form-select" value={holidayForm.type}
                                                onChange={e => setHolidayForm(p => ({ ...p, type: e.target.value }))} required>
                                                <option value="">Select type</option>
                                                <option value="National">National</option>
                                                <option value="Religious">Religious</option>
                                                <option value="Company">Company</option>
                                            </select>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Description</label>
                                            <textarea className="form-control" rows="2" placeholder="Optional description..."
                                                value={holidayForm.description} onChange={e => setHolidayForm(p => ({ ...p, description: e.target.value }))} />
                                        </div>
                                        <div className="d-flex gap-2">
                                            <button type="submit" className="hm-btn-primary">{editingId ? 'Update' : 'Add'}</button>
                                            <button type="button" className="hm-btn-secondary" onClick={() => { resetForm(); setShowForm(false) }}>Cancel</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Upcoming holidays */}
                            <div className="hm-card ac-upcoming-card">
                                <div className="hm-card-title">Upcoming Holidays</div>
                                {getUpcomingHolidays().length === 0 ? (
                                    <div className="empty-state">No upcoming holidays</div>
                                ) : (
                                    getUpcomingHolidays().map(h => {
                                        const d = new Date(h.date)
                                        const monthShort = d.toLocaleDateString('en-US', { month: 'short' })
                                        return (
                                            <div key={h._id} className="upcoming-holiday-item" onClick={() => {
                                                setCalendarDate(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(null)
                                            }} style={{ cursor: 'pointer' }}>
                                                <div className="upcoming-date-box">
                                                    <div className="day">{d.getDate()}</div>
                                                    <div className="month">{monthShort}</div>
                                                </div>
                                                <div className="holiday-list-info">
                                                    <div className="holiday-list-name">
                                                        {h.name}
                                                        <span className={`holiday-type-badge ${h.type.toLowerCase()}`}>{h.type}</span>
                                                    </div>
                                                </div>
                                                <div className="holiday-list-actions">
                                                    <button className="btn-edit" onClick={e => { e.stopPropagation(); startEdit(h) }}>Edit</button>
                                                    <button className="btn-delete" onClick={e => { e.stopPropagation(); setDeleteTarget(h) }}>Delete</button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Calendar grid */}
                        <div className="col-md-8">
                            <div className="calendar-wrapper ac-calendar">
                                <div className="calendar-header">
                                    <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
                                    <div className="ac-header-center">
                                        <h5>{MONTH_NAMES[month]} {year}</h5>
                                        <button className="ac-today-btn" onClick={goToday}>Today</button>
                                    </div>
                                    <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
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

                                {/* Day detail panel */}
                                {selectedDay && selectedDay.events && (
                                    <div className="calendar-detail ac-detail">
                                        <div className="ac-detail-header">
                                            <div className="calendar-detail-date">{formatDate(selectedDay.dateStr)}</div>
                                            <button className="ac-detail-close" onClick={() => setSelectedDay(null)}>✕</button>
                                        </div>
                                        {selectedDay.events.map((ev, idx) => (
                                            <div key={idx} className="ac-detail-item" style={{
                                                borderLeft: `3px solid ${EVENT_COLORS[ev.eventType]?.dot}`,
                                            }}>
                                                <div className="ac-detail-name">{ev.name || ev.title}</div>
                                                <span className="ac-detail-type" style={{
                                                    background: EVENT_COLORS[ev.eventType]?.bg,
                                                    color: EVENT_COLORS[ev.eventType]?.text,
                                                }}>
                                                    {EVENT_COLORS[ev.eventType]?.label}
                                                    {ev.type && ev.eventType === 'holiday' ? ` · ${ev.type}` : ''}
                                                </span>
                                                {ev.eventType === 'holiday' && (
                                                    <div className="ac-detail-actions">
                                                        <button className="btn-edit" onClick={() => startEdit(ev)}>Edit</button>
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
                </div>
            </section>

            {/* Delete confirm overlay */}
            {deleteTarget && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <h5>Delete Holiday?</h5>
                        <p>Remove "<strong>{deleteTarget.name}</strong>"? This will also remove it from Google Calendar.</p>
                        <div className="confirm-actions">
                            <button className="hm-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                            <button className="hm-btn-primary" onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default AdminCalendar
