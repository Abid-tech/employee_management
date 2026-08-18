import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'

function CalendarPage({ user }) {
    const [view, setView] = useState('both') // personal | company | both
    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState([])
    const [reminders, setReminders] = useState([])
    const [selectedDay, setSelectedDay] = useState(null)
    const [showReminderForm, setShowReminderForm] = useState(false)
    const [reminderForm, setReminderForm] = useState({ title: '', date: '', time: '', note: '', isAlarm: false })
    const [subscribeUrl, setSubscribeUrl] = useState('')
    const alarmTimers = useRef([])

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    useEffect(() => {
        const start = new Date(year, month, 1).toISOString()
        const end = new Date(year, month + 1, 0).toISOString()
        api.getCalendarEvents(start, end).then(setEvents).catch(() => {})
        api.getReminders().then(setReminders).catch(() => {})
        api.getSubscribeUrl().then(data => setSubscribeUrl(data.url || '')).catch(() => {})
    }, [year, month])

    useEffect(() => {
        alarmTimers.current.forEach(t => clearTimeout(t))
        alarmTimers.current = []

        const now = Date.now()
        reminders.filter(r => r.isAlarm && r.time).forEach(r => {
            const [hh, mm] = r.time.split(':').map(Number)
            const alarmDate = new Date(r.date)
            alarmDate.setHours(hh, mm, 0, 0)
            const diff = alarmDate.getTime() - now
            if (diff > 0 && diff < 86400000) {
                const timer = setTimeout(() => {
                    if (typeof window !== 'undefined') {
                        try {
                            const ctx = new (window.AudioContext || window.webkitAudioContext)()
                            const osc = ctx.createOscillator()
                            const gain = ctx.createGain()
                            osc.connect(gain)
                            gain.connect(ctx.destination)
                            osc.frequency.value = 800
                            gain.gain.value = 0.3
                            osc.start()
                            setTimeout(() => { osc.stop(); ctx.close() }, 500)
                        } catch {}
                        alert(`Reminder: ${r.title}`)
                    }
                }, diff)
                alarmTimers.current.push(timer)
            }
        })

        return () => alarmTimers.current.forEach(t => clearTimeout(t))
    }, [reminders])

    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const calendarDays = []
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        calendarDays.push({ day: daysInPrevMonth - i, isOther: true, date: new Date(year, month - 1, daysInPrevMonth - i) })
    }
    for (let d = 1; d <= daysInMonth; d++) {
        calendarDays.push({ day: d, isOther: false, date: new Date(year, month, d) })
    }
    const remaining = 42 - calendarDays.length
    for (let d = 1; d <= remaining; d++) {
        calendarDays.push({ day: d, isOther: true, date: new Date(year, month + 1, d) })
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const getEventsForDay = (date) => {
        const dateStr = date.toISOString().split('T')[0]
        let filtered = []

        if (view === 'company' || view === 'both') {
            filtered.push(...events.filter(e => {
                const evtDate = new Date(e.date).toISOString().split('T')[0]
                if (e.category === 'leave' && e.endDate) {
                    return dateStr >= new Date(e.date).toISOString().split('T')[0] && dateStr <= new Date(e.endDate).toISOString().split('T')[0]
                }
                return evtDate === dateStr
            }))
        }

        if (view === 'personal' || view === 'both') {
            filtered.push(...reminders.filter(r => new Date(r.date).toISOString().split('T')[0] === dateStr).map(r => ({
                ...r, category: 'reminder',
            })))
        }

        return filtered
    }

    const handleAddReminder = async (e) => {
        e.preventDefault()
        try {
            const created = await api.createReminder(reminderForm)
            setReminders([...reminders, created])
            setShowReminderForm(false)
            setReminderForm({ title: '', date: '', time: '', note: '', isAlarm: false })
        } catch (err) {
            alert(err.message)
        }
    }

    const handleDeleteReminder = async (id) => {
        await api.deleteReminder(id).catch(() => {})
        setReminders(reminders.filter(r => r._id !== id))
    }

    const dayClicked = (calDay) => {
        const dateStr = calDay.date.toISOString().split('T')[0]
        setSelectedDay(dateStr)
        setReminderForm(f => ({ ...f, date: dateStr }))
    }

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

    const selectedEvents = selectedDay ? getEventsForDay(new Date(selectedDay)) : []

    return (
        <div className="calendar-page">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h4 style={{ fontWeight: 700, color: 'var(--blue-color)', fontSize: 20 }}>
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h4>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <div className="calendar-toggle">
                        {['personal', 'company', 'both'].map(v => (
                            <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button className="btn-secondary-custom" onClick={prevMonth}>&lt;</button>
                    <button className="btn-secondary-custom" onClick={nextMonth}>&gt;</button>
                </div>
            </div>

            <div className="row g-3">
                <div className="col-md-8">
                    <div className="calendar-grid">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="calendar-header-cell">{d}</div>
                        ))}
                        {calendarDays.map((cd, i) => {
                            const dateStr = cd.date.toISOString().split('T')[0]
                            const dayEvents = getEventsForDay(cd.date)
                            const isToday = dateStr === todayStr
                            const isSelected = dateStr === selectedDay

                            return (
                                <div
                                    key={i}
                                    className={`calendar-day ${cd.isOther ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                                    style={isSelected ? { boxShadow: 'inset 0 0 0 2px var(--blue-color)' } : {}}
                                    onClick={() => dayClicked(cd)}
                                >
                                    <div className={`day-number ${isToday ? 'today' : ''}`}>{cd.day}</div>
                                    <div style={{ marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {dayEvents.slice(0, 5).map((ev, j) => (
                                             <span key={j} className={`calendar-event-dot ${ev.category}`}></span>
                                        ))}
                                        {dayEvents.length > 5 && <span style={{ fontSize: 8, color: 'var(--gray-400)' }}>+{dayEvents.length - 5}</span>}
                                    </div>
                                    {dayEvents.length > 0 && (
                                        <div className={`calendar-event-label ${dayEvents[0].category}`}>
                                            {dayEvents[0].title}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card-widget mb-3">
                        <h6>{selectedDay ? new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Select a day'}</h6>
                        {selectedDay ? (
                            selectedEvents.length === 0 ? (
                                <div className="empty-state">No events on this day</div>
                            ) : (
                                selectedEvents.map((ev, i) => {
                                    const evDate = new Date(ev.date || selectedDay)
                                    const ymd = evDate.toISOString().split('T')[0].replace(/-/g, '')
                                    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${ymd}/${ymd}&details=${encodeURIComponent(ev.description || ev.note || ev.leaveType || '')}`

                                    return (
                                        <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <span className={`calendar-event-dot ${ev.category}`} style={{ display: 'inline-block', marginRight: 6 }}></span>
                                                    <strong>{ev.title}</strong>
                                                </div>
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                    <a
                                                        href={gcalUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Push to Google Calendar"
                                                        style={{ border: 'none', background: 'none', color: '#4285f4', cursor: 'pointer', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}
                                                    >[GCal]</a>
                                                    {ev.category === 'reminder' && (
                                                        <button
                                                            style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}
                                                            onClick={() => handleDeleteReminder(ev._id)}
                                                        >✕</button>
                                                    )}
                                                </div>
                                            </div>
                                            {ev.startTime && <div style={{ color: 'var(--gray-500)', marginLeft: 14 }}>{ev.startTime} - {ev.endTime}</div>}
                                            {ev.time && <div style={{ color: 'var(--gray-500)', marginLeft: 14 }}>Time: {ev.time}</div>}
                                            {ev.note && <div style={{ color: 'var(--gray-500)', marginLeft: 14 }}>{ev.note}</div>}
                                        </div>
                                    )
                                })
                            )
                        ) : (
                            <div className="empty-state">Click a day to see events</div>
                        )}
                    </div>

                    {(view === 'personal' || view === 'both') && (
                        <div className="card-widget">
                            <h6>Add Personal Reminder</h6>
                            {showReminderForm ? (
                                <form onSubmit={handleAddReminder}>
                                    <div className="form-group-custom">
                                        <label>Title</label>
                                        <input required value={reminderForm.title} onChange={e => setReminderForm(f => ({ ...f, title: e.target.value }))} />
                                    </div>
                                    <div className="form-group-custom">
                                        <label>Date</label>
                                        <input type="date" required value={reminderForm.date} onChange={e => setReminderForm(f => ({ ...f, date: e.target.value }))} />
                                    </div>
                                    <div className="form-group-custom">
                                        <label>Time (for alarm)</label>
                                        <input type="time" value={reminderForm.time} onChange={e => setReminderForm(f => ({ ...f, time: e.target.value }))} />
                                    </div>
                                    <div className="form-group-custom">
                                        <label>Note</label>
                                        <textarea rows="2" value={reminderForm.note} onChange={e => setReminderForm(f => ({ ...f, note: e.target.value }))}></textarea>
                                    </div>
                                    <div className="form-group-custom">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <input type="checkbox" checked={reminderForm.isAlarm} onChange={e => setReminderForm(f => ({ ...f, isAlarm: e.target.checked }))} />
                                            Enable alarm (bell + sound)
                                        </label>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button type="submit" className="btn-primary-custom">Save</button>
                                        <button type="button" className="btn-secondary-custom" onClick={() => setShowReminderForm(false)}>Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <button className="btn-primary-custom w-100" onClick={() => setShowReminderForm(true)}>
                                    + New Reminder
                                </button>
                            )}
                        </div>
                    )}

                    {subscribeUrl && (
                        <div className="card-widget mt-3">
                            <h6>Subscribe</h6>
                            <a
                                href={subscribeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary-custom d-block text-center"
                                style={{ textDecoration: 'none' }}
                            >
                                Subscribe to Company Calendar
                            </a>
                            <p className="text-muted-custom mt-2 mb-0" style={{ fontSize: 11 }}>
                                Adds company holidays to your personal Google Calendar automatically.
                            </p>
                        </div>
                    )}

                    <div className="card-widget mt-3">
                        <h6>Legend</h6>
                        <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {[
                                ['holiday', 'Holiday'],
                                ['meeting', 'Meeting/Booking'],
                                ['leave', 'Leave'],
                                ['deadline', 'Task Deadline'],
                                ['reminder', 'Personal Reminder'],
                            ].map(([cls, label]) => (
                                <div key={cls}><span className={`calendar-event-dot ${cls}`}></span> {label}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CalendarPage
