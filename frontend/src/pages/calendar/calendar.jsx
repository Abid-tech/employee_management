import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_BASE } from '../../lib/api_base'
import './calendar.css'

// The five shared sources plus the private one. Colours are set in the
// stylesheet against these keys, so a new source needs one entry here and one
// rule there rather than a change in the grid code.
const SOURCES = {
    holiday: 'Holiday',
    leave: 'On leave',
    meeting: 'Meeting',
    booking: 'Room booked',
    deadline: 'Deadline',
    reminder: 'My reminder'
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

const todayKey = () => {
    const now = new Date()
    return keyOf(now.getFullYear(), now.getMonth(), now.getDate())
}

const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options
    })

    let data = null

    try {
        data = await response.json()
    } catch {
        data = null
    }

    if (!response.ok) {
        throw new Error((data && data.message) || 'The calendar could not be loaded.')
    }

    return data
}

function Calendar() {
    const now = new Date()

    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth())

    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [selected, setSelected] = useState(todayKey())
    const [hidden, setHidden] = useState([])

    const [reminderTitle, setReminderTitle] = useState('')
    const [reminderNote, setReminderNote] = useState('')
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)

    // The grid always shows whole weeks, so it reaches back into the previous
    // month and forward into the next. Events are fetched for the range on
    // screen rather than the calendar month, or those edge days would be blank
    // while still being visible.
    const grid = useMemo(() => {
        const first = new Date(year, month, 1)
        const start = new Date(first)
        start.setDate(1 - first.getDay())

        const cells = []

        for (let i = 0; i < 42; i++) {
            const d = new Date(start)
            d.setDate(start.getDate() + i)

            cells.push({
                key: keyOf(d.getFullYear(), d.getMonth(), d.getDate()),
                day: d.getDate(),
                inMonth: d.getMonth() === month,
                weekend: d.getDay() === 0 || d.getDay() === 6
            })
        }

        return cells
    }, [year, month])

    const load = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const data = await request(
                `/api/calendar/events?from=${grid[0].key}&to=${grid[41].key}`
            )
            setEvents(data.events || [])
        } catch (err) {
            setError(err.message)
            setEvents([])
        } finally {
            setLoading(false)
        }
    }, [grid])

    useEffect(() => { load() }, [load])

    const byDate = useMemo(() => {
        const map = new Map()

        for (const event of events) {
            if (hidden.includes(event.source)) continue
            if (!map.has(event.date)) map.set(event.date, [])
            map.get(event.date).push(event)
        }

        return map
    }, [events, hidden])

    const selectedEvents = byDate.get(selected) || []

    const step = (by) => {
        const d = new Date(year, month + by, 1)
        setYear(d.getFullYear())
        setMonth(d.getMonth())
    }

    const toggleSource = (source) => {
        setHidden((prev) =>
            prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
        )
    }

    const addReminder = async (e) => {
        e.preventDefault()

        if (!reminderTitle.trim()) return

        setSaving(true)
        setError('')

        try {
            await request('/api/calendar/reminders', {
                method: 'POST',
                body: JSON.stringify({
                    title: reminderTitle,
                    date: selected,
                    note: reminderNote
                })
            })

            setReminderTitle('')
            setReminderNote('')
            await load()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const removeReminder = async (id) => {
        setError('')

        try {
            await request(`/api/calendar/reminders/${id}`, { method: 'DELETE' })
            await load()
        } catch (err) {
            setError(err.message)
        }
    }

    // An absolute URL, because this is pasted into a calendar application that
    // has no idea what origin the page was served from.
    const feedUrl = `${window.location.origin}/api/calendar/holidays.ics`

    const copyFeed = async () => {
        try {
            await navigator.clipboard.writeText(feedUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            setCopied(false)
        }
    }

    const readableDate = (key) => {
        const [y, m, d] = key.split('-').map(Number)
        return `${d} ${MONTHS[m - 1]} ${y}`
    }

    return (
        <div className="cal">
            <div className="cal-head">
                <div>
                    <p className="cal-eyebrow">Company calendar</p>
                    <h1 className="cal-title">{MONTHS[month]} {year}</h1>
                    <p className="cal-sub">
                        Holidays, approved leave, meetings, room bookings and task deadlines,
                        drawn from the modules that own them.
                    </p>
                </div>

                <div className="cal-nav">
                    <button type="button" onClick={() => step(-1)} aria-label="Previous month">‹</button>
                    <button
                        type="button"
                        className="cal-today"
                        onClick={() => {
                            const d = new Date()
                            setYear(d.getFullYear())
                            setMonth(d.getMonth())
                            setSelected(todayKey())
                        }}
                    >
                        Today
                    </button>
                    <button type="button" onClick={() => step(1)} aria-label="Next month">›</button>
                </div>
            </div>

            <div className="cal-legend">
                {Object.entries(SOURCES).map(([source, label]) => (
                    <button
                        key={source}
                        type="button"
                        className={`cal-chip ${hidden.includes(source) ? 'is-off' : ''}`}
                        data-source={source}
                        onClick={() => toggleSource(source)}
                        aria-pressed={!hidden.includes(source)}
                    >
                        <span className="cal-dot" data-source={source} />
                        {label}
                    </button>
                ))}
            </div>

            {error && <div className="cal-error">{error}</div>}

            <div className="cal-body">
                <div className="cal-grid-wrap">
                    <div className="cal-weekdays">
                        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
                    </div>

                    <div className="cal-grid">
                        {grid.map((cell) => {
                            const dayEvents = byDate.get(cell.key) || []
                            const isToday = cell.key === todayKey()

                            return (
                                <button
                                    key={cell.key}
                                    type="button"
                                    className={[
                                        'cal-cell',
                                        cell.inMonth ? '' : 'is-outside',
                                        cell.weekend ? 'is-weekend' : '',
                                        selected === cell.key ? 'is-selected' : '',
                                        isToday ? 'is-today' : ''
                                    ].join(' ').trim()}
                                    onClick={() => setSelected(cell.key)}
                                >
                                    <span className="cal-daynum">{cell.day}</span>

                                    <span className="cal-marks">
                                        {[...new Set(dayEvents.map((e) => e.source))]
                                            .slice(0, 4)
                                            .map((source) => (
                                                <span key={source} className="cal-dot" data-source={source} />
                                            ))}
                                    </span>

                                    {dayEvents.length > 0 && (
                                        <span className="cal-count">{dayEvents.length}</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {loading && <p className="cal-loading">Loading the month…</p>}
                </div>

                <aside className="cal-side">
                    <div className="cal-panel">
                        <h2>{readableDate(selected)}</h2>

                        {selectedEvents.length === 0 ? (
                            <p className="cal-empty">Nothing scheduled on this day.</p>
                        ) : (
                            <ul className="cal-list">
                                {selectedEvents.map((event) => (
                                    <li key={`${event.source}-${event.id}`} data-source={event.source}>
                                        <div className="cal-list-top">
                                            <span className="cal-dot" data-source={event.source} />
                                            <strong>{event.title}</strong>
                                        </div>
                                        <p>{event.detail}</p>

                                        {event.source === 'reminder' && (
                                            <button
                                                type="button"
                                                className="cal-remove"
                                                onClick={() => removeReminder(event.id)}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <form className="cal-panel" onSubmit={addReminder}>
                        <h2>Add a reminder</h2>
                        <p className="cal-hint">Only you can see your reminders.</p>

                        <label>
                            Title
                            <input
                                value={reminderTitle}
                                onChange={(e) => setReminderTitle(e.target.value)}
                                placeholder="Send the quarterly report"
                                maxLength={120}
                            />
                        </label>

                        <label>
                            Note
                            <textarea
                                value={reminderNote}
                                onChange={(e) => setReminderNote(e.target.value)}
                                rows={2}
                                maxLength={500}
                            />
                        </label>

                        <button type="submit" className="cal-primary" disabled={saving || !reminderTitle.trim()}>
                            {saving ? 'Saving…' : `Add to ${readableDate(selected)}`}
                        </button>
                    </form>

                    <div className="cal-panel">
                        <h2>Subscribe in your own calendar</h2>
                        <p className="cal-hint">
                            Add this address in Google Calendar under “Other calendars → From URL”,
                            or in Outlook and Apple Calendar as a subscription. Company holidays
                            appear there and stay up to date on their own.
                        </p>

                        <code className="cal-url">{feedUrl}</code>

                        <button type="button" className="cal-secondary" onClick={copyFeed}>
                            {copied ? 'Copied' : 'Copy address'}
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    )
}

export default Calendar
