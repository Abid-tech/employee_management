import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { performanceApi } from '../../lib/performance_api'
import { Avatar, Gauge, Icon, Pillars, TrendChart } from './performance_ui'

// Module 4, page 2 — one person's record.

const LEDGER_ICON = {
    delivery: 'target', on_time: 'bolt', critical: 'shield', milestone: 'star'
}

const STATUS_COPY = {
    healthy: { label: 'Healthy load', tone: 'mint' },
    stretched: { label: 'Stretched', tone: 'gold' },
    at_risk: { label: 'At risk of overload', tone: 'rose' }
}

export default function PerformanceProfile() {
    const { id } = useParams()

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await performanceApi.employee(id))
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [id])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    if (loading && !data) {
        return (
            <div className="p-grid">
                <div className="p-card s12"><div className="p-skel" style={{ height: 92 }} /></div>
                <div className="p-card s5"><div className="p-skel" style={{ height: 280 }} /></div>
                <div className="p-card s7"><div className="p-skel" style={{ height: 280 }} /></div>
            </div>
        )
    }

    if (error && !data) {
        return (
            <>
                <div className="p-err">{error}</div>
                <Link className="p-back" to="/performance"><Icon name="left" size={13} /> Back to the leaderboard</Link>
            </>
        )
    }

    const { employee, coach, pillars, peerAverage, companyAverage, percentile, scoreMax = 100 } = data
    const health = STATUS_COPY[employee.sustainability.status]

    return (
        <div className="p-grid">

            {/* Header. */}
            <section className="p-card s12">
                <Link className="p-back" to="/performance"><Icon name="left" size={13} /> Back to the leaderboard</Link>

                <div className="p-head">
                    <Avatar person={employee} size="lg" />

                    <div style={{ minWidth: 0 }}>
                        <h2>{employee.name}</h2>
                        <div className="h-m">{employee.department} · {employee.jobTitle}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                            <span className="p-pill violet">Rank #{employee.rank}</span>
                            <span className="p-pill plain">Fair rank #{employee.fairRank}</span>
                            <span className="p-pill gold">◈{employee.points.toLocaleString()}</span>
                            <span className={`p-pill ${health.tone}`}>{health.label}</span>
                        </div>
                    </div>

                    <div className="h-r">
                        <div className="p-num" style={{ fontSize: 38, lineHeight: 1.1 }}>{Math.round(employee.score)}</div>
                        <div style={{ fontSize: 11, color: 'var(--p-muted)' }}>
                            {employee.grade.label} · top {Math.max(1, 100 - percentile)}%
                        </div>
                    </div>
                </div>
            </section>

            {/* The score as arithmetic ---------------------------------- The four pillars are shown as points. */}
            <section className="p-card s12" style={{ borderColor: 'rgba(10,41,71,.35)' }}>
                <div className="p-lbl">
                    <span>Score sheet · {employee.score} out of {scoreMax}</span>
                    <span className="p-pill plain">Calculated automatically</span>
                </div>

                <div className="p-sheet">
                    {pillars.map(def => {
                        const pillar = employee.pillars[def.key]
                        return (
                            <div className="p-sheet-row" key={def.key}>
                                <span className="sr-name">{def.label}</span>
                                <span className="sr-calc p-mono">
                                    {Math.round(pillar.value)}<span className="dim">/100</span>
                                    <span className="dim"> × {Math.round(def.weight * 100)}%</span>
                                </span>
                                <span className="sr-out p-mono"><b>{pillar.contributed}</b><span className="dim">/{pillar.max}</span></span>
                                <span className="sr-head p-mono dim">
                                    {pillar.headroom > 0 ? `+${pillar.headroom} still available` : 'maxed'}
                                </span>
                            </div>
                        )
                    })}

                    <div className="p-sheet-row total">
                        <span className="sr-name">Total</span>
                        <span className="sr-calc p-mono dim">sum of the four</span>
                        <span className="sr-out p-mono"><b>{employee.score}</b><span className="dim">/{scoreMax}</span></span>
                        <span className="sr-head p-mono">{employee.grade.label}</span>
                    </div>
                </div>

                {coach.nextGrade && (
                    <div className="p-note mint" style={{ marginTop: 10 }}>
                        <b>Fastest route up:</b> {coach.focusLabel} — {coach.upside} points still unclaimed.
                        Next grade <b>{coach.nextGrade.label}</b> at {coach.nextGrade.at}.
                    </div>
                )}
            </section>

            {/* Score breakdown. */}
            <section className="p-card s5">
                <div className="p-lbl"><span>How the score is built</span></div>

                <div className="p-hero">
                    <Gauge score={employee.score} label={employee.grade.label} size={118} />
                </div>

                <div style={{ marginTop: 14 }}>
                    <Pillars pillars={employee.pillars} definitions={pillars} />
                </div>

                <div className="p-note" style={{ marginTop: 14 }}>
                    Against a department average of <b>{peerAverage}</b> and a company average
                    of <b>{companyAverage}</b>.
                </div>

                {/* Badges say what somebody did. */}
                <div className="p-lbl" style={{ marginTop: 16 }}><span>Badges · what earns each one</span></div>
                <div className="p-bdglist">
                    {employee.badges.map(badge => (
                        <div className={`p-bdgrow ${badge.earned ? 'on' : 'off'}`} key={badge.key}>
                            <span className="b-ic">
                                <Icon name={{ mentor: 'star', unblocker: 'hand', on_time: 'bolt', milestone: 'target', steady: 'chart', streak: 'shield' }[badge.key]} size={16} />
                            </span>
                            <span className="b-txt">
                                <span className="b-name">
                                    {badge.label}
                                    {badge.earned
                                        ? <span className="p-tag rise">Earned ×{badge.count}</span>
                                        : <span className="p-tag warn">Not yet</span>}
                                </span>
                                <span className="b-rule">{badge.blurb}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Trend. */}
            <section className="p-card s7">
                <div className="p-lbl">
                    <span>Output · last 12 weeks</span>
                    <span className={`p-pill ${employee.momentum.direction === 'up' ? 'mint' : employee.momentum.direction === 'down' ? 'rose' : 'plain'}`}>
                        {employee.momentum.label} {employee.momentum.changePercent !== 0 && `${employee.momentum.changePercent > 0 ? '+' : ''}${employee.momentum.changePercent}%`}
                    </span>
                </div>

                <TrendChart weekly={employee.weekly} />

                <div className="p-lbl" style={{ marginTop: 12 }}><span>Work this period</span></div>
                <div className="p-kpis">
                    <div className="p-kpi good">
                        <div className="k-l">Tasks done</div>
                        <div className="k-n p-num">{employee.stats.tasksDone}</div>
                        <div className="k-s">of {employee.stats.tasksAssigned} assigned</div>
                    </div>
                    <div className="p-kpi">
                        <div className="k-l">On time</div>
                        <div className="k-n p-num">{employee.stats.onTimeRate === null ? '—' : `${employee.stats.onTimeRate}%`}</div>
                        <div className="k-s">of those with a date</div>
                    </div>
                    <div className="p-kpi warn">
                        <div className="k-l">Critical cleared</div>
                        <div className="k-n p-num">{employee.stats.criticalDone}</div>
                        <div className="k-s">highest priority</div>
                    </div>
                    <div className="p-kpi">
                        <div className="k-l">Helped others</div>
                        <div className="k-n p-num">{employee.stats.helped}</div>
                        <div className="k-s">{employee.stats.answers} direct answers</div>
                    </div>
                </div>

                <div className="p-lbl" style={{ marginTop: 16 }}><span>Sustainability</span><Icon name="heart" size={13} /></div>
                <div className={`p-note ${health.tone}`}>
                    <b>{health.label}.</b>{' '}
                    {employee.sustainability.reasons.length
                        ? employee.sustainability.reasons.join(' · ')
                        : 'Open workload is within one normal week, and nothing is running past its date.'}
                </div>
                <div className="p-drow" style={{ marginTop: 6 }}>
                    <span>Open work still owed</span><span>{employee.sustainability.openHours}h</span>
                </div>
                <div className="p-drow">
                    <span>Finished at a weekend</span><span>{employee.sustainability.weekendRate}%</span>
                </div>
                <div className="p-drow">
                    <span>Consecutive active weeks</span><span>{employee.streak}</span>
                </div>
            </section>

            {/* Reward ledger. */}
            <section className="p-card s12">
                <div className="p-lbl">
                    <span>Reward points · every point traced to the work that earned it</span>
                    <span className="p-pill gold">◈{employee.points.toLocaleString()} total</span>
                </div>

                {employee.ledger.length === 0
                    ? <p className="p-state">No points earned in this period yet.</p>
                    : (
                        <div style={{ marginTop: 8 }}>
                            {employee.ledger.slice(0, 12).map((entry, i) => (
                                <div className="p-item" key={`${entry.kind}-${i}`}>
                                    <span className={`p-icon ${entry.kind === 'milestone' ? 'gold' : entry.kind === 'critical' ? 'rose' : 'mint'}`}>
                                        <Icon name={LEDGER_ICON[entry.kind] || 'coin'} size={15} />
                                    </span>
                                    <span className="i-b">
                                        <span className="t">{entry.label}</span>
                                        <span className="s">
                                            {entry.detail}
                                            {entry.at && ` · ${new Date(entry.at).toLocaleDateString()}`}
                                        </span>
                                    </span>
                                    <span className="i-amt p-up">+{entry.points} ◈</span>
                                </div>
                            ))}
                            {employee.ledger.length > 12 && (
                                <p className="p-sub" style={{ marginTop: 10 }}>
                                    Showing the 12 most recent of {employee.ledger.length} entries.
                                </p>
                            )}
                        </div>
                    )}
            </section>
        </div>
    )
}
