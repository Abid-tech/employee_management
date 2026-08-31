import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { performanceApi } from '../../lib/performance_api'
import { Avatar, Icon, MomentumTag, Sparkline } from './performance_ui'

// Module 4, page 1 — the whole company at a glance.

// Slices of the contribution bar.
const DEPARTMENT_HUES = ['#0A2947', '#2E7D6F', '#8B5E3C', '#2C6E9B', '#B3402F', '#4E8163']

const departmentsIn = (shares) => [...new Set(shares.map(s => s.department))].sort()

const departmentColour = (department, shares) =>
    DEPARTMENT_HUES[departmentsIn(shares).indexOf(department) % DEPARTMENT_HUES.length]

// Mix a colour towards white.
const lighten = (hex, amount) => {
    const n = parseInt(hex.slice(1), 16)
    const mix = (c) => Math.round(c + (255 - c) * amount)
    const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255)
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// Largest contributor in a department keeps the pure hue.
const personColour = (share, shares) => {
    const base = departmentColour(share.department, shares)
    const peers = shares.filter(s => s.department === share.department)
    const rank = peers.findIndex(s => s.id === share.id)
    return rank <= 0 ? base : lighten(base, Math.min(0.15 * rank, 0.55))
}

// How urgent an action is, in the reader's words rather than the code's.
const SEVERITY_LABEL = { urgent: 'Do now', soon: 'This week', opportunity: 'Worth doing' }
const ACTION_TONE = { urgent: 'risk', soon: 'warn', opportunity: 'rise' }

// Rising, steady, slipping.
const MOMENTUM_COLOUR = { up: '#2E7D6F', flat: '#6B7C8C', down: '#B3402F' }

export default function Performance() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [department, setDepartment] = useState('')

    // Which department row is expanded.
    const [openDept, setOpenDept] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const response = await performanceApi.overview({ department: department || undefined })
            setData(response)
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [department])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    const heroIds = useMemo(
        () => new Set((data?.silentHeroes || []).map(h => h.id)),
        [data]
    )

    if (loading && !data) {
        return (
            <div className="p-grid">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={i < 2 ? 'p-card s12' : 'p-card s6'}>
                        <div className="p-skel" style={{ height: i < 2 ? 96 : 190 }} />
                    </div>
                ))}
            </div>
        )
    }

    if (error && !data) {
        return (
            <>
                <div className="p-err">{error}</div>
                <button className="p-btn" onClick={load}>Try again</button>
            </>
        )
    }

    const { company, leaderboard, departments, contribution, attention, pillars, actions = [] } = data
    const period = `${new Date(data.period.from).toLocaleDateString()} – ${new Date(data.period.to).toLocaleDateString()}`

    return (
        <>
            {error && <div className="p-err">{error}</div>}

            <div className="p-grid">

                {/* Company headline ----------------------------------- A navy band rather than another cream card. */}
                <section className="p-band s12">
                    <div className="b-head">
                        <span className="b-eyebrow">Company performance · {period}</span>
                        <span className="b-chip">{company.headcount} people · {company.departments} departments</span>
                    </div>

                    <div className="b-body">
                        <div className="b-score">
                            <span className="b-num">{Math.round(company.score)}</span>
                            <span className="b-of">/100</span>
                            <span className="b-grade">{company.grade.label}</span>
                        </div>

                        <div className="b-stats">
                            <div className="b-stat">
                                <span className="s-n">{company.tasksCompleted}</span>
                                <span className="s-l">Tasks completed</span>
                            </div>
                            <div className="b-stat">
                                <span className="s-n">{company.goalProgress}<i>%</i></span>
                                <span className="s-l">Goal progress</span>
                            </div>
                            <div className="b-stat">
                                <span className="s-n">{(company.pointsAwarded / 1000).toFixed(1)}<i>k</i></span>
                                <span className="s-l">Reward points</span>
                            </div>
                            <div className={`b-stat ${company.atRisk ? 'alert' : ''}`}>
                                <span className="s-n">{company.atRisk + company.stretched}</span>
                                <span className="s-l">{company.atRisk} at risk · {company.stretched} stretched</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-chips b-chips">
                        <button className={`p-chip ${department === '' ? 'on' : ''}`} onClick={() => setDepartment('')}>
                            All departments
                        </button>
                        {departments.map(d => (
                            <button
                                key={d.name}
                                className={`p-chip ${department === d.name ? 'on' : ''}`}
                                onClick={() => setDepartment(d.name)}
                            >
                                {d.mark} {d.name}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Leaderboard. */}
                <section className="p-card s7">
                    <div className="p-lbl">
                        <span>Leaderboard {department && `· ${department}`}</span>
                        <span className="p-pill plain">Click a row for the full record</span>
                    </div>
                    <p className="p-sub">
                        Ranked by a weighted score: {pillars.map(p => `${p.label} ${Math.round(p.weight * 100)}%`).join(' · ')}.
                    </p>

                    <div className="p-rows">
                        {leaderboard.length === 0 && (
                            <p className="p-state">Nobody has completed work in this period yet.</p>
                        )}

                        {leaderboard.map(person => (
                            <Link className="p-row" key={person.id} to={`/performance/employee/${person.id}`}>
                                <span className={`p-rk ${person.rank <= 3 ? 'medal' : ''}`}>
                                    {person.rank <= 3 ? ['①', '②', '③'][person.rank - 1] : person.rank}
                                </span>

                                <Avatar person={person} />

                                <span className="p-nm">
                                    {person.name}
                                    <span className="tags">
                                        {heroIds.has(person.id) && <span className="p-tag hero">Silent hero</span>}
                                        {person.sustainability.status === 'at_risk' && <span className="p-tag risk">Overloaded</span>}
                                        {person.rankDelta >= 2 && <span className="p-tag warn">Under-ranked</span>}
                                    </span>
                                    <small>{person.department} · {person.jobTitle}</small>
                                </span>

                                <span className="p-sc">
                                    <b>{Math.round(person.score)}</b>
                                    <small>{person.grade.label.toUpperCase()}</small>
                                </span>

                                <span className="p-pts">◈{person.points.toLocaleString()}</span>

                                {/* Shape and colour are the same measurement: weighted hours per week. */}
                                <Sparkline
                                    points={person.weekly}
                                    colour={MOMENTUM_COLOUR[person.momentum.direction] || '#6B7C8C'}
                                    title={`Weighted hours completed per week over 12 weeks · ${person.momentum.label}${person.momentum.changePercent ? ` ${person.momentum.changePercent > 0 ? '+' : ''}${person.momentum.changePercent}%` : ''}`}
                                />
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Recommended actions ------------------------------------- What replaced "what the rank cannot. */}
                <section className="p-card s5">
                    <div className="p-lbl">
                        <span>Recommended actions</span>
                        <span className="p-pill violet">{actions.length}</span>
                    </div>

                    <p className="p-sub">
                        Overload, unowned critical work, single points of failure and people worth
                        recognising — ordered by urgency.
                    </p>

                    {/* "Move work off them" is advice until somebody works out which work and to whom. */}
                    {actions.some(item => item.kind === 'protect') && (
                        <Link className="p-btn ghost" to="/performance/rebalance" style={{ marginTop: 10 }}>
                            <Icon name="users" size={13} /> Work out who can take the load
                        </Link>
                    )}

                    {actions.length === 0
                        ? <p className="p-state" style={{ padding: '24px 8px' }}>
                            Nothing needs a decision right now. No overload, no unowned critical work.
                        </p>
                        : (
                            <div style={{ marginTop: 10 }}>
                                {actions.map((item, i) => (
                                    <div className={`p-act ${item.severity}`} key={`${item.kind}-${i}`}>
                                        <div className="a-top">
                                            <span className={`p-tag ${ACTION_TONE[item.severity]}`}>{SEVERITY_LABEL[item.severity]}</span>
                                            <span className="a-title">{item.title}</span>
                                            {item.metric && <span className="a-metric p-mono">{item.metric}</span>}
                                        </div>

                                        <p className="a-detail">{item.detail}</p>

                                        <div className="a-foot">
                                            <span className="a-do"><Icon name="right" size={12} /> {item.action}</span>
                                            {item.people.length > 0 && (
                                                <span className="a-people">
                                                    {item.people.map(p => (
                                                        <Link key={p.id} to={`/performance/employee/${p.id}`} title={p.name}>
                                                            <Avatar person={p} size="sm" />
                                                        </Link>
                                                    ))}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                </section>

                {/* Departments. */}
                <section className="p-card s6">
                    <div className="p-lbl"><span>Department performance</span><Icon name="chart" size={14} /></div>
                    <p className="p-sub">
                        Average score, and how much of each department's own workload has landed.
                        Open one to see who is in it.
                    </p>

                    <div style={{ marginTop: 10 }}>
                        {departments.map(dept => {
                            const tone = dept.avgScore >= 80 ? 'mint' : dept.avgScore >= 60 ? '' : dept.avgScore >= 40 ? 'gold' : 'rose'
                            const open = openDept === dept.name

                            return (
                                <div className="p-dept" key={dept.name}>
                                    <button
                                        className="d-t"
                                        onClick={() => setOpenDept(open ? '' : dept.name)}
                                        aria-expanded={open}
                                    >
                                        <span className="d-n">
                                            <span className={`d-caret ${open ? 'open' : ''}`}>›</span>
                                            <span>{dept.mark}</span>
                                            {dept.name}
                                            <em>{dept.headcount} {dept.headcount === 1 ? 'person' : 'people'}</em>
                                            {dept.atRisk > 0 && <span className="p-tag risk">{dept.atRisk} at risk</span>}
                                        </span>
                                        <b className={tone === 'mint' ? 'p-up' : tone === 'rose' ? 'p-down' : ''}>
                                            {Math.round(dept.avgScore)}
                                        </b>
                                    </button>

                                    <div className={`p-bar ${tone}`}><i style={{ width: `${dept.avgScore}%` }} /></div>
                                    <div className="p-scale">
                                        <span>{dept.tasksDone} of {dept.tasksTotal} tasks done</span>
                                        <span>◈{dept.points.toLocaleString()}</span>
                                    </div>

                                    {open && (
                                        <div className="p-deptx">
                                            <div className="dx-kpis">
                                                <span><b>{dept.openTasks}</b> open</span>
                                                <span><b>{dept.openCritical}</b> critical</span>
                                                <span><b>{dept.overdue}</b> overdue</span>
                                                <span><b>{dept.unassigned}</b> unowned</span>
                                            </div>

                                            <div className="dx-pillars">
                                                {pillars.map(p => (
                                                    <span key={p.key} title={`${p.label}: ${p.howMeasured || p.blurb}`}>
                                                        {p.label} <b>{Math.round(dept.pillarAverages?.[p.key] ?? 0)}</b>
                                                    </span>
                                                ))}
                                            </div>

                                            {dept.people.length === 0
                                                ? <p className="p-state" style={{ padding: '14px 8px' }}>Nobody is assigned to this department yet.</p>
                                                : dept.people.map(p => (
                                                    <Link className="dx-row" key={p.id} to={`/performance/employee/${p.id}`}>
                                                        <Avatar person={p} size="sm" />
                                                        <span className="dx-n">
                                                            {p.name}
                                                            <small>{p.jobTitle} · {p.tasksDone} done · {p.tasksOpen} open</small>
                                                        </span>
                                                        {p.status !== 'healthy' && (
                                                            <span className={`p-tag ${p.status === 'at_risk' ? 'risk' : 'warn'}`}>
                                                                {p.status === 'at_risk' ? 'At risk' : 'Stretched'}
                                                            </span>
                                                        )}
                                                        <span className="dx-sc p-mono">{Math.round(p.score)}</span>
                                                    </Link>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* Needs attention. */}
                <section className="p-card s6">
                    <div className="p-lbl"><span>Needs attention</span><Icon name="heart" size={14} /></div>
                    <p className="p-sub">
                        Open workload, overdue work and falling output.
                    </p>

                    {attention.length === 0
                        ? <p className="p-state">Nobody is overloaded or slipping. Good week.</p>
                        : attention.map(person => (
                            <Link className="p-item" key={person.id} to={`/performance/employee/${person.id}`} style={{ textDecoration: 'none' }}>
                                <Avatar person={person} />
                                <span className="i-b">
                                    <span className="t">
                                        {person.name}
                                        {person.status === 'at_risk'
                                            ? <span className="p-tag risk" style={{ marginLeft: 6 }}>At risk</span>
                                            : person.status === 'stretched'
                                                ? <span className="p-tag warn" style={{ marginLeft: 6 }}>Stretched</span>
                                                : null}
                                        <span style={{ marginLeft: 6 }}><MomentumTag momentum={person.momentum} /></span>
                                    </span>
                                    <span className="s">{person.reasons.join(' · ')}</span>
                                </span>
                                <span className="i-amt p-mono">{Math.round(person.score)}</span>
                            </Link>
                        ))}
                </section>

                {/* Contribution to the company goal. */}
                <section className="p-card s12">
                    <div className="p-lbl">
                        <span>Contribution to the company goal · who moved it</span>
                        <span className="p-pill gold">{contribution.goalProgress}% reached</span>
                    </div>

                    <p className="p-sub">
                        {contribution.goalCount} live {contribution.goalCount === 1 ? 'project' : 'projects'} as
                        one bar, weighted by estimated hours × priority.
                        One colour per department, one shade per person.
                    </p>

                    {contribution.shares.length === 0
                        ? <p className="p-state">No completed work on a live project to attribute yet.</p>
                        : (
                            <>
                                <div className="p-contrib">
                                    {contribution.shares.map((share) => {
                                        // Below ~7% a label cannot fit legibly.
                                        const width = share.share * (contribution.goalProgress / 100)
                                        return (
                                            <span
                                                key={share.id}
                                                title={`${share.name} · ${share.department} — ${share.share}% of the finished work (${share.tasks} tasks, ${share.weightedHours} weighted hours)`}
                                                style={{ width: `${width}%`, background: personColour(share, contribution.shares) }}
                                            >
                                                {width > 7 ? `${share.name.split(' ')[0]} ${share.share}%` : ''}
                                            </span>
                                        )
                                    })}
                                    <span className="rest" style={{ width: `${100 - contribution.goalProgress}%` }}>
                                        {100 - contribution.goalProgress}% to go
                                    </span>
                                </div>

                                <div className="p-scale">
                                    <span>0%</span>
                                    <span>◀ {contribution.goalProgress}% of the work finished ▶</span>
                                    <span>Goal 100%</span>
                                </div>

                                {/* Department legend — the key to the colours above, and a departmental read of the same bar. */}
                                <div className="p-legend">
                                    {contribution.byDepartment.map(dept => (
                                        <div className="l-row" key={dept.name}>
                                            <span style={{
                                                width: 12, height: 12, borderRadius: 3, flex: 'none',
                                                background: departmentColour(dept.name, contribution.shares)
                                            }} />
                                            {dept.name}
                                            <em style={{ color: 'var(--p-muted)', fontStyle: 'normal', fontSize: 10.5 }}>
                                                {dept.people} {dept.people === 1 ? 'person' : 'people'} · {dept.tasks} tasks
                                            </em>
                                            <b>{dept.share}%</b>
                                        </div>
                                    ))}
                                </div>

                                {/* The goals themselves. */}
                                <div className="p-lbl" style={{ marginTop: 18 }}>
                                    <span>The {contribution.goalCount} projects behind that number</span>
                                </div>

                                <div className="p-goals">
                                    {contribution.goals.map(goal => {
                                        const tone = goal.progress >= 80 ? 'mint' : goal.progress >= 55 ? '' : goal.progress >= 35 ? 'gold' : 'rose'
                                        return (
                                            <Link className="g-row" key={goal.id} to={`/projects/${goal.id}`}>
                                                <span className="g-t">
                                                    {goal.title}
                                                    <small>
                                                        {goal.tasksDone} of {goal.tasksTotal} tasks · {goal.remainingHours}h left
                                                        {' · '}{goal.weightShare}% of the whole goal
                                                    </small>
                                                </span>
                                                <span className={`p-bar ${tone} g-bar`}><i style={{ width: `${goal.progress}%` }} /></span>
                                                <span className="g-p p-mono">{goal.progress}%</span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </>
                        )}

                </section>

                <section className="p-card s12">
                    <Link className="p-btn" to="/performance/reports" style={{ width: '100%', justifyContent: 'center' }}>
                        <Icon name="download" size={15} /> Build a custom performance report
                    </Link>
                </section>
            </div>
        </>
    )
}
