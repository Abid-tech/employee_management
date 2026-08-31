import { useEffect, useMemo, useState } from 'react'
import { API_BASE } from '../../lib/api_base'
import './attendance_insights.css'

// Both charts read the same clock-in records as the attendance page.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Five buckets, thresholds set around a normal working day.
const level = (hours, present) => {
    if (!present) return 0
    if (hours < 2) return 1
    if (hours < 5) return 2
    if (hours < 8) return 3
    return 4
}

function AttendanceInsights() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [hovered, setHovered] = useState(null)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            try {
                const response = await fetch(`${API_BASE}/attendance/stats`, {
                    credentials: 'include'
                })

                const body = await response.json().catch(() => null)

                if (!response.ok) {
                    throw new Error((body && body.message) || 'Attendance could not be loaded.')
                }

                if (!cancelled) setData(body)
            } catch (err) {
                if (!cancelled) setError(err.message)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => { cancelled = true }
    }, [])

    // One column per week; pad the first so weekdays line up.
    const weeks = useMemo(() => {
        if (!data) return []

        const days = data.heatmap || []
        if (days.length === 0) return []

        const padded = [
            ...Array.from({ length: days[0].weekday }, () => null),
            ...days
        ]

        const out = []

        for (let i = 0; i < padded.length; i += 7) {
            out.push(padded.slice(i, i + 7))
        }

        return out
    }, [data])

    // A month label sits above the column where that month begins.
    const monthLabels = useMemo(() => {
        const labels = []
        let last = null

        weeks.forEach((week, index) => {
            const first = week.find(Boolean)
            if (!first) return

            const month = Number(first.date.slice(5, 7))

            if (month !== last) {
                labels.push({ index, label: MONTHS[month - 1] })
                last = month
            }
        })

        return labels
    }, [weeks])

    const trendMax = useMemo(() => {
        if (!data) return 8
        const highest = Math.max(...(data.trend || []).map((d) => d.hours), 0)
        // Never scale below an eight-hour day.
        return Math.max(highest, 8)
    }, [data])

    if (loading) {
        return <div className="ains"><p className="ains-state">Loading your attendance…</p></div>
    }

    if (error) {
        return <div className="ains"><p className="ains-state is-error">{error}</p></div>
    }

    const totals = (data && data.totals) || {}

    return (
        <div className="ains">
            <header className="ains-head">
                <p className="ains-eyebrow">Attendance</p>
                <h1>Your last year at a glance</h1>
                <p className="ains-sub">
                    Every day you clocked in, and how long you stayed. Read from the same
                    records the clock-in screen writes.
                </p>
            </header>

            <div className="ains-totals">
                <div className="ains-stat">
                    <span className="ains-n">{totals.presentDays ?? 0}</span>
                    <span className="ains-l">Days present</span>
                </div>
                <div className="ains-stat">
                    <span className="ains-n">{totals.totalHours ?? 0}</span>
                    <span className="ains-l">Hours logged</span>
                </div>
                <div className="ains-stat">
                    <span className="ains-n">{totals.averageHours ?? 0}</span>
                    <span className="ains-l">Average day</span>
                </div>
                <div className="ains-stat">
                    <span className="ains-n">{totals.weekPresent ?? 0}<span className="ains-of">/7</span></span>
                    <span className="ains-l">This week</span>
                </div>
            </div>

            <section className="ains-card">
                <div className="ains-card-head">
                    <h2>Attendance heatmap</h2>
                    <div className="ains-scale">
                        <span>Less</span>
                        {[0, 1, 2, 3, 4].map((l) => (
                            <span key={l} className="ains-key" data-level={l} />
                        ))}
                        <span>More</span>
                    </div>
                </div>

                <div className="ains-heat-scroll">
                    <div className="ains-heat">
                        <div className="ains-months" style={{ gridTemplateColumns: `repeat(${weeks.length}, 13px)` }}>
                            {monthLabels.map((m) => (
                                <span key={`${m.label}-${m.index}`} style={{ gridColumnStart: m.index + 1 }}>
                                    {m.label}
                                </span>
                            ))}
                        </div>

                        <div className="ains-heat-body">
                            <div className="ains-weekdays">
                                {WEEKDAYS.map((d, i) => (
                                    <span key={d}>{i % 2 === 1 ? d : ''}</span>
                                ))}
                            </div>

                            <div className="ains-cols" style={{ gridTemplateColumns: `repeat(${weeks.length}, 13px)` }}>
                                {weeks.map((week, wi) => (
                                    <div key={wi} className="ains-col">
                                        {Array.from({ length: 7 }, (_, di) => {
                                            const day = week[di]

                                            if (!day) return <span key={di} className="ains-cell is-blank" />

                                            return (
                                                <span
                                                    key={di}
                                                    className="ains-cell"
                                                    data-level={level(day.hours, day.present)}
                                                    onMouseEnter={() => setHovered(day)}
                                                    onMouseLeave={() => setHovered(null)}
                                                    tabIndex={0}
                                                    onFocus={() => setHovered(day)}
                                                    onBlur={() => setHovered(null)}
                                                />
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <p className="ains-readout">
                    {hovered
                        ? `${hovered.date} — ${hovered.present ? `${hovered.hours} hours${hovered.open ? ', still clocked in' : ''}` : 'no attendance recorded'}`
                        : 'Hover a square for that day.'}
                </p>
            </section>

            <section className="ains-card">
                <div className="ains-card-head">
                    <h2>The last seven days</h2>
                    <span className="ains-week-total">{totals.weekHours ?? 0} hours</span>
                </div>

                <div className="ains-trend">
                    {(data.trend || []).map((day) => {
                        const height = Math.max((day.hours / trendMax) * 100, day.present ? 3 : 0)

                        return (
                            <div key={day.date} className="ains-bar-wrap">
                                <div className="ains-bar-track">
                                    <div
                                        className={`ains-bar ${day.open ? 'is-open' : ''}`}
                                        style={{ height: `${height}%` }}
                                        title={`${day.date}: ${day.hours} hours`}
                                    />
                                </div>
                                <span className="ains-bar-h">{day.hours || '–'}</span>
                                <span className="ains-bar-d">{WEEKDAYS[day.weekday]}</span>
                            </div>
                        )
                    })}
                </div>

                <p className="ains-foot">
                    Bars are scaled against an eight-hour day, so a quiet week reads as
                    quiet rather than being stretched to fill the chart.
                </p>
            </section>
        </div>
    )
}

export default AttendanceInsights
