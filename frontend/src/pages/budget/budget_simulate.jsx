import { useCallback, useEffect, useState } from 'react'
import { budgetApi } from '../../lib/budget_api'
import { useBudget } from './budget_context'
import { formatDate, money } from './budget_format'
import { Icon } from './budget_ui'

// Three decisions, simulated before they are made.

const TABS = [
    { key: 'quote', label: 'Promise a date', blurb: 'What is this delivery date worth?' },
    { key: 'people', label: 'Add someone', blurb: 'Would another pair of hands actually help?' },
    { key: 'leave', label: 'Approve leave', blurb: 'What does this week off cost the projects?' }
]

const iso = (d) => d.toISOString().slice(0, 10)
const inDays = (n) => iso(new Date(Date.now() + n * 86400000))

export default function BudgetSimulate() {
    const { meta } = useBudget()

    const [tab, setTab] = useState('quote')
    const [projects, setProjects] = useState([])
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const [form, setForm] = useState({
        project: '', date: inDays(21),
        person: '', horizonDays: 30,
        leavePerson: '', from: inDays(7), to: inDays(11)
    })

    const [quote, setQuote] = useState(null)
    const [staffing, setStaffing] = useState(null)
    const [leave, setLeave] = useState(null)

    useEffect(() => {
        budgetApi.portfolio()
            .then(data => {
                setProjects(data.rows.map(r => r.objective))
                setForm(f => (f.project ? f : { ...f, project: data.rows[0]?.objective.id || '' }))
            })
            .catch(err => setError(err.message))
    }, [])

    const set = (key, value) => setForm(p => ({ ...p, [key]: value }))

    const run = useCallback(async () => {
        setBusy(true)
        setError('')
        try {
            if (tab === 'quote') {
                const data = await budgetApi.quote(form.project, form.date)
                setQuote(data.quote)
            } else if (tab === 'people') {
                const data = await budgetApi.addPerson(form.project, form.person, form.horizonDays)
                setStaffing(data.simulation)
            } else {
                const data = await budgetApi.leaveImpact(form.leavePerson, form.from, form.to)
                setLeave(data.impact)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }, [tab, form])

    const canRun = tab === 'quote' ? form.project && form.date
        : tab === 'people' ? form.project && form.person
            : form.leavePerson && form.from && form.to

    return (
        <div className="bd-grid">
            {error && <div className="bd-err s12">{error}</div>}

            <section className="bd-card s12">
                <div className="bd-lbl"><span>What if…</span><Icon name="trend" size={14} /></div>
                <p className="bd-sub">
                    Each of these needs the schedule and the money at the same time. Specialist tools hold one
                    half each, so the decision usually gets made on instinct — this one shows the consequence first.
                </p>

                <div className="bd-tabs" style={{ marginTop: 12 }}>
                    {TABS.map(t => (
                        <a key={t.key} href="#!" className={tab === t.key ? 'on' : ''}
                            onClick={(e) => { e.preventDefault(); setTab(t.key) }}>
                            {t.label}
                        </a>
                    ))}
                </div>
                <p className="bd-sub">{TABS.find(t => t.key === tab)?.blurb}</p>

                <div className="bd-fields">
                    {tab !== 'leave' && (
                        <div className="bd-field">
                            <label htmlFor="s-project">Project</label>
                            <select id="s-project" value={form.project} onChange={e => set('project', e.target.value)}>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        </div>
                    )}

                    {tab === 'quote' && (
                        <div className="bd-field">
                            <label htmlFor="s-date">Date you want to promise</label>
                            <input id="s-date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                        </div>
                    )}

                    {tab === 'people' && (
                        <>
                            <div className="bd-field">
                                <label htmlFor="s-person">Who would you add</label>
                                <select id="s-person" value={form.person} onChange={e => set('person', e.target.value)}>
                                    <option value="">Choose…</option>
                                    {(meta?.employees || []).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} · {p.jobTitle}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="bd-field">
                                <label htmlFor="s-horizon">Over how many days</label>
                                <input id="s-horizon" type="number" min="7" value={form.horizonDays}
                                    onChange={e => set('horizonDays', e.target.value)} />
                            </div>
                        </>
                    )}

                    {tab === 'leave' && (
                        <>
                            <div className="bd-field">
                                <label htmlFor="s-lperson">Who is asking</label>
                                <select id="s-lperson" value={form.leavePerson} onChange={e => set('leavePerson', e.target.value)}>
                                    <option value="">Choose…</option>
                                    {(meta?.employees || []).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} · {p.department}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="bd-field">
                                <label htmlFor="s-from">From</label>
                                <input id="s-from" type="date" value={form.from} onChange={e => set('from', e.target.value)} />
                            </div>
                            <div className="bd-field">
                                <label htmlFor="s-to">To</label>
                                <input id="s-to" type="date" value={form.to} onChange={e => set('to', e.target.value)} />
                            </div>
                        </>
                    )}
                </div>

                <button className="bd-btn" style={{ marginTop: 12 }} disabled={!canRun || busy} onClick={run}>
                    <Icon name="check" size={13} /> {busy ? 'Working it out…' : 'Show me the consequence'}
                </button>
            </section>

            {/* 1. */}
            {tab === 'quote' && quote && (
                <>
                    <section className={`bd-hero ${quote.verdict === 'unrealistic' ? 'over' : ''}`}>
                        <span className="h-eyebrow">{quote.project.title} · delivering {formatDate(quote.promised)}</span>
                        <div className="h-main">
                            <div>
                                <div className="h-num">{money(quote.margin, quote.currency)}</div>
                                <div className="h-range">
                                    margin · {quote.marginPercent}% of {money(quote.valueAtDelivery, quote.currency)} billed
                                </div>
                            </div>
                            <span className={`h-verdict ${quote.verdict === 'unrealistic' ? 'over' : quote.verdict === 'compressed' ? 'watch' : ''}`}>
                                {quote.verdict === 'achievable' ? 'Date is achievable'
                                    : quote.verdict === 'compressed' ? 'Needs compression'
                                        : quote.verdict === 'unrealistic' ? 'Not realistic' : 'Unknown'}
                            </span>
                            <div className="h-stats">
                                <div className="h-stat">
                                    <span className="s-n">{quote.daysNeeded ?? '—'}</span>
                                    <span className="s-l">Working days needed</span>
                                </div>
                                <div className="h-stat">
                                    <span className="s-n">{quote.daysAvailable}</span>
                                    <span className="s-l">Working days available</span>
                                </div>
                                <div className="h-stat">
                                    <span className="s-n">{money(quote.totalCost, quote.currency, { compact: true })}</span>
                                    <span className="s-l">Cost to deliver</span>
                                </div>
                                <div className="h-stat">
                                    <span className="s-n">{quote.compression ?? '—'}×</span>
                                    <span className="s-l">Pace required vs today</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-foot">
                            Left alone this finishes around <b>{formatDate(quote.naturalFinish)}</b>.
                            {quote.compressionCost > 0
                                ? ` Hitting ${formatDate(quote.promised)} instead costs an extra ${money(quote.compressionCost, quote.currency)} in compression, straight out of margin.`
                                : ' The promised date is inside the team\'s current pace, so no compression premium applies.'}
                        </div>
                    </section>

                    <section className="bd-card s12">
                        <div className="bd-lbl"><span>How this was worked out</span></div>
                        {quote.assumptions.map((line, i) => (
                            <p className="bd-sub" key={i} style={{ marginTop: 6 }}>· {line}</p>
                        ))}
                    </section>
                </>
            )}

            {/* 2. */}
            {tab === 'people' && staffing && (
                <>
                    <section className={`bd-hero ${staffing.verdict === 'makes_it_later' ? 'over' : ''}`}>
                        <span className="h-eyebrow">
                            Adding {staffing.person.name} to {staffing.project.title} for {staffing.horizonDays} days
                        </span>
                        <div className="h-main">
                            <div>
                                <div className="h-num">
                                    {staffing.daysSaved > 0 ? `${staffing.daysSaved} days` : staffing.daysSaved === 0 ? 'No change' : `+${Math.abs(staffing.daysSaved)} days`}
                                </div>
                                <div className="h-range">
                                    {staffing.daysSaved > 0 ? 'sooner' : staffing.daysSaved === 0 ? 'to the finish date' : 'later'}
                                    {' · '}finish {staffing.daysBefore} → {staffing.daysAfter} days
                                </div>
                            </div>
                            <span className={`h-verdict ${staffing.verdict === 'makes_it_later' ? 'over' : staffing.verdict === 'marginal' ? 'watch' : ''}`}>
                                {{ helps: 'Worth doing', marginal: 'Marginal', makes_it_later: 'Makes it later', unknown: 'Unknown' }[staffing.verdict]}
                            </span>
                            <div className="h-stats">
                                <div className="h-stat">
                                    <span className="s-n">{staffing.addedHours}h</span>
                                    <span className="s-l">They contribute, after ramp-up</span>
                                </div>
                                <div className="h-stat alert">
                                    <span className="s-n">−{staffing.lostHours}h</span>
                                    <span className="s-l">Lost by the team onboarding them</span>
                                </div>
                                <div className="h-stat">
                                    <span className="s-n">{staffing.netHours}h</span>
                                    <span className="s-l">Net gain</span>
                                </div>
                                <div className="h-stat">
                                    <span className="s-n">{money(staffing.netExtraCost, staffing.currency)}</span>
                                    <span className="s-l">Extra cost, net of work displaced</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-foot">
                            {staffing.netExtraCost <= 0
                                ? <>At {money(staffing.costRate, staffing.currency)}/hour they are <b>cheaper than this project's blended rate</b>, so the work they absorb costs less than it does today — the extra spend is effectively nil.</>
                                : <>Each day saved costs about <b>{money(staffing.costPerDaySaved, staffing.currency)}</b>. Worth it if the deadline is worth that; not otherwise.</>}
                        </div>
                    </section>

                    <section className="bd-card s12">
                        <div className="bd-lbl"><span>The assumptions this rests on</span></div>
                        <p className="bd-sub">
                            "Adding people to a late project makes it later" is quoted constantly and calculated
                            almost never. These are the two costs that make it true — shown so you can disagree with them.
                        </p>
                        {staffing.assumptions.map((line, i) => (
                            <p className="bd-sub" key={i} style={{ marginTop: 6 }}>· {line}</p>
                        ))}
                    </section>
                </>
            )}

            {/* 3. */}
            {tab === 'leave' && leave && (
                <>
                    <section className={`bd-hero ${leave.verdict === 'at_risk' ? 'over' : ''}`}>
                        <span className="h-eyebrow">
                            {leave.person.name} · {formatDate(leave.from)} to {formatDate(leave.to)}
                        </span>
                        <div className="h-main">
                            <div>
                                <div className="h-num">{leave.daysOff} days</div>
                                <div className="h-range">
                                    at {leave.perWorkingDay}h a working day · {leave.projects.length} project{leave.projects.length === 1 ? '' : 's'} affected
                                </div>
                            </div>
                            <span className={`h-verdict ${leave.verdict === 'at_risk' ? 'over' : leave.verdict === 'reassign_first' ? 'watch' : ''}`}>
                                {{ clear: 'Safe to approve', reassign_first: 'Reassign first', at_risk: 'Deadline at risk' }[leave.verdict]}
                            </span>
                            <div className="h-stats">
                                <div className="h-stat">
                                    <span className="s-n">{leave.recentHours}h</span>
                                    <span className="s-l">Logged in the last {leave.windowDays} days</span>
                                </div>
                                <div className="h-stat">
                                    <span className="s-n">{leave.dueDuring.length}</span>
                                    <span className="s-l">Of their tasks due while away</span>
                                </div>
                                <div className="h-stat">
                                    <span className="s-n">{leave.clashes.length}</span>
                                    <span className="s-l">Others already off then</span>
                                </div>
                                <div className="h-stat">
                                    <span className="s-n">{leave.projects.filter(p => p.missesDeadline).length}</span>
                                    <span className="s-l">Deadlines that would slip</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bd-card s7">
                        <div className="bd-lbl"><span>What slows down</span></div>
                        {leave.projects.length === 0
                            ? <p className="bd-state">They have logged no project time recently, so nothing slips.</p>
                            : leave.projects.map(project => (
                                <div className={`bd-note ${project.missesDeadline ? 'bad' : 'info'}`} key={project.id}>
                                    <span className="n-h">
                                        {project.title}
                                        {project.missesDeadline && <span className="bd-pill rose" style={{ marginLeft: 8 }}>misses its date</span>}
                                    </span>
                                    <span className="n-d">
                                        {project.shareOfTheirTime}% of their recent time goes here. Losing {project.hoursLost}h
                                        moves the finish from about {project.daysBefore} days out to {project.daysAfter}
                                        {project.slip > 0 ? ` — a slip of ${project.slip} days` : ''}
                                        {project.dueDate ? `, against a due date of ${formatDate(project.dueDate)}.` : '.'}
                                    </span>
                                </div>
                            ))}

                        {leave.dueDuring.length > 0 && (
                            <>
                                <div className="bd-lbl" style={{ marginTop: 16 }}><span>Their work falling due while away</span></div>
                                {leave.dueDuring.map(task => (
                                    <div className="bd-row" key={task.id}>
                                        <span className="r-b">
                                            <span className="r-t">{task.title}</span>
                                            <span className="r-s">due {formatDate(task.dueDate)}</span>
                                        </span>
                                        <span className="r-r"><span className="bd-pill gold">{task.priority}</span></span>
                                    </div>
                                ))}
                            </>
                        )}
                    </section>

                    <section className="bd-card s5">
                        <div className="bd-lbl">
                            <span>Other leave in that window</span>
                            <span className="bd-pill plain">{leave.clashes.length}</span>
                        </div>
                        <p className="bd-sub">
                            Two absences that are each fine can be a problem together. Leave requests do not record
                            which employee they belong to, so these can be counted but not attributed to a person
                            or checked against a team.
                        </p>
                        {leave.clashes.length === 0
                            ? <p className="bd-state">No other leave booked in that window.</p>
                            : leave.clashes.map(clash => (
                                <div className="bd-row" key={clash.id}>
                                    <span className="r-b">
                                        <span className="r-t">
                                            {clash.leaveType}
                                            <span className="bd-pill plain">{clash.status}</span>
                                        </span>
                                        <span className="r-s">
                                            {formatDate(clash.from)} – {formatDate(clash.to)}
                                            {clash.replacement ? ` · cover: ${clash.replacement}` : ''}
                                        </span>
                                    </span>
                                </div>
                            ))}

                        <div className="bd-lbl" style={{ marginTop: 16 }}><span>How this was worked out</span></div>
                        {leave.assumptions.map((line, i) => (
                            <p className="bd-sub" key={i} style={{ marginTop: 6 }}>· {line}</p>
                        ))}
                    </section>
                </>
            )}
        </div>
    )
}
