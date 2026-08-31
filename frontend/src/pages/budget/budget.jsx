import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { budgetApi } from '../../lib/budget_api'
import { money } from './budget_format'
import { ForecastBar, Icon, Note } from './budget_ui'

// The portfolio, led by where each project is heading.

// The four drill-downs behind the headline stats.
const DRILLS = {
    spent: {
        title: 'Where the money has gone',
        note: 'Cost already recorded in the ledger, largest first. The share is of total spend across the portfolio; the percentage underneath is against that project\'s own budget.',
        rows: (rows, totals) => rows
            .slice()
            .sort((a, b) => b.forecast.spent - a.forecast.spent)
            .map(row => ({
                row,
                fraction: totals.spent > 0 ? row.forecast.spent / totals.spent : 0,
                value: money(row.forecast.spent, row.budget?.currency),
                sub: `${row.forecast.percentUsed}% of its ${money(row.forecast.total, row.budget?.currency)} budget`
                    + ` · ${row.totalHours}h over ${row.entryCount} entries`
            })),
        empty: 'Nothing has been logged against a budget yet.'
    },

    margin: {
        title: 'Margin, project by project',
        note: 'What was charged to the client, less what the hours cost. Internal projects bill nothing, so they sit at a negative margin by design — that is the cost of the work, not a loss.',
        rows: (rows) => {
            const widest = Math.max(1, ...rows.map(r => Math.abs(r.margin)))
            return rows
                .slice()
                .sort((a, b) => b.margin - a.margin)
                .map(row => ({
                    row,
                    fraction: Math.abs(row.margin) / widest,
                    negative: row.margin < 0,
                    value: money(row.margin, row.budget?.currency),
                    sub: `${money(row.billed, row.budget?.currency)} billed − ${money(row.forecast.spent, row.budget?.currency)} cost`
                        + (row.marginPercent === null ? ' · nothing billable' : ` · ${row.marginPercent}%`)
                }))
        },
        empty: 'No billable work recorded yet.'
    },

    over: {
        title: 'Forecast to finish over budget',
        note: 'The central forecast — spend so far plus the outstanding work priced at the last fortnight\'s pace — already lands above the committed budget on these.',
        rows: (rows) => rows
            .filter(r => r.forecast.willOverrun)
            .sort((a, b) => b.forecast.overBy - a.forecast.overBy)
            .map(row => ({
                row,
                fraction: row.forecast.total > 0 ? Math.min(1, row.forecast.projected / (row.forecast.total * 1.5)) : 0,
                negative: true,
                value: `${money(row.forecast.overBy, row.budget?.currency)} over`,
                sub: `trending ${money(row.forecast.projected, row.budget?.currency)} against ${money(row.forecast.total, row.budget?.currency)}`
                    + ` · ${row.forecast.remainingHours}h left at ${money(row.forecast.burnPerDay, row.budget?.currency)}/day`
                    + (row.forecast.daysToFinish ? ` · ~${row.forecast.daysToFinish} days to finish` : '')
            })),
        empty: 'No project is forecast to finish over its budget.'
    },

    watch: {
        title: 'Could go either way',
        note: 'The central forecast sits inside budget, but the top of the confidence range does not. These are the projects a fortnight of bad luck would tip over — not predictions of failure.',
        rows: (rows) => rows
            .filter(r => r.forecast.couldOverrun)
            .sort((a, b) => b.forecast.high - a.forecast.high)
            .map(row => ({
                row,
                fraction: row.forecast.total > 0 ? Math.min(1, row.forecast.high / row.forecast.total) : 0,
                value: `${money(row.forecast.high, row.budget?.currency)} worst case`,
                sub: `trending ${money(row.forecast.projected, row.budget?.currency)} against ${money(row.forecast.total, row.budget?.currency)}`
                    + ` · range ±${row.forecast.spreadPercent}% · confidence ${row.forecast.confidence}`
            })),
        empty: 'No project is close enough to its budget to be in doubt.'
    }
}

// The panel that opens under the headline.
function Drill({ kind, rows, totals, onClose }) {
    const spec = DRILLS[kind]
    if (!spec) return null

    const items = spec.rows(rows, totals)

    return (
        <div className="h-drill">
            <div className="d-top">
                <span className="d-title">{spec.title}</span>
                <button className="d-close" onClick={onClose}>Close</button>
            </div>
            <p className="d-note">{spec.note}</p>

            {items.length === 0
                ? <p className="d-empty">{spec.empty}</p>
                : (
                    <div className="d-rows">
                        {items.map(item => (
                            <Link className="d-row" key={item.row.objective.id}
                                to={`/budget/project/${item.row.objective.id}`}>
                                <span className="d-name">
                                    {item.row.objective.title}
                                    <small>{item.sub}</small>
                                </span>
                                <span className="d-bar">
                                    <i className={item.negative ? 'neg' : ''}
                                        style={{ width: `${Math.max(2, item.fraction * 100)}%` }} />
                                </span>
                                <span className="d-val">{item.value}</span>
                            </Link>
                        ))}
                    </div>
                )}
        </div>
    )
}

export default function Budget() {
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [drill, setDrill] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await budgetApi.portfolio())
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    if (loading && !data) {
        return (
            <div className="bd-grid">
                <div className="bd-card s12"><div className="bd-skel" style={{ height: 130 }} /></div>
                <div className="bd-card s12"><div className="bd-skel" style={{ height: 260 }} /></div>
            </div>
        )
    }

    if (error && !data) {
        return <><div className="bd-err">{error}</div><button className="bd-btn" onClick={load}>Try again</button></>
    }

    const { rows, totals, windowDays } = data
    const currency = rows[0]?.budget?.currency || 'USD'
    const portfolioOver = totals.projected > totals.budget

    const toggle = (key) => setDrill(current => (current === key ? '' : key))

    const stat = (key, value, label) => (
        <button type="button" className={`h-stat ${drill === key ? 'on' : ''}`}
            aria-expanded={drill === key} onClick={() => toggle(key)}>
            <span className="s-n">{value}</span>
            <span className="s-l">{label}</span>
            <span className="s-more">{drill === key ? 'Hide' : 'Break it down'}</span>
        </button>
    )

    return (
        <div className="bd-grid">
            {error && <div className="bd-err s12">{error}</div>}

            {/* Portfolio headline. */}
            <section className={`bd-hero ${portfolioOver ? 'over' : ''}`}>
                <span className="h-eyebrow">All projects · forecast from the last {windowDays} days</span>

                <div className="h-main">
                    <div>
                        <div className="h-num">{money(totals.projected, currency)}</div>
                        <div className="h-range">
                            trending, against {money(totals.budget, currency)} committed
                        </div>
                    </div>
                    <span className={`h-verdict ${portfolioOver ? 'over' : ''}`}>
                        {portfolioOver
                            ? `${money(totals.projected - totals.budget, currency)} over`
                            : `${money(totals.budget - totals.projected, currency)} headroom`}
                    </span>

                    {/* Each of these is a sum. */}
                    <div className="h-stats">
                        {stat('spent', money(totals.spent, currency, { compact: true }), 'Spent so far')}
                        {stat('margin', money(totals.margin, currency, { compact: true }), 'Margin on billable work')}
                        {stat('over', totals.atRisk, 'Forecast to overrun')}
                        {stat('watch', totals.watch, 'Could go either way')}
                    </div>
                </div>

                {drill && <Drill kind={drill} rows={rows} totals={totals} onClose={() => setDrill('')} />}

                <div className="h-foot">
                    Every figure here is built from the last <b>{windowDays} days</b> of logged time, not the
                    lifetime average — a project can look calm on average while a recent spike has already
                    decided the outcome.
                </div>
            </section>

            {/* One card per project. */}
            {rows.length === 0 && (
                <section className="bd-card s12">
                    <p className="bd-state">No project has a budget set yet.</p>
                </section>
            )}

            {rows.map(row => {
                const f = row.forecast
                const cur = row.budget?.currency || 'USD'
                const verdict = f.willOverrun ? 'over' : f.couldOverrun ? 'watch' : 'ok'
                const href = `/budget/project/${row.objective.id}`
                const open = () => navigate(href)

                return (
                    // The whole card is the target.
                    <section className="bd-card s6 clickable" key={row.objective.id}
                        role="link" tabIndex={0}
                        aria-label={`Open ${row.objective.title}`}
                        onClick={open}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() }
                        }}>
                        <div className="bd-lbl">
                            <span>{row.objective.title}</span>
                            <span className={`bd-pill ${verdict === 'over' ? 'rose' : verdict === 'watch' ? 'gold' : 'green'}`}>
                                {verdict === 'over' ? 'Forecast overrun' : verdict === 'watch' ? 'Watch' : 'On track'}
                            </span>
                        </div>

                        {/* The prediction, first. */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.035em' }}>
                                {money(f.projected, cur)}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--b-muted)' }}>trending to finish</span>
                        </div>
                        <div className="bd-mono" style={{ fontSize: 12, color: 'var(--b-soft)', marginTop: 2 }}>
                            somewhere between {money(f.low, cur)} and {money(f.high, cur)}
                            <span style={{ color: 'var(--b-muted)' }}> · confidence {f.confidence}</span>
                        </div>

                        <ForecastBar
                            spent={f.spent} projected={f.projected} low={f.low} high={f.high}
                            total={f.total} currency={cur}
                        />

                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14, fontSize: 11.5, color: 'var(--b-muted)' }}>
                            <span><b className="bd-mono" style={{ color: 'var(--b-text)' }}>{f.percentUsed}%</b> used</span>
                            <span><b className="bd-mono" style={{ color: 'var(--b-text)' }}>{money(f.burnPerDay, cur)}</b>/day</span>
                            <span><b className="bd-mono" style={{ color: 'var(--b-text)' }}>{f.remainingHours}h</b> left</span>
                            {f.daysToFinish && <span>~<b className="bd-mono" style={{ color: 'var(--b-text)' }}>{f.daysToFinish}</b> days to finish</span>}
                        </div>

                        {/* The nudge, inline — not buried in a report nobody opens. */}
                        <Note note={row.topNote} />

                        <Link className="bd-btn ghost sm" to={href} style={{ marginTop: 12 }}
                            onClick={e => e.stopPropagation()}>
                            Open the detail <Icon name="right" size={12} />
                        </Link>
                    </section>
                )
            })}
        </div>
    )
}
