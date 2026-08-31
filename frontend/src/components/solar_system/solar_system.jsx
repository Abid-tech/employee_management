import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './solar_system.css'

const ORBITS = [
    { priority: 'critical', label: 'Critical', ring: 'Innermost ring', radius: 0.30, speed: 26, cap: 6 },
    { priority: 'high', label: 'High', ring: 'Second ring', radius: 0.50, speed: 42, cap: 8 },
    { priority: 'medium', label: 'Medium', ring: 'Third ring', radius: 0.71, speed: 62, cap: 10 },
    { priority: 'low', label: 'Low', ring: 'Outermost ring', radius: 0.92, speed: 88, cap: 12 }
]

const SIZE = 620
const MAX_RADIUS = SIZE / 2 - 46

// Planet size follows effort.
const planetRadius = (hours) => Math.max(14, Math.min(28, 13 + Math.sqrt(Math.max(0, hours)) * 3))

const shortLabel = (title) => {
    const words = title.split(/\s+/).filter(Boolean)
    if (words.length === 1) return words[0].slice(0, 11)
    const pair = words.slice(0, 2).join(' ')
    return pair.length > 14 ? `${pair.slice(0, 13)}…` : pair
}

export default function SolarSystem({ tasks = [], centreLabel = 'Department', paused = false }) {
    const navigate = useNavigate()
    const [hovered, setHovered] = useState(null)

    const { rings, overflow, shown } = useMemo(() => {
        const open = tasks.filter(task => task.status !== 'done')
        const built = []
        const cut = []
        let count = 0

        for (const orbit of ORBITS) {
            const all = open
                .filter(task => task.priority === orbit.priority)
                // Soonest deadline first.
                .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))

            const visible = all.slice(0, orbit.cap)
            if (all.length > visible.length) {
                cut.push({ label: orbit.label, count: all.length - visible.length })
            }
            count += visible.length

            built.push({
                ...orbit,
                distance: MAX_RADIUS * orbit.radius,
                planets: visible.map((task, index) => ({
                    task,
                    // Evenly spaced around the ring, starting at the top.
                    angle: (360 / visible.length) * index,
                    r: planetRadius(task.estimateHours)
                }))
            })
        }

        return { rings: built, overflow: cut, shown: count }
    }, [tasks])

    if (shown === 0) {
        return (
            <div className="solar-empty">
                <span className="solar-empty-mark" aria-hidden="true" />
                <h3>Nothing in orbit</h3>
                <p className="muted">This department has no open tasks. Add one and it will appear here.</p>
            </div>
        )
    }

    const active = hovered
        ? rings.flatMap(ring => ring.planets).find(planet => planet.task.id === hovered)
        : null

    return (
        <div className="solar">
            <div className="solar-stage" style={{ '--size': `${SIZE}px` }}>
                {/* The rings are HTML rather than SVG so each one can be spun with a CSS animation. */}
                {rings.map(ring => (
                    <div
                        key={ring.priority}
                        className="orbit-path"
                        style={{ '--d': `${ring.distance * 2}px` }}
                        aria-hidden="true"
                    />
                ))}

                {rings.map(ring => (
                    <div
                        key={`spin-${ring.priority}`}
                        className={`orbit-spin${paused ? ' orbit-paused' : ''}`}
                        style={{ '--duration': `${ring.speed}s` }}
                    >
                        {ring.planets.map(planet => (
                            <button
                                key={planet.task.id}
                                type="button"
                                className={`planet planet-${ring.priority}${planet.task.overdue ? ' planet-late' : ''}${hovered === planet.task.id ? ' planet-hover' : ''}`}
                                style={{
                                    '--angle': `${planet.angle}deg`,
                                    '--distance': `${ring.distance}px`,
                                    '--r': `${planet.r}px`,
                                    '--duration': `${ring.speed}s`
                                }}
                                onClick={() => navigate(`/tasks/${planet.task.id}`)}
                                onMouseEnter={() => setHovered(planet.task.id)}
                                onMouseLeave={() => setHovered(null)}
                                onFocus={() => setHovered(planet.task.id)}
                                onBlur={() => setHovered(null)}
                                aria-label={`${planet.task.title}, ${ring.label} priority, ${planet.task.progress}% done`}
                            >
                                <span className={`planet-body${paused ? ' orbit-paused' : ''}`}>
                                    <span className="planet-label">{shortLabel(planet.task.title)}</span>

                                    {/* Progress drawn as an arc around the planet. */}
                                    <svg className="planet-ring" viewBox="0 0 100 100" aria-hidden="true">
                                        <circle className="planet-ring-track" cx="50" cy="50" r="46" />
                                        <circle
                                            className="planet-ring-fill"
                                            cx="50" cy="50" r="46"
                                            strokeDasharray={2 * Math.PI * 46}
                                            strokeDashoffset={2 * Math.PI * 46 * (1 - planet.task.progress / 100)}
                                        />
                                    </svg>
                                </span>
                            </button>
                        ))}
                    </div>
                ))}

                <div className="solar-core">
                    <strong>{shown}</strong>
                    <span>open</span>
                </div>
            </div>

            <div className="solar-foot">
                <p className="solar-centre-name">{centreLabel}</p>

                {active ? (
                    <div className="solar-readout" role="status">
                        <strong>{active.task.title}</strong>
                        <span className="muted">
                            {active.task.assignee ? active.task.assignee.name : 'Nobody assigned'}
                            {' · '}{active.task.estimateHours}h
                            {' · '}{active.task.progress}% done
                            {active.task.daysLeft !== null && (
                                active.task.overdue
                                    ? ` · ${Math.abs(active.task.daysLeft)} days late`
                                    : ` · due in ${active.task.daysLeft} days`
                            )}
                        </span>
                    </div>
                ) : (
                    <p className="muted solar-hint">
                        Hover a planet to read it, click to open it. Closer to the centre means higher priority.
                    </p>
                )}

                {overflow.length > 0 && (
                    <p className="muted solar-overflow">
                        {overflow.map(entry => `${entry.count} more ${entry.label.toLowerCase()}`).join(' · ')} not shown — the ring was full.
                    </p>
                )}
            </div>
        </div>
    )
}

export { ORBITS }
