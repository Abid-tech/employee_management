// Shared pieces for the Feedback & Evaluation module.
//
// Components only — the constants and formatters live in feedback_format.js.

import { SOURCE, sourceColour, sourceLabel } from './feedback_format'

const ICONS = {
    chat: 'M4 5h16v10H8l-4 4V5Z',
    star: 'M12 4l2.3 5 5.4.5-4.1 3.6 1.3 5.3L12 16.9 7.1 18.5l1.3-5.3L4.3 9.5 9.7 9Z',
    scale: 'M12 4v16M6 8h12M6 8l-3 6h6l-3-6ZM18 8l-3 6h6l-3-6Z',
    spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2',
    shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6Z',
    check: 'M5 13l4 4L19 7',
    cross: 'M6 6l12 12M18 6L6 18',
    left: 'M19 12H5M11 6l-6 6 6 6',
    right: 'M5 12h14M13 6l6 6-6 6',
    plus: 'M12 5v14M5 12h14',
    users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 7.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M17 11a3 3 0 1 0 0-6M21 19v-1a4 4 0 0 0-3-3.9',
    clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z',
    flag: 'M5 21V4M5 4h11l-1.5 3L16 10H5',
    briefcase: 'M4 8h16v11H4zM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2'
}

export function Icon({ name, size = 16 }) {
    const d = ICONS[name] || ICONS.chat
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={{ display: 'block', flex: 'none' }}>
            <path d={d} />
        </svg>
    )
}

export function Avatar({ person, size = 'md' }) {
    if (!person) return null
    const initials = person.initials
        || (person.name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')

    return (
        <span className={`fb-av ${size}`} style={{ background: person.color || '#0A2947' }} title={person.name}>
            {initials}
        </span>
    )
}

export function SourceTag({ source }) {
    const meta = SOURCE[source]
    if (!meta) return null
    return (
        <span className="fb-src" style={{ background: `${meta.colour}1f`, color: meta.colour }}>
            <i style={{ background: meta.colour }} />{meta.label}
        </span>
    )
}

// --- The radar ---------------------------------------------------------------

// Four sources on one set of axes.
//
// This is the whole argument of the module in a single picture. Collecting
// manager, peer, self and client feedback is common; showing them in four
// separate tabs is also common, and it means nobody ever compares them. Drawn on
// top of each other, the shape of the disagreement is the finding — a self
// polygon sitting outside everyone else's is a different conversation from one
// sitting inside it, and neither is visible any other way.
export function Radar({ axes = [], sources = ['manager', 'peer', 'self', 'client'], size = 300, max = 5 }) {
    if (axes.length < 3) return null

    const cx = size / 2
    const cy = size / 2
    const r = size / 2 - 46

    const pointAt = (index, value) => {
        const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2
        const distance = (Math.max(0, Math.min(max, value)) / max) * r
        return [cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance]
    }

    const ringPath = (level) => axes
        .map((_, i) => pointAt(i, (level / 4) * max).join(','))
        .join(' ')

    const present = sources.filter(source => axes.some(a => a[source] !== null && a[source] !== undefined))

    return (
        <svg className="fb-radar" viewBox={`0 0 ${size} ${size}`} role="img"
            aria-label="Competency ratings from each feedback source">
            {/* Rings, so a reader can read a value off the chart rather than guess */}
            {[1, 2, 3, 4].map(level => (
                <polygon key={level} points={ringPath(level)} fill="none"
                    stroke="rgba(10,41,71,.12)" strokeWidth="1" />
            ))}

            {axes.map((axis, i) => {
                const [x, y] = pointAt(i, max)
                return <line key={axis.competency} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(10,41,71,.12)" />
            })}

            {present.map(source => {
                const points = axes.map((axis, i) => pointAt(i, axis[source] ?? 0).join(',')).join(' ')
                const colour = sourceColour(source)
                return (
                    <g key={source}>
                        <polygon points={points} fill={colour} fillOpacity="0.11" stroke={colour}
                            strokeWidth="2" strokeLinejoin="round" />
                        {axes.map((axis, i) => {
                            if (axis[source] === null || axis[source] === undefined) return null
                            const [x, y] = pointAt(i, axis[source])
                            return <circle key={axis.competency} cx={x} cy={y} r="3" fill={colour} />
                        })}
                    </g>
                )
            })}

            {axes.map((axis, i) => {
                const [x, y] = pointAt(i, max * 1.2)
                return (
                    <text key={axis.competency} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                        className="fb-radar-label">
                        {axis.label}
                    </text>
                )
            })}
        </svg>
    )
}

// --- The timeline ------------------------------------------------------------

// Every submitted review as one dot in time, coloured by who wrote it. The
// horizontal axis is real dates, so a gap in feedback is as visible as a low
// score — and a run of manager-only dots shows a team that never asked anyone
// else what they thought.
export function Timeline({ points = [], width = 640, height = 132, max = 5 }) {
    if (points.length === 0) {
        return <p className="fb-state">No submitted feedback yet, so there is nothing to plot.</p>
    }

    const padX = 34
    const padY = 20
    const times = points.map(p => new Date(p.at).getTime())
    const first = Math.min(...times)
    const last = Math.max(...times)
    const span = Math.max(1, last - first)

    const xOf = (at) => padX + ((new Date(at).getTime() - first) / span) * (width - padX * 2)
    const yOf = (value) => padY + (1 - (value - 1) / (max - 1)) * (height - padY * 2)

    return (
        <svg className="fb-timeline" viewBox={`0 0 ${width} ${height}`} role="img"
            aria-label="Every review over time, coloured by source">
            {[1, 2, 3, 4, 5].map(band => (
                <g key={band}>
                    <line x1={padX} y1={yOf(band)} x2={width - padX} y2={yOf(band)} stroke="rgba(10,41,71,.09)" />
                    <text x={padX - 8} y={yOf(band)} textAnchor="end" dominantBaseline="middle"
                        className="fb-axis">{band}</text>
                </g>
            ))}

            {points.map(point => (
                <circle key={point.id} cx={xOf(point.at)} cy={yOf(point.overall)} r="5"
                    fill={sourceColour(point.source)} fillOpacity="0.85"
                    stroke="#FFFDF7" strokeWidth="1.5">
                    <title>
                        {`${sourceLabel(point.source)} · ${point.reviewerName} · ${point.overall}/5`}
                        {point.objectiveTitle ? ` · ${point.objectiveTitle}` : ''}
                        {` · ${new Date(point.at).toLocaleDateString()}`}
                    </title>
                </circle>
            ))}

            <text x={padX} y={height - 4} className="fb-axis">
                {new Date(first).toLocaleDateString()}
            </text>
            <text x={width - padX} y={height - 4} textAnchor="end" className="fb-axis">
                {new Date(last).toLocaleDateString()}
            </text>
        </svg>
    )
}

// --- Ratings -----------------------------------------------------------------

export function Stars({ value = 0, onChange, size = 20, readOnly = false }) {
    return (
        <span className={`fb-stars ${readOnly ? 'ro' : ''}`}>
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    className={n <= Math.round(value) ? 'on' : ''}
                    disabled={readOnly}
                    onClick={() => onChange?.(n)}
                    aria-label={`${n} out of 5`}
                    title={`${n} out of 5`}
                >
                    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d={ICONS.star} />
                    </svg>
                </button>
            ))}
        </span>
    )
}

export function Score({ value, out = 5 }) {
    if (value === null || value === undefined) return <span className="fb-score none">—</span>
    const tone = value >= 4.2 ? 'peak' : value >= 3.5 ? 'good' : value >= 2.8 ? 'fair' : 'risk'
    return (
        <span className={`fb-score ${tone}`}>
            <b>{Number(value).toFixed(1)}</b><small>/{out}</small>
        </span>
    )
}

export function Bar({ value, max = 5, tone = '' }) {
    const percent = Math.max(0, Math.min(100, (value / max) * 100))
    return <span className={`fb-bar ${tone}`}><i style={{ width: `${percent}%` }} /></span>
}

