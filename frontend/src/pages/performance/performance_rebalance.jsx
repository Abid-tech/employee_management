import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { performanceApi } from '../../lib/performance_api'
import { Avatar } from './performance_ui'

// "Move work off them this week" — turned into which work, to whom, at what cost.
//
// The overview already says who is carrying too much. Every performance product
// on the market can say that much. None of them can say what to do about it,
// because the answer needs the load, the demonstrated pace, the rate card and
// the deadlines at the same time, and those four live in four different
// products. They live in one database here.
//
// The page is deliberately willing to say no. Where the company has no slack it
// refuses the move and says so, because a tool that always produces a
// reassignment ends up recommending the overload it was built to prevent.

const VERDICT = {
    resolved: { label: 'Fully relieved', tone: 'mint' },
    partial: { label: 'Partly relieved', tone: 'gold' },
    no_capacity: { label: 'Nobody has capacity', tone: 'rose' },
    nothing_movable: { label: 'Nothing can move', tone: 'rose' },
    nothing_open: { label: 'No open work', tone: 'plain' }
}

// The before/after of one person's queue, drawn to one scale so the relief is a
// distance rather than a subtraction the reader has to do.
function LoadBar({ before, after, ceiling }) {
    const top = Math.max(before || 0, ceiling * 1.15, 1)
    const pct = (v) => Math.min(100, ((v || 0) / top) * 100)

    return (
        <div className="rb-bar">
            <span className="rb-track">
                <i className="rb-before" style={{ width: `${pct(before)}%` }} />
                <i className="rb-after" style={{ width: `${pct(after)}%` }} />
                <i className="rb-cap" style={{ left: `${pct(ceiling)}%` }} />
            </span>
            <span className="rb-key">
                <span><i className="sw before" /> before {before ?? '—'}w</span>
                <span><i className="sw after" /> after {after ?? '—'}w</span>
                <span><i className="sw cap" /> healthy ceiling {ceiling}w</span>
            </span>
        </div>
    )
}

function Plan({ plan, ceiling }) {
    const [open, setOpen] = useState(false)
    const verdict = VERDICT[plan.verdict] || VERDICT.nothing_open
    const saving = plan.costDelta < 0

    return (
        <section className={`p-card s6 rb-plan ${verdict.tone}`}>
            <div className="p-lbl">
                <span>{plan.person.name}</span>
                <span className={`p-pill ${verdict.tone}`}>{verdict.label}</span>
            </div>

            <div className="rb-who">
                <Avatar person={plan.person} size="md" />
                <span className="rb-role">
                    {plan.person.jobTitle} · {plan.person.department}
                    <small>
                        clears about {plan.throughputPerWeek}h a week · flagged {plan.status.replace('_', ' ')}
                    </small>
                </span>
            </div>

            <LoadBar before={plan.before.weeksOfWork} after={plan.after.weeksOfWork} ceiling={ceiling} />

            <div className="rb-figures">
                <div className="rb-fig">
                    <span className="f-n">{plan.movedHours}h</span>
                    <span className="f-l">Moved, of {plan.targetHours}h needed</span>
                </div>
                <div className="rb-fig">
                    <span className="f-n">{plan.before.openHours}h → {plan.after.openHours}h</span>
                    <span className="f-l">Work still owed</span>
                </div>
                <div className="rb-fig">
                    <span className="f-n" style={{ color: saving ? 'var(--p-mint)' : undefined }}>
                        {saving ? '−' : ''}${Math.abs(plan.costDelta).toLocaleString()}
                    </span>
                    <span className="f-l">{saving ? 'Saved — the people with slack cost less' : 'Extra cost of the moves'}</span>
                </div>
            </div>

            {plan.moves.length > 0 && (
                <>
                    <div className="p-lbl" style={{ marginTop: 14 }}><span>Move these</span></div>
                    {plan.moves.map(move => (
                        <div className="rb-move" key={move.task.id}>
                            <span className="m-hours">{move.hours}h</span>
                            <span className="m-body">
                                <Link className="m-title" to={`/tasks/${move.task.id}`}>{move.task.title}</Link>
                                <span className="m-to">
                                    to <b>{move.to.name}</b> · now at {move.to.weeksOfWork}w
                                    {move.to.onThisProject ? ' · already on this project' : ' · new to this project'}
                                </span>
                            </span>
                            <span className={`m-cost ${move.costDelta < 0 ? 'save' : ''}`}>
                                {move.costDelta < 0 ? '−' : '+'}${Math.abs(move.costDelta).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </>
            )}

            {(plan.blocked.length > 0 || plan.immovable.length > 0) && (
                <>
                    <button className="rb-why" onClick={() => setOpen(v => !v)} aria-expanded={open}>
                        {open ? 'Hide what could not move' : `Why ${plan.blocked.length + plan.immovable.length} tasks stayed put`}
                    </button>

                    {open && (
                        <div className="rb-stuck">
                            {plan.blocked.map(task => (
                                <div className="s-row rose" key={task.id}>
                                    <span className="s-t">{task.title} <small>{task.hours}h</small></span>
                                    <span className="s-r">{task.reason}</span>
                                </div>
                            ))}
                            {plan.immovable.map(task => (
                                <div className="s-row" key={task.id}>
                                    <span className="s-t">{task.title}</span>
                                    <span className="s-r">{task.reason}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </section>
    )
}

export default function PerformanceRebalance() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await performanceApi.rebalance())
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
        return <div className="p-card s12"><div className="p-skel" style={{ height: 360 }} /></div>
    }
    if (error && !data) {
        return <><div className="p-err">{error}</div><button className="p-btn" onClick={load}>Try again</button></>
    }

    const { plans, strained, settled, considered, movableRule, maxRecipientWeeks } = data

    const totalMoved = plans.reduce((sum, p) => sum + p.movedHours, 0)
    const totalCost = plans.reduce((sum, p) => sum + p.costDelta, 0)
    const totalBlocked = plans.reduce((sum, p) => sum + p.blocked.length, 0)

    return (
        <div className="p-grid">
            {error && <div className="p-err s12">{error}</div>}

            <section className="p-card s12">
                <div className="p-lbl">
                    <span>Rebalancing the load</span>
                    <span className="p-pill violet">{plans.length} to work through</span>
                </div>
                <p className="p-sub">
                    The overview says who is carrying too much. This says which of their tasks can actually move,
                    who should take each one, what it costs, and — where the honest answer is that nobody can
                    take it — says that instead of inventing a recipient.
                </p>

                <div className="rb-summary">
                    <div className="rb-stat">
                        <span className="s-n">{totalMoved}h</span>
                        <span className="s-l">Can be moved today</span>
                    </div>
                    <div className="rb-stat">
                        <span className="s-n">{totalCost < 0 ? '−' : ''}${Math.abs(totalCost).toLocaleString()}</span>
                        <span className="s-l">{totalCost < 0 ? 'Saved by the moves' : 'Cost of the moves'}</span>
                    </div>
                    <div className="rb-stat">
                        <span className="s-n">{totalBlocked}</span>
                        <span className="s-l">Tasks nobody has room for</span>
                    </div>
                    <div className="rb-stat">
                        <span className="s-n">{strained}<small> of {considered}</small></span>
                        <span className="s-l">Under strain · {settled} already inside a healthy queue</span>
                    </div>
                </div>

                {/* The rules, on screen. A proposal about somebody's workload has
                    to be arguable, and it cannot be argued with if the rules that
                    produced it are buried in a service file. */}
                <div className="p-note gold">
                    <b>What counts as movable.</b> Not started, not critical, and not due within{' '}
                    {movableRule.minDaysOfRunway} days. Work already underway carries context in somebody's head
                    that does not transfer, and moving a critical item to relieve load trades one risk for a
                    worse one.
                </div>
                <div className="p-note">
                    <b>Where the work can go.</b> Never onto anyone already stretched or at risk, and never past{' '}
                    {maxRecipientWeeks} weeks of queue at their own demonstrated pace. Each plan is worked out
                    against the ones above it, so the same person with slack cannot be offered the same hours
                    three times over.
                </div>
                <div className="p-note mint">
                    <b>Pace is measured, not assumed.</b> Somebody clearing 12 hours of estimated work a week has
                    a capacity of 12, whatever their contract says — so "weeks of queue" means weeks at the rate
                    that person has actually been going.
                </div>
            </section>

            {plans.length === 0
                ? (
                    <section className="p-card s12">
                        <p className="p-state">
                            Nobody is carrying more than about two weeks of work. Nothing needs moving.
                        </p>
                    </section>
                )
                : plans.map(plan => <Plan plan={plan} ceiling={maxRecipientWeeks} key={plan.person.id} />)}
        </div>
    )
}
