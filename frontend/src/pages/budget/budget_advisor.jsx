import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { budgetApi } from '../../lib/budget_api'
import { money } from './budget_format'
import { Icon } from './budget_ui'

// What went wrong, and what to budget differently next time.
//
// The forecast page answers "where is this heading". It cannot answer "why do
// our budgets keep being wrong", and that is the question that changes the next
// one. So this page is deliberately split in two: a post-mortem with money
// attributed to a cause, and guidance expressed as a number a manager can put
// straight into a budget.
//
// The estimator at the bottom is the point of the whole thing. Everything above
// it is analysis; that is the part you can act on.

const round = (n) => Math.round(n)
const SEVERITY = { high: 'Do first', medium: 'Worth doing', low: 'Minor' }
const ICON_FOR = { calibrate: 'trend', rate_mix: 'users', timing: 'clock', overrun: 'alert', leak: 'coin' }

// The figure a card leads with. Kept as a component so a percentage, a sum and
// a plain count all get the same typographic weight — the eye should not have to
// work out which of three cards is the important one from the wording.
function Metric({ metric, currency }) {
    if (!metric) return null

    const text = metric.unit === 'money'
        ? money(metric.value, currency, { compact: Math.abs(metric.value) >= 10000 })
        : metric.unit === '%'
            ? `${metric.prefix || ''}${Math.round(metric.value)}%`
            : `${metric.value}`

    return (
        <>
            <span className="s-metric">{text}</span>
            <span className="s-unit">{metric.label}</span>
        </>
    )
}

// One suggestion. The reasoning is there but folded away — it is what you read
// when you have decided to act, not what you skim to decide.
function Suggestion({ finding, currency, tone }) {
    const [open, setOpen] = useState(false)

    return (
        <div className={`bd-sug ${tone || finding.severity}`}>
            <div className="s-top">
                <span className="s-ic"><Icon name={ICON_FOR[finding.kind] || 'trend'} size={15} /></span>
                <span className="s-when">{SEVERITY[finding.severity]}</span>
            </div>

            <Metric metric={finding.metric} currency={currency} />
            <span className="s-head">{finding.headline}</span>

            <button className="s-why" onClick={() => setOpen(v => !v)}>
                {open ? 'Hide the working' : 'Why · show the working'}
            </button>
            {open && <span className="s-detail">{finding.detail}</span>}
        </div>
    )
}

// What a correction factor is actually made of.
//
// "Design estimates land at 1.06×" is a claim about twenty finished tasks. Shown
// on its own it has to be believed; shown with the tasks, the counts and the
// hours behind it, it can be checked — and an estimator that can be checked is
// the only kind that gets used twice.
function DeptFacts({ row, minSample }) {
    const budgetFor100 = Math.round((row.correction || 1) * 100)

    return (
        <div className="dr-facts-wrap">
            <p className="bd-sub" style={{ marginTop: 0 }}>
                Across <b style={{ color: 'inherit' }}>{row.sample}</b> finished {row.department} tasks the median
                came in at {row.medianRatio}× the estimate
                {row.direction === 'under'
                    ? `, so 100 estimated hours should be budgeted as ${budgetFor100}.`
                    : row.direction === 'over'
                        ? `, so these estimates carry roughly ${100 - budgetFor100}% of padding.`
                        : ', which is as close to honest as estimates get.'}
                {' '}The worst tenth reached {row.p90Ratio}× — that tail is what contingency is for, not the base.
            </p>

            <div className="dr-facts">
                <div className="dr-fact">
                    <span className="f-n">{row.ranOver}</span>
                    <span className="f-l">Ran over by more than 15%</span>
                </div>
                <div className="dr-fact">
                    <span className="f-n">{row.onTarget}</span>
                    <span className="f-l">Landed within 15% either way</span>
                </div>
                <div className="dr-fact">
                    <span className="f-n">{row.ranUnder}</span>
                    <span className="f-l">Came in more than 15% under</span>
                </div>
                <div className="dr-fact">
                    <span className="f-n">{row.estimatedHours}h</span>
                    <span className="f-l">Estimated in total, against {row.spentHours}h spent</span>
                </div>
                <div className="dr-fact">
                    <span className="f-n">{row.bestRatio}×–{row.worstRatio}×</span>
                    <span className="f-l">Best and worst single task</span>
                </div>
            </div>

            {row.examples?.length > 0 && (
                <>
                    <div className="bd-lbl" style={{ marginTop: 14 }}><span>The tasks that stretched furthest</span></div>
                    {row.examples.map(task => (
                        <div className="bd-row" key={task.id}>
                            <span className="r-b">
                                <span className="r-t">{task.title}</span>
                                <span className="r-s">
                                    {task.estimateHours}h estimated · {task.spentHours}h spent
                                    {task.priority ? ` · ${task.priority} priority` : ''}
                                </span>
                            </span>
                            <span className="r-r">{task.ratio}×</span>
                        </div>
                    ))}
                </>
            )}

            {!row.enough && (
                <p className="bd-sub">
                    Fewer than {minSample} finished tasks, so this is reported but not acted on anywhere —
                    below that a pattern is an anecdote.
                </p>
            )}
        </div>
    )
}

// Estimate accuracy as a shape rather than a column of decimals. Right of the
// centre line means budgets built from those estimates start short; left means
// padding. The dashed tail is the worst tenth — the case contingency is for.
//
// Each bar opens onto the tasks it was measured from.
function Calibration({ rows, minSample }) {
    const [open, setOpen] = useState('')
    // Scaled to the spread that is actually here, not to a fixed 0.5x-1.5x
    // domain. Real estimate bias sits between about 0.8x and 1.2x, so a fixed
    // domain drew every bar two pixels wide and the chart said nothing. The
    // widest bar takes 42% of its half and the rest are proportional to it, with
    // the true ratios printed on the right so the scale is never guessed at.
    const deltas = rows.map(r => Math.abs((r.medianRatio || 1) - 1))
    const widest = Math.max(0.05, ...deltas)
    const half = 42 / widest

    return (
        <div className="bd-cal">
            {rows.map(row => {
                const delta = row.medianRatio - 1
                const width = Math.min(48, Math.abs(delta) * half)
                const tail = Math.min(49, Math.abs((row.p90Ratio || 1) - 1) * half)
                const tone = !row.enough ? 'close' : row.direction === 'under' ? 'under' : row.direction === 'over' ? 'over' : 'close'

                const isOpen = open === row.department

                return (
                    <div key={row.department}>
                        <button type="button" className={`c-row ${isOpen ? 'on' : ''}`}
                            aria-expanded={isOpen}
                            onClick={() => setOpen(current => (current === row.department ? '' : row.department))}>
                            <span className="c-name">
                                {row.department}
                                <small>{row.sample} finished{row.enough ? '' : ' · too few'}</small>
                            </span>

                            <span className="c-track">
                                {row.p90Ratio > 1 && (
                                    <span className="c-tail" style={{ left: '50%', width: `${tail}%` }} />
                                )}
                                <span className={`c-fill ${tone}`} style={
                                    delta >= 0
                                        ? { left: '50%', width: `${width}%` }
                                        : { right: '50%', width: `${width}%` }
                                } />
                                <span className="c-mid" />
                            </span>

                            <span className="c-val">
                                {row.medianRatio}×
                                <small>{row.overrunRate}% over</small>
                            </span>
                        </button>

                        {isOpen && (
                            <div className="bd-drawer">
                                <DeptFacts row={row} minSample={minSample} />
                            </div>
                        )}
                    </div>
                )
            })}
            <div className="c-scale">
                <span>{round((1 - widest) * 100) / 100}× padded</span>
                <span>1.0× on the money</span>
                <span>{round((1 + widest) * 100) / 100}× runs over</span>
            </div>
        </div>
    )
}

// One project's row in the post-mortem table, and everything the six columns
// had to leave out.
function ProjectRow({ project, currency, columns }) {
    const [open, setOpen] = useState(false)
    const shape = project.shape
    const rate = project.rateEfficiency
    const leak = project.leak

    return (
        <>
            <tr className={`expandable ${open ? 'on' : ''}`} tabIndex={0} aria-expanded={open}
                onClick={() => setOpen(v => !v)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v) } }}>
                <td style={{ color: 'var(--b-text)' }}>{project.title}</td>
                <td className="num" style={{ color: project.overrun ? 'var(--b-rose)' : 'inherit' }}>
                    {project.percentUsed}%
                </td>
                <td className="num">{project.marginPercent === null ? '—' : `${project.marginPercent}%`}</td>
                <td>
                    {project.worstEstimates[0]
                        ? <span>{project.worstEstimates[0].ratio}× · {money(project.worstEstimates[0].overCost, currency)}</span>
                        : '—'}
                </td>
                <td className="num">
                    {shape ? `${shape.lastQuarterShare}%` : '—'}
                    {shape?.backLoaded && <span className="bd-pill gold" style={{ marginLeft: 6 }}>crunch</span>}
                </td>
                <td className="num">{leak ? `${leak.share}%` : '—'}</td>
            </tr>

            {open && (
                <tr className="bd-subrow">
                    <td colSpan={columns}>
                        <div className="dr-facts">
                            <div className="dr-fact">
                                <span className="f-n">{money(project.spent, currency)}</span>
                                <span className="f-l">Spent of {money(project.totalBudget, currency)}</span>
                            </div>
                            <div className="dr-fact">
                                <span className="f-n" style={{ color: project.overrun ? 'var(--b-rose)' : 'inherit' }}>
                                    {money(project.projected, currency)}
                                </span>
                                <span className="f-l">
                                    {project.overrun ? `Trending — ${money(project.overBy, currency)} over` : 'Trending, inside budget'}
                                </span>
                            </div>
                            {rate && (
                                <div className="dr-fact">
                                    <span className="f-n">{money(rate.avoidable, currency)}</span>
                                    <span className="f-l">
                                        Seniority premium on {rate.hours}h of small or low-priority work
                                    </span>
                                </div>
                            )}
                            {leak && (
                                <div className="dr-fact">
                                    <span className="f-n">{money(leak.cost, currency)}</span>
                                    <span className="f-l">Never billed — {leak.hours}h across {leak.entries} entries</span>
                                </div>
                            )}
                        </div>

                        {shape && (
                            <>
                                <div className="bd-lbl" style={{ marginTop: 14 }}>
                                    <span>When the money was spent</span>
                                    <span className="bd-pill plain">{shape.elapsedDays} days</span>
                                </div>
                                <div className="dr-quarters">
                                    {shape.shares.map((share, i) => (
                                        <div className="q" key={i}>
                                            <span className="q-track">
                                                <i className={i === 3 && shape.backLoaded ? 'hot' : ''}
                                                    style={{ height: `${Math.max(3, share)}%` }} />
                                            </span>
                                            <span className="q-v">{share}%</span>
                                            <span className="q-l">Q{i + 1}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="bd-sub">
                                    An evenly run project spends 25% in each quarter of its life.
                                    {shape.backLoaded
                                        ? ` This one put ${shape.lastQuarterShare}% into the final quarter — the signature of a plan that did not hold, which is a different fault from simply being under-budgeted.`
                                        : shape.frontLoaded
                                            ? ` This one front-loaded ${shape.shares[0]}% into the first quarter.`
                                            : ' This one is close enough to even that the timing is not the problem.'}
                                </p>
                            </>
                        )}

                        {rate && (
                            <p className="bd-sub">
                                {rate.entries} entries at {money(rate.topQuartileRate, currency)}/h or above went on
                                low-priority or sub-four-hour work, costing {money(rate.actualCost, currency)}. At this
                                project's median rate of {money(rate.medianRate, currency)}/h the same hours would have
                                cost {money(rate.atMedianCost, currency)}. The gap is a scheduling accident, not anyone's fault.
                            </p>
                        )}

                        {project.worstEstimates.length > 0 && (
                            <>
                                <div className="bd-lbl" style={{ marginTop: 14 }}><span>The tasks that ran furthest past their estimate</span></div>
                                {project.worstEstimates.map(task => (
                                    <div className="bd-row" key={task.id}>
                                        <span className="r-b">
                                            <span className="r-t">{task.title}</span>
                                            <span className="r-s">
                                                {task.estimateHours}h estimated · {task.spentHours}h spent
                                                {' '}· {task.overHours}h over{task.department ? ` · ${task.department}` : ''}
                                            </span>
                                        </span>
                                        <span className="r-r">{task.ratio}× · {money(task.overCost, currency)}</span>
                                    </div>
                                ))}
                            </>
                        )}

                        <Link className="bd-btn ghost sm" style={{ marginTop: 12 }}
                            to={`/budget/project/${project.id}`} onClick={e => e.stopPropagation()}>
                            Open this project's ledger <Icon name="right" size={12} />
                        </Link>
                    </td>
                </tr>
            )}
        </>
    )
}

export default function BudgetAdvisor() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [plan, setPlan] = useState({})
    const [estimate, setEstimate] = useState(null)
    const [estimating, setEstimating] = useState(false)
    const [heroDept, setHeroDept] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await budgetApi.advisor())
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    const hasPlan = useMemo(
        () => Object.values(plan).some(v => Number(v) > 0),
        [plan]
    )

    const runEstimate = async () => {
        setEstimating(true)
        try {
            const clean = Object.fromEntries(
                Object.entries(plan).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])
            )
            const result = await budgetApi.advisor(clean)
            setEstimate(result.estimator)
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setEstimating(false)
        }
    }

    if (loading && !data) {
        return <div className="bd-card s12"><div className="bd-skel" style={{ height: 340 }} /></div>
    }
    if (error && !data) {
        return <><div className="bd-err">{error}</div><button className="bd-btn" onClick={load}>Try again</button></>
    }

    const { currency, calibration, postMortem, guidance, projects, engine, minSample, tasksAnalysed, projectsReviewed } = data
    const heroRow = calibration.find(c => c.department === heroDept) || null

    return (
        <div className="bd-grid">
            {error && <div className="bd-err s12">{error}</div>}

            {/* ---- Header ---- */}
            <section className="bd-hero">
                <span className="h-eyebrow">Budget advisor · read from {tasksAnalysed} finished tasks across {projectsReviewed} projects</span>

                <div className="h-main">
                    <div>
                        <div className="h-num" style={{ fontSize: 'clamp(30px, 4.5vw, 46px)' }}>
                            {guidance.length} {guidance.length === 1 ? 'change' : 'changes'} worth making
                        </div>
                        <div className="h-range">
                            and {postMortem.length} {postMortem.length === 1 ? 'thing' : 'things'} that went wrong
                        </div>
                    </div>

                    {/* Each of these is a median over a set of finished tasks.
                        Clicking one shows the set. */}
                    <div className="h-stats">
                        {calibration.filter(c => c.enough).slice(0, 4).map(row => (
                            <button type="button" key={row.department}
                                className={`h-stat ${heroDept === row.department ? 'on' : ''}`}
                                aria-expanded={heroDept === row.department}
                                onClick={() => setHeroDept(d => (d === row.department ? '' : row.department))}>
                                <span className="s-n">{row.medianRatio}×</span>
                                <span className="s-l">{row.department} estimates land at</span>
                                <span className="s-more">{heroDept === row.department ? 'Hide' : 'Show the tasks'}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {heroRow && (
                    <div className="h-drill">
                        <div className="d-top">
                            <span className="d-title">{heroRow.department} · how the {heroRow.medianRatio}× was measured</span>
                            <button className="d-close" onClick={() => setHeroDept('')}>Close</button>
                        </div>
                        <DeptFacts row={heroRow} minSample={minSample} />
                    </div>
                )}

                <div className="h-foot">
                    Every finding below is computed from records the system already keeps, and shows the arithmetic
                    that produced it. Nothing is flagged on fewer than <b>{minSample}</b> finished tasks — below that
                    a pattern is an anecdote.
                </div>
            </section>

            {/* ---- The read-back ----------------------------------------------
                Numbers come from the code; only the wording comes from the
                model. It is never asked what the overspend was — a model
                inventing a financial figure is a far worse failure than a
                plainly worded paragraph. */}
            {data.narration && (
                <section className="bd-card s12">
                    <div className="bd-lbl">
                        <span>What the numbers are saying</span>
                        <span className={`bd-pill ${engine === 'rules' ? 'plain' : 'green'}`}>
                            {engine === 'rules' ? 'written by rules' : `written by ${engine}`}
                        </span>
                    </div>

                    <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--b-text)', margin: '12px 0 0' }}>
                        {data.narration.summary}
                    </p>

                    {data.narration.suggestions?.length > 0 && data.narration.suggestions.map((s, i) => (
                        <div className="bd-note good" key={i}>
                            <span className="n-h">{s.headline}</span>
                            <span className="n-d">{s.detail}</span>
                        </div>
                    ))}

                    {engine === 'rules' && (
                        <p className="bd-sub" style={{ marginTop: 12 }}>
                            {data.modelConfigured
                                ? 'The model was unreachable this time, so this was written from the same findings by rule. Nothing below changes.'
                                : 'No GEMINI_API_KEY is set, so this summary is written by rule. Add one to backend/.env and the same findings get written up in prose — the figures are computed either way and do not change.'}
                        </p>
                    )}
                </section>
            )}

            {/* ---- What went wrong ---- */}
            <section className="bd-card s12">
                <div className="bd-lbl">
                    <span>What went wrong</span>
                    <span className="bd-pill rose">{postMortem.length}</span>
                </div>
                <p className="bd-sub">Money attributed to a cause, not just a total that was exceeded.</p>

                {postMortem.length === 0
                    ? <p className="bd-state">No overruns or leaks worth reporting.</p>
                    : (
                        <div className="bd-cards">
                            {postMortem.map((finding, i) => (
                                <Suggestion finding={finding} currency={currency} key={i} />
                            ))}
                        </div>
                    )}
            </section>

            {/* ---- What to do next time ---- */}
            <section className="bd-card s12">
                <div className="bd-lbl">
                    <span>What to do next time</span>
                    <span className="bd-pill green">{guidance.length}</span>
                </div>
                <p className="bd-sub">Each one leads with the figure you would put into the next budget.</p>

                {guidance.length === 0
                    ? <p className="bd-state">Not enough finished work yet to advise on.</p>
                    : (
                        <div className="bd-cards">
                            {guidance.map((finding, i) => (
                                <Suggestion finding={finding} currency={currency} tone={finding.severity === 'low' ? 'low' : 'good'} key={i} />
                            ))}
                        </div>
                    )}
            </section>

            {/* ---- Calibration ---- */}
            <section className="bd-card s6">
                <div className="bd-lbl"><span>How wrong the estimates are</span></div>
                <p className="bd-sub">
                    Hours actually spent against hours estimated, on finished work. Bars to the right of the
                    line are departments whose budgets start short; the dashed tail is their worst tenth.
                </p>

                <Calibration rows={calibration} minSample={minSample} />
            </section>

            {/* ---- The estimator ---- */}
            <section className="bd-card s6">
                <div className="bd-lbl"><span>Budget the next project</span><Icon name="coin" size={14} /></div>
                <p className="bd-sub">
                    Enter the hours you would estimate per department. The correction factors above are applied,
                    and contingency comes from the observed tail rather than a flat percentage.
                </p>

                <div className="bd-fields">
                    {calibration.map(row => (
                        <div className="bd-field" key={row.department}>
                            <label htmlFor={`plan-${row.department}`}>{row.department} hours</label>
                            <input id={`plan-${row.department}`} type="number" min="0" placeholder="0"
                                value={plan[row.department] || ''}
                                onChange={e => setPlan(p => ({ ...p, [row.department]: e.target.value }))} />
                        </div>
                    ))}
                </div>

                <button className="bd-btn" style={{ marginTop: 12 }} disabled={!hasPlan || estimating} onClick={runEstimate}>
                    <Icon name="check" size={13} /> {estimating ? 'Working it out…' : 'What should I budget?'}
                </button>

                {estimate && (
                    <div style={{ marginTop: 18 }}>
                        {/* The recommendation, then the four figures drawn to the
                            same scale so the contingency gap is a distance you can
                            see rather than a subtraction you have to do. */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-.04em', color: 'var(--b-green)' }}>
                                {money(estimate.recommended, currency)}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--b-muted)' }}>is what to commit</span>
                        </div>

                        <div className="bd-ladder">
                            {[
                                { key: 'raw', name: 'Raw estimate', value: estimate.raw },
                                { key: 'expected', name: 'Corrected', value: estimate.expected },
                                { key: 'recommended', name: 'Recommended', value: estimate.recommended, pick: true },
                                { key: 'worst', name: 'A bad run', value: estimate.worstCase }
                            ].map(row => (
                                <div className={`l-row ${row.pick ? 'pick' : ''}`} key={row.key}>
                                    <span className="l-name">{row.name}</span>
                                    <span className="l-track">
                                        <i className={`l-fill ${row.key}`}
                                            style={{ width: `${Math.max(4, (row.value / Math.max(1, estimate.worstCase)) * 100)}%` }} />
                                    </span>
                                    <span className="l-val">{money(row.value, currency)}</span>
                                </div>
                            ))}
                        </div>

                        <p className="bd-sub" style={{ marginTop: 10 }}>
                            The recommendation carries 40% of the gap to a bad run as contingency — enough to
                            survive one department going wrong without tying up budget that could be committed elsewhere.
                        </p>

                        <div className="bd-tablewrap">
                            <table className="bd-table">
                                <thead>
                                    <tr><th>Department</th><th>Hours</th><th>Rate</th><th>Factor</th><th>Expected</th><th>Basis</th></tr>
                                </thead>
                                <tbody>
                                    {estimate.lines.map(line => (
                                        <tr key={line.department}>
                                            <td style={{ color: 'var(--b-text)' }}>{line.department}</td>
                                            <td className="num">{line.hours}</td>
                                            <td className="num">{money(line.rate, currency)}</td>
                                            <td className="num">{line.factor}×</td>
                                            <td className="num" style={{ color: 'var(--b-text)' }}>{money(line.expected, currency)}</td>
                                            <td style={{ fontSize: 11 }}>{line.basis}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            {/* ---- Per project ---- */}
            <section className="bd-card s12">
                <div className="bd-lbl"><span>Where each project's money went astray</span></div>
                <p className="bd-sub">
                    Six figures per project is a summary, not an explanation. Open a row for the tasks, the
                    shape of the spend and the arithmetic behind each column.
                </p>

                <div className="bd-tablewrap">
                    <table className="bd-table">
                        <thead>
                            <tr>
                                <th>Project</th><th>Used</th><th>Margin</th>
                                <th>Worst estimate</th><th>Late-loaded</th><th>Non-billable</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map(project => (
                                <ProjectRow project={project} currency={currency} columns={6} key={project.id} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}
