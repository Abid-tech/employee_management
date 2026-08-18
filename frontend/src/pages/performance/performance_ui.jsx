// Module 4 — the small visual pieces the three performance pages share.
//
// Kept in one file so a gauge on the dashboard and a gauge on a profile can
// never drift apart, and so each page file stays about its own layout.

const PATHS = {
    trophy: 'M7 4h10v3a5 5 0 0 1-10 0V4ZM7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M9 15h6M10 15v-2M14 15v-2M8 20h8',
    spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2',
    star: 'M12 4l2.3 5 5.4.5-4.1 3.6 1.3 5.3L12 16.9 7.1 18.5l1.3-5.3L4.3 9.5 9.7 9Z',
    bolt: 'M13 3 5 13h6l-1 8 8-10h-6Z',
    target: null,
    shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6Z',
    hand: 'M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V7a1.5 1.5 0 0 1 3 0v7a5 5 0 0 1-5 5h-1a5 5 0 0 1-4-2l-2.5-3a1.5 1.5 0 0 1 2.3-2L6 13',
    coin: null,
    up: 'M5 15l7-7 7 7',
    down: 'M5 9l7 7 7-7',
    right: 'M5 12h14M13 6l6 6-6 6',
    left: 'M19 12H5M11 6l-6 6 6 6',
    download: 'M12 5v10M7 12l5 5 5-5M5 19h14',
    users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 7.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M17 11a3 3 0 1 0 0-6M21 19v-1a4 4 0 0 0-3-3.9',
    heart: 'M12 20s-7-4.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.5-7 9-7 9Z',
    chart: 'M4 19h16M7 16V9M12 16V5M17 16v-4',
    flag: 'M5 21V4M5 4h11l-1.5 3L16 10H5',
    eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z'
}

// A couple of icons are circles rather than paths, so they get drawn directly.
export function Icon({ name, size = 16, className = '', style }) {
    const common = {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round',
        strokeLinejoin: 'round', className, style, 'aria-hidden': true
    }

    if (name === 'target') {
        return (
            <svg {...common}>
                <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" />
            </svg>
        )
    }
    if (name === 'coin') {
        return (
            <svg {...common}>
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
            </svg>
        )
    }
    if (name === 'star') {
        return <svg {...common} fill="currentColor" stroke="none"><path d={PATHS.star} /></svg>
    }

    return <svg {...common}><path d={PATHS[name] || PATHS.spark} /></svg>
}

// Initials on a coloured disc — the same approach the employee records already
// take, so no photo uploads are needed anywhere.
export function Avatar({ person, size = '' }) {
    const initials = person.initials
        || (person.name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

    return (
        <span
            className={`p-av ${size}`}
            style={{ background: `linear-gradient(145deg, ${person.color || '#14395C'}, ${shade(person.color || '#14395C')})` }}
            title={person.name}
        >
            {initials}
        </span>
    )
}

// Darken a hex colour so every avatar reads as a small gradient rather than a
// flat disc. Falls back to the input if it is not a plain 6-digit hex.
function shade(hex) {
    const match = /^#([0-9a-f]{6})$/i.exec(hex)
    if (!match) return hex

    const n = parseInt(match[1], 16)
    const dark = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => Math.max(0, Math.round(c * 0.55)))
    return `rgb(${dark.join(',')})`
}

// The same five tones the stylesheet uses, kept here in hex because SVG strokes
// and gradient stops are built as attribute strings rather than CSS.
export const toneColour = (tone) => ({
    peak: '#2E7D6F', good: '#4E8163', fair: '#B87333', warn: '#8B5E3C', risk: '#B3402F'
}[tone] || '#0A2947')

// The score dial. An open arc rather than a full ring so the gap reads as
// "distance still to travel" rather than as a missing slice of a pie.
export function Gauge({ score = 0, label = '', size = 132 }) {
    const radius = 50
    const arc = 235.6                     // 270° of a 314 circumference
    const filled = (Math.max(0, Math.min(100, score)) / 100) * arc
    const colour = toneColour(
        score >= 90 ? 'peak' : score >= 80 ? 'good' : score >= 70 ? 'fair' : score >= 55 ? 'warn' : 'risk'
    )

    return (
        <div className="p-gauge" style={{ width: size, height: size }}>
            <svg viewBox="0 0 120 120" role="img" aria-label={`Score ${Math.round(score)} out of 100`}>
                <defs>
                    <linearGradient id={`gg-${label}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor={colour} stopOpacity="0.65" />
                        <stop offset="1" stopColor={colour} />
                    </linearGradient>
                </defs>
                <circle
                    cx="60" cy="60" r={radius} fill="none"
                    stroke="#D3D4C0" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${arc} 314`} transform="rotate(135 60 60)"
                />
                <circle
                    cx="60" cy="60" r={radius} fill="none"
                    stroke={`url(#gg-${label})`} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${filled} 314`} transform="rotate(135 60 60)"
                    style={{ transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1)' }}
                />
                <text x="60" y="59" textAnchor="middle" className="p-num" fill="#0A2947" fontSize="29">
                    {Math.round(score)}
                </text>
                <text x="60" y="75" textAnchor="middle" className="g-cap">{label.toUpperCase()}</text>
            </svg>
        </div>
    )
}

// Twelve weeks of output as a single glyph, small enough to sit inside a
// leaderboard row without turning it into a chart.
export function Sparkline({ points = [], width = 56, height = 22, colour = '#2E7D6F', title }) {
    if (!points.length) return <svg className="p-spark" width={width} height={height} aria-hidden="true" />

    const max = Math.max(...points, 1)
    const step = points.length > 1 ? width / (points.length - 1) : width
    const coords = points.map((v, i) => [i * step, height - 2 - (v / max) * (height - 4)])
    const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    const uid = `sp${Math.round(points.reduce((a, b) => a + b, 0))}-${points.length}`

    return (
        <svg className="p-spark" viewBox={`0 0 ${width} ${height}`} width={width} height={height}
            role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
            {title && <title>{title}</title>}
            <defs>
                <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={colour} stopOpacity=".38" />
                    <stop offset="1" stopColor={colour} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={`0,${height} ${line} ${width},${height}`} fill={`url(#${uid})`} />
            <polyline points={line} fill="none" stroke={colour} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    )
}

// The area chart on the profile page — the same shape as the sparkline, drawn
// at a size where the axis labels earn their place.
export function TrendChart({ weekly = [], height = 150 }) {
    if (!weekly.length) return null

    const width = 560
    const pad = 14
    const max = Math.max(...weekly.map(w => w.weightedHours), 1)
    const step = weekly.length > 1 ? (width - pad * 2) / (weekly.length - 1) : 0

    const coords = weekly.map((w, i) => [
        pad + i * step,
        height - 26 - (w.weightedHours / max) * (height - 52)
    ])
    const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    const last = coords[coords.length - 1]

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', marginTop: 8 }}
            role="img" aria-label="Weekly output over the period">
            <defs>
                <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#0A2947" stopOpacity=".22" />
                    <stop offset="1" stopColor="#0A2947" stopOpacity="0" />
                </linearGradient>
            </defs>
            <g stroke="rgba(10,41,71,.1)">
                <line x1={pad} y1="28" x2={width - pad} y2="28" />
                <line x1={pad} y1="66" x2={width - pad} y2="66" />
                <line x1={pad} y1="104" x2={width - pad} y2="104" />
            </g>
            <polygon points={`${pad},${height - 26} ${line} ${width - pad},${height - 26}`} fill="url(#trend-area)" />
            <polyline points={line} fill="none" stroke="#14395C" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            {last && <circle cx={last[0]} cy={last[1]} r="4" fill="#14395C" />}
            <g fill="#6B7C8C" fontSize="9" textAnchor="middle">
                {weekly.map((w, i) => (
                    (i === 0 || i === weekly.length - 1 || i === Math.floor(weekly.length / 2))
                        ? <text key={w.label} x={coords[i][0]} y={height - 8}>{w.label}</text>
                        : null
                ))}
            </g>
        </svg>
    )
}

// The four weighted pillars, shown the same way wherever they appear.
// The score, shown as arithmetic rather than as a verdict.
//
// Each row carries two different numbers and they are easy to confuse, so the
// component shows both and labels them:
//
//   score        how well the pillar itself is going, 0–100
//   contributed  what that pillar puts into the final score, out of its weight
//
// The four weights are a partition of 100, so the `contributed` column adds up
// to the overall score exactly — which is the point of showing it.
export function Pillars({ pillars, definitions, showDetail = true }) {
    return (
        <div className="p-pillars">
            {definitions.map(def => {
                const pillar = pillars[def.key] || {}
                const value = pillar.value ?? 0
                const max = pillar.max ?? Math.round(def.weight * 100)
                const contributed = pillar.contributed ?? +(value * def.weight).toFixed(1)
                const tone = value >= 80 ? 'mint' : value >= 60 ? '' : value >= 40 ? 'gold' : 'rose'

                return (
                    <div className="p-plx" key={def.key}>
                        <div className="p-pl">
                            <span className="n">
                                {def.label}
                                <small>weight {Math.round(def.weight * 100)}%</small>
                            </span>
                            <span className={`p-bar ${tone}`}><i style={{ width: `${value}%` }} /></span>
                            <span className="v">
                                <b>{contributed}</b><span className="of">/{max}</span>
                            </span>
                        </div>

                        {showDetail && (
                            <div className="p-plx-note">
                                <span className="s-own">Pillar score <b>{Math.round(value)}</b>/100</span>
                                {def.formula && <span className="s-formula">{def.formula}</span>}
                                {def.howMeasured && <span className="s-how">{def.howMeasured}</span>}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export function MomentumTag({ momentum }) {
    if (!momentum) return null
    const cls = { up: 'rise', down: 'risk', flat: '' }[momentum.direction]
    if (momentum.direction === 'flat') return <span className="p-tag warn">Steady</span>

    return (
        <span className={`p-tag ${cls}`}>
            {momentum.direction === 'up' ? '▲' : '▼'} {Math.abs(Math.round(momentum.changePercent))}%
        </span>
    )
}
