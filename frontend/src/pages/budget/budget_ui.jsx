// Shared pieces for the Project Budget Tracker.
//
// Components only — the formatters live in budget_format.js.

import { money } from './budget_format'

const ICONS = {
    coin: 'M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
    clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    play: 'M7 5l12 7-12 7V5Z',
    stop: 'M7 7h10v10H7z',
    alert: 'M12 8v5M12 17h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z',
    left: 'M19 12H5M11 6l-6 6 6 6',
    right: 'M5 12h14M13 6l6 6-6 6',
    plus: 'M12 5v14M5 12h14',
    check: 'M5 13l4 4L19 7',
    users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 7.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M17 11a3 3 0 1 0 0-6M21 19v-1a4 4 0 0 0-3-3.9',
    tag: 'M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9ZM7.5 7.5h.01'
}

export function Icon({ name, size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={{ display: 'block', flex: 'none' }}>
            <path d={ICONS[name] || ICONS.coin} />
        </svg>
    )
}

export function Avatar({ person, size = 'md' }) {
    if (!person) return null
    const initials = person.initials
        || (person.name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    return <span className={`bd-av ${size}`} style={{ background: person.color || '#0A2947' }}>{initials}</span>
}

// --- The forecast bar --------------------------------------------------------

// The classic used bar, demoted to supporting evidence, with the forecast drawn
// on top of it.
//
// Two marks matter more than the fill: where the central estimate lands, and how
// wide the range around it is. A bar that only shows spend cannot say "you are
// at 55% and heading for 140%", which is the sentence a manager needs.
export function ForecastBar({ spent, projected, low, high, total, currency = 'USD' }) {
    if (!total) return null

    // The scale runs to whichever is larger — the budget, or the worst case —
    // so an overrun is drawn outside the budget line rather than clipped at it.
    const ceiling = Math.max(total, high || 0) * 1.04
    const pct = (v) => Math.max(0, Math.min(100, (v / ceiling) * 100))

    const budgetAt = pct(total)
    const overruns = projected > total

    return (
        <div className="bd-fbar">
            <div className="fb-track">
                {/* range */}
                {high > low && (
                    <span className="fb-range" style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }} />
                )}
                {/* spent so far */}
                <span className={`fb-spent ${spent > total ? 'over' : ''}`} style={{ width: `${pct(spent)}%` }} />
                {/* central estimate */}
                <span className={`fb-proj ${overruns ? 'over' : ''}`} style={{ left: `${pct(projected)}%` }}>
                    <i />
                </span>
                {/* the budget line */}
                <span className="fb-cap" style={{ left: `${budgetAt}%` }}><i /></span>
            </div>

            <div className="fb-key">
                <span className="k"><i className="sw spent" /> Spent {money(spent, currency)}</span>
                <span className="k"><i className="sw range" /> Range {money(low, currency)}–{money(high, currency)}</span>
                <span className="k"><i className={`sw proj ${overruns ? 'over' : ''}`} /> Trending {money(projected, currency)}</span>
                <span className="k"><i className="sw cap" /> Budget {money(total, currency)}</span>
            </div>
        </div>
    )
}

// --- Burn chart --------------------------------------------------------------

// Cumulative spend against the budget line. The point of the cumulative form is
// that the slope is the burn rate — a curve that steepens is a project changing
// pace, which is exactly what the lifetime average hides.
export function BurnChart({ series = [], total, projected, currency = 'USD', width = 640, height = 170 }) {
    if (series.length < 2) {
        return <p className="bd-state">Not enough logged time yet to draw a burn curve.</p>
    }

    const padX = 46
    const padY = 16
    const ceiling = Math.max(total || 0, projected || 0, series[series.length - 1].cumulative) * 1.08

    const xOf = (i) => padX + (i / (series.length - 1)) * (width - padX - 16)
    const yOf = (v) => height - padY - (v / ceiling) * (height - padY * 2)

    const line = series.map((point, i) => `${xOf(i)},${yOf(point.cumulative)}`).join(' ')
    const area = `${padX},${height - padY} ${line} ${xOf(series.length - 1)},${height - padY}`

    return (
        <svg className="bd-burn" viewBox={`0 0 ${width} ${height}`} role="img"
            aria-label="Cumulative spend against budget">
            <defs>
                <linearGradient id="bd-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#0A2947" stopOpacity=".22" />
                    <stop offset="1" stopColor="#0A2947" stopOpacity="0" />
                </linearGradient>
            </defs>

            {total > 0 && (
                <>
                    <line x1={padX} y1={yOf(total)} x2={width - 16} y2={yOf(total)}
                        stroke="#B3402F" strokeWidth="1.5" strokeDasharray="5 4" />
                    <text x={padX} y={yOf(total) - 6} className="bd-axis" fill="#B3402F">
                        Budget {money(total, currency)}
                    </text>
                </>
            )}

            <polygon points={area} fill="url(#bd-fill)" />
            <polyline points={line} fill="none" stroke="#0A2947" strokeWidth="2.4"
                strokeLinejoin="round" strokeLinecap="round" />

            <circle cx={xOf(series.length - 1)} cy={yOf(series[series.length - 1].cumulative)} r="4" fill="#0A2947" />

            <text x={padX} y={height - 3} className="bd-axis">{series[0].date}</text>
            <text x={width - 16} y={height - 3} textAnchor="end" className="bd-axis">
                {series[series.length - 1].date}
            </text>
        </svg>
    )
}

export function Note({ note }) {
    if (!note) return null
    return (
        <div className={`bd-note ${note.tone}`}>
            <span className="n-h">{note.headline}</span>
            <span className="n-d">{note.detail}</span>
        </div>
    )
}

