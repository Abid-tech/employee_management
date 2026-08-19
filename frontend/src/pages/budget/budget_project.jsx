import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { budgetApi } from '../../lib/budget_api'
import { formatDate, money, shortDate } from './budget_format'
import { Avatar, BurnChart, ForecastBar, Icon, Note } from './budget_ui'

// One project's money, in the order a manager reads it: where it is heading,
// what changed, then the evidence.
//
// The two evidence panels — who the money went on, and the ledger itself — both
// open. A name and a total answer "who cost the most"; they cannot answer "doing
// what, at what rate, and how much of it was billable", which is the question
// that follows every single time.

const RATE_SOURCE = {
    entry: 'A rate was agreed on this entry itself, so it overrides both the project rate and the person\'s own.',
    project: 'The project sets its own flat rate, which overrides the person\'s card rate.',
    employee: 'The person\'s own rate, as it stood on the day the work was done — a later raise does not reach back.',
    none: 'No rate was in force for this person on that date, so the hours are recorded but priced at nothing.'
}

// One person, and what opens underneath them.
function PersonRow({ person, currency }) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <div className={`bd-row expandable ${open ? 'on' : ''}`} role="button" tabIndex={0}
                aria-expanded={open}
                onClick={() => setOpen(v => !v)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v) } }}>
                <Avatar person={person} size="sm" />
                <span className="r-b">
                    <span className="r-t">{person.name}</span>
                    <span className="r-s">{person.hours}h over {person.entries} entries</span>
                </span>
                <span className="r-r">{money(person.cost, currency)}</span>
                <span className="r-chev"><Icon name="right" size={13} /></span>
            </div>

            {open && (
                <div className="bd-drawer">
                    <p className="bd-sub" style={{ marginTop: 0 }}>
                        {person.jobTitle || 'Role not recorded'}{person.department ? ` · ${person.department}` : ''}
                        {' · '}worked {person.daysWorked} day{person.daysWorked === 1 ? '' : 's'} on this,
                        {' '}{formatDate(person.firstWorkedOn)} to {formatDate(person.lastWorkedOn)}.
                    </p>

                    <div className="dr-facts">
                        <div className="dr-fact">
                            <span className="f-n">{money(person.blendedCostRate, currency)}</span>
                            <span className="f-l">An hour, as actually charged here</span>
                        </div>
                        <div className="dr-fact">
                            <span className="f-n">{person.shareOfCost}%</span>
                            <span className="f-l">Of this project's cost ({person.shareOfHours}% of its hours)</span>
                        </div>
                        <div className="dr-fact">
                            <span className="f-n">{money(person.billed, currency)}</span>
                            <span className="f-l">Billed on for their work</span>
                        </div>
                        <div className="dr-fact">
                            <span className="f-n" style={{ color: person.margin >= 0 ? 'var(--b-green)' : 'var(--b-rose)' }}>
                                {money(person.margin, currency)}
                            </span>
                            <span className="f-l">
                                Margin{person.marginPercent === null ? ' · nothing billable' : ` · ${person.marginPercent}%`}
                            </span>
                        </div>
                        <div className="dr-fact">
                            <span className="f-n">{person.billableHours}h</span>
                            <span className="f-l">Billable, against {person.nonBillableHours}h that was not</span>
                        </div>
                    </div>

                    {person.topTasks.length > 0 && (
                        <>
                            <div className="bd-lbl" style={{ marginTop: 14 }}><span>What the hours went on</span></div>
                            {person.topTasks.map(task => (
                                <div className="bd-row" key={task.title}>
                                    <span className="r-b">
                                        <span className="r-t">{task.title}</span>
                                        <span className="r-s">{task.hours}h</span>
                                    </span>
                                    <span className="r-r">{money(task.cost, currency)}</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </>
    )
}

// One line of the ledger. The table row carries the figures; the drawer carries
// what the money was actually spent doing and why it was priced the way it was.
function EntryRow({ entry, currency, columns }) {
    const [open, setOpen] = useState(false)
    const margin = Math.round((entry.billed - entry.cost) * 100) / 100

    return (
        <>
            <tr className={`expandable ${open ? 'on' : ''}`} onClick={() => setOpen(v => !v)}
                tabIndex={0} aria-expanded={open}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v) } }}>
                <td>{shortDate(entry.workedOn)}</td>
                <td style={{ color: 'var(--b-text)' }}>{entry.employeeName}</td>
                <td className="num">{entry.hours}</td>
                <td className="num">{money(entry.costRate, currency)}</td>
                <td className="num">{money(entry.cost, currency)}</td>
                <td className="num">{entry.billed ? money(entry.billed, currency) : '—'}</td>
                <td>
                    <span className={`bd-pill ${entry.rateSource === 'entry' ? 'gold' : 'plain'}`}>
                        {entry.rateSource === 'entry' ? 'entry override'
                            : entry.rateSource === 'project' ? 'project rate'
                                : entry.rateSource === 'employee' ? 'their rate' : 'no rate'}
                    </span>
                </td>
            </tr>

            {open && (
                <tr className="bd-subrow">
                    <td colSpan={columns}>
                        <div className="dr-entry">
                            <div>
                                <div className="bd-lbl"><span>What was worked on</span></div>
                                <p className="bd-sub">
                                    <b style={{ color: 'var(--b-text)' }}>{entry.taskTitle || 'Not attached to a task'}</b>
                                </p>
                                <p className="bd-sub">{entry.note || 'No note was left on this entry.'}</p>
                                <p className="bd-sub">
                                    {formatDate(entry.workedOn)} · {entry.billable ? 'billable to the client' : 'not billable'}
                                    {entry.employeeDepartment ? ` · ${entry.employeeDepartment}` : ''}
                                </p>
                            </div>

                            <div>
                                <div className="bd-lbl"><span>How it was priced</span></div>
                                <p className="bd-sub bd-mono">
                                    {entry.hours}h × {money(entry.costRate, currency)} = {money(entry.cost, currency)} cost
                                </p>
                                <p className="bd-sub bd-mono">
                                    {entry.billable
                                        ? `${entry.hours}h × ${money(entry.billRate, currency)} = ${money(entry.billed, currency)} billed`
                                        : 'nothing billed — this hour was not billable'}
                                </p>
                                <p className="bd-sub bd-mono" style={{ color: margin >= 0 ? 'var(--b-green)' : 'var(--b-rose)' }}>
                                    {money(margin, currency)} margin on this entry
                                </p>
                                <p className="bd-sub">{RATE_SOURCE[entry.rateSource] || RATE_SOURCE.none}</p>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

export default function BudgetProject() {
    const { id } = useParams()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({ totalBudget: '', hardStop: false, thresholds: '' })
    const [saving, setSaving] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const detail = await budgetApi.project(id)
            setData(detail)
            setForm({
                totalBudget: detail.budget?.totalBudget ?? '',
                hardStop: detail.budget?.hardStop ?? false,
                thresholds: (detail.budget?.thresholds || [50, 75, 90, 100]).join(', ')
            })
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [id])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    const save = async () => {
        setSaving(true)
        try {
            await budgetApi.setBudget({
                objective: id,
                totalBudget: Number(form.totalBudget),
                hardStop: form.hardStop,
                thresholds: form.thresholds.split(',').map(t => Number(t.trim())).filter(Boolean)
            })
            setEditing(false)
            await load()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading && !data) {
        return <div className="bd-card s12"><div className="bd-skel" style={{ height: 340 }} /></div>
    }
    if (error && !data) {
        return <><div className="bd-err">{error}</div><Link className="bd-back" to="/budget"><Icon name="left" size={13} /> Back</Link></>
    }

    const { objective, budget, forecast: f, narration, byPerson, series, entries, billed, margin, marginPercent, alerts, totalHours } = data
    const cur = budget?.currency || 'USD'
    const verdict = f.willOverrun ? 'over' : f.couldOverrun ? 'watch' : 'ok'

    return (
        <div className="bd-grid">
            {error && <div className="bd-err s12">{error}</div>}

            <div className="s12">
                <Link className="bd-back" to="/budget"><Icon name="left" size={13} /> All projects</Link>
            </div>

            {/* ---- Forecast hero ---- */}
            <section className={`bd-hero ${verdict === 'over' ? 'over' : ''}`}>
                <span className="h-eyebrow">
                    {objective.title}{objective.client ? ` · ${objective.client}` : ''} · forecast from the last {f.windowDays} days
                </span>

                <div className="h-main">
                    <div>
                        <div className="h-num">{money(f.projected, cur)}</div>
                        <div className="h-range">
                            {money(f.low, cur)} – {money(f.high, cur)} · confidence {f.confidence}
                        </div>
                    </div>

                    <span className={`h-verdict ${verdict === 'over' ? 'over' : verdict === 'watch' ? 'watch' : ''}`}>
                        {verdict === 'over' ? `${money(f.overBy, cur)} over budget`
                            : verdict === 'watch' ? 'Could overrun'
                                : `${money(f.total - f.projected, cur)} headroom`}
                    </span>

                    <div className="h-stats">
                        <div className="h-stat">
                            <span className="s-n">{money(f.spent, cur, { compact: true })}</span>
                            <span className="s-l">Spent of {money(f.total, cur, { compact: true })} ({f.percentUsed}%)</span>
                        </div>
                        <div className="h-stat">
                            <span className="s-n">{money(f.burnPerDay, cur)}</span>
                            <span className="s-l">A day, recently</span>
                        </div>
                        <div className="h-stat">
                            <span className="s-n">{f.remainingHours}h</span>
                            <span className="s-l">Work still outstanding</span>
                        </div>
                        <div className="h-stat">
                            <span className="s-n">{f.daysToFinish ?? '—'}</span>
                            <span className="s-l">Days to finish at this pace</span>
                        </div>
                    </div>
                </div>

                <div className="h-foot">
                    Priced at <b>{money(f.recentBlendedRate, cur)}/hour</b>, the blended rate this project has actually
                    been running at over the last {f.windowDays} days — {f.activeDaysInWindow} of those days had work
                    logged. The range widens with how variable the daily burn has been, currently ±{f.spreadPercent}%.
                </div>
            </section>

            {/* ---- What changed — pushed, not waiting to be asked ---- */}
            <section className="bd-card s7">
                <div className="bd-lbl">
                    <span>What changed</span>
                    <Icon name="alert" size={14} />
                </div>
                <p className="bd-sub">
                    Written from the last fortnight of entries. Nothing here needs to be asked for.
                </p>
                {narration.map((note, i) => <Note note={note} key={i} />)}
            </section>

            {/* ---- Budget config ---- */}
            <section className="bd-card s5">
                <div className="bd-lbl">
                    <span>Budget</span>
                    <button className="bd-btn ghost sm" onClick={() => setEditing(v => !v)}>
                        {editing ? 'Cancel' : 'Edit'}
                    </button>
                </div>

                {editing ? (
                    <>
                        <div className="bd-fields">
                            <div className="bd-field">
                                <label htmlFor="b-total">Total budget</label>
                                <input id="b-total" type="number" min="0" value={form.totalBudget}
                                    onChange={e => setForm(p => ({ ...p, totalBudget: e.target.value }))} />
                            </div>
                            <div className="bd-field">
                                <label htmlFor="b-thresholds">Alert at (%)</label>
                                <input id="b-thresholds" value={form.thresholds}
                                    onChange={e => setForm(p => ({ ...p, thresholds: e.target.value }))} />
                                <span className="bd-hint">Each fires once, not every day.</span>
                            </div>
                        </div>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12, fontSize: 12, color: 'var(--b-soft)' }}>
                            <input type="checkbox" checked={form.hardStop} style={{ marginTop: 2 }}
                                onChange={e => setForm(p => ({ ...p, hardStop: e.target.checked }))} />
                            <span>
                                <b>Stop time logging at the cap.</b> Off by default — refusing to record work
                                somebody genuinely did makes the ledger wrong, which is usually worse than an overrun.
                            </span>
                        </label>
                        <button className="bd-btn" style={{ marginTop: 12 }} disabled={saving} onClick={save}>
                            <Icon name="check" size={13} /> {saving ? 'Saving…' : 'Save budget'}
                        </button>
                    </>
                ) : (
                    <>
                        <div style={{ marginTop: 10 }}>
                            <div className="bd-row"><span className="r-b"><span className="r-t">Total budget</span></span><span className="r-r">{money(f.total, cur)}</span></div>
                            <div className="bd-row"><span className="r-b"><span className="r-t">Billed to client</span></span><span className="r-r">{money(billed, cur)}</span></div>
                            <div className="bd-row">
                                <span className="r-b">
                                    <span className="r-t">Margin</span>
                                    <span className="r-s">what was charged, less what it cost</span>
                                </span>
                                <span className="r-r" style={{ color: margin >= 0 ? 'var(--b-green)' : 'var(--b-rose)' }}>
                                    {money(margin, cur)}{marginPercent !== null ? ` · ${marginPercent}%` : ''}
                                </span>
                            </div>
                            <div className="bd-row"><span className="r-b"><span className="r-t">Hours logged</span></span><span className="r-r">{totalHours}h</span></div>
                        </div>

                        <div className="bd-lbl" style={{ marginTop: 16 }}><span>Alert thresholds</span></div>
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>
                            {(budget?.thresholds || []).map(t => {
                                const crossed = alerts.crossed.includes(t)
                                return (
                                    <span key={t} className={`bd-pill ${crossed ? 'rose' : 'plain'}`}>
                                        {t}%{crossed ? ' · passed' : ''}
                                    </span>
                                )
                            })}
                        </div>
                        {budget?.hardStop && (
                            <p className="bd-hint" style={{ marginTop: 10 }}>
                                Time logging stops once this project reaches its cap.
                            </p>
                        )}
                    </>
                )}
            </section>

            {/* ---- Burn ---- */}
            <section className="bd-card s7">
                <div className="bd-lbl"><span>Cumulative spend</span><span className="bd-pill plain">{series.length} days with work</span></div>
                <p className="bd-sub">The slope is the burn rate. A curve that steepens is a project changing pace.</p>
                <BurnChart series={series} total={f.total} projected={f.projected} currency={cur} />
                <ForecastBar spent={f.spent} projected={f.projected} low={f.low} high={f.high} total={f.total} currency={cur} />
            </section>

            {/* ---- Who ---- */}
            <section className="bd-card s5">
                <div className="bd-lbl"><span>Where the money went</span><Icon name="users" size={14} /></div>
                <p className="bd-sub">Open a name for their rate here, what was billable, and what the hours went on.</p>
                <div style={{ marginTop: 8 }}>
                    {byPerson.map(person => (
                        <PersonRow person={person} currency={cur} key={person.id} />
                    ))}
                </div>
            </section>

            {/* ---- Entries ---- */}
            <section className="bd-card s12">
                <div className="bd-lbl"><span>Recent time entries</span><span className="bd-pill plain">{data.entryCount} total</span></div>
                <p className="bd-sub">Open a row for the task it was logged against, the note, and the arithmetic that priced it.</p>
                <div className="bd-tablewrap">
                    <table className="bd-table">
                        <thead>
                            <tr>
                                <th>Date</th><th>Who</th><th>Hours</th>
                                <th>Cost rate</th><th>Cost</th><th>Billed</th><th>Rate from</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(entry => (
                                <EntryRow entry={entry} currency={cur} columns={7} key={entry.id} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}
