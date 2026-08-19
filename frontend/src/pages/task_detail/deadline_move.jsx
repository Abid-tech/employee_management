import { useCallback, useEffect, useState } from 'react'
import './deadline_move.css'

// Moving a deadline, with the money consequence shown before it is committed.
//
// This is the one thing the specialist tools structurally cannot do. Harvest,
// Clockify and Productive know exactly what a project costs but have no idea
// when anything is due. Jira and Asana own every date and know nothing about
// money. Because this app owns both, the cost of a delay can be put in front of
// the person making the decision at the moment they make it, instead of arriving
// as a surprise on a report a month later — by which point the choice is spent.
//
// The framing is deliberately careful. Extending a date does not by itself
// create cost: the outstanding work costs what it costs whenever it is done.
// What a later date buys is a project that stays open longer, and an open
// project keeps burning. So the figure is an exposure at the current daily burn
// rate, and it is labelled as one.

const fmt = (value, currency = 'USD') => {
    const symbol = { USD: '$', GBP: '£', EUR: '€', BDT: '৳' }[currency] || ''
    const n = Math.abs(Number(value) || 0)
    return `${value < 0 ? '−' : ''}${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

const iso = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

export default function DeadlineMove({ task, employees = [], onDone }) {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState(iso(task.dueDate))
    const [reason, setReason] = useState('')
    const [actorId, setActorId] = useState(() => localStorage.getItem('bud.actorId') || '')

    const [impact, setImpact] = useState(null)
    const [checking, setChecking] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const history = task.deadlineChanges || []

    // The preview is fetched as the date changes, so the consequence is visible
    // while the decision is still being made rather than after it.
    const check = useCallback(async (value) => {
        if (!value || value === iso(task.dueDate)) { setImpact(null); return }

        setChecking(true)
        try {
            const response = await fetch(`/api/tasks/${task.id}/extend-impact?dueDate=${value}`)
            const payload = await response.json()
            if (!response.ok) throw new Error(payload?.error || 'Could not work out the impact.')
            setImpact(payload.impact)
            setError('')
        } catch (err) {
            setError(err.message)
            setImpact(null)
        } finally {
            setChecking(false)
        }
    }, [task.id, task.dueDate])

    useEffect(() => {
        if (!open) return undefined
        const timer = setTimeout(() => check(date), 350)
        return () => clearTimeout(timer)
    }, [date, open, check])

    const commit = async () => {
        setSaving(true)
        setError('')
        try {
            const response = await fetch(`/api/tasks/${task.id}/extend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dueDate: date, reason, actorId: actorId || undefined })
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload?.error || 'Could not move the deadline.')

            setOpen(false)
            setReason('')
            setImpact(null)
            onDone?.(payload.task)
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="dm">
            <div className="dm-head">
                <span className="dm-label">Deadline</span>
                <button className="dm-toggle" onClick={() => setOpen(v => !v)}>
                    {open ? 'Cancel' : 'Move it'}
                </button>
            </div>

            <div className="dm-current">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, {
                    day: 'numeric', month: 'short', year: 'numeric'
                }) : 'No date set'}
            </div>

            {/* A deadline that has already moved should say so on its own face. */}
            {history.length > 0 && (
                <p className="dm-history">
                    Already moved {history.length === 1 ? 'once' : `${history.length} times`}
                    {history[history.length - 1]?.byName ? `, last by ${history[history.length - 1].byName}` : ''}.
                </p>
            )}

            {open && (
                <div className="dm-form">
                    <label className="dm-field">
                        <span>New date</span>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </label>

                    <label className="dm-field">
                        <span>Who is moving it</span>
                        <select value={actorId} onChange={e => setActorId(e.target.value)}>
                            <option value="">Choose…</option>
                            {employees.map(person => (
                                <option key={person._id || person.id} value={person._id || person.id}>
                                    {person.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="dm-field wide">
                        <span>Why</span>
                        <input value={reason} placeholder="Client pushed the handover"
                            onChange={e => setReason(e.target.value)} />
                    </label>

                    {/* ---- The part nothing else can show ---- */}
                    {checking && <div className="dm-impact loading">Working out what this costs…</div>}

                    {impact && !checking && (
                        <div className={`dm-impact ${impact.tipsIntoOverrun ? 'bad' : impact.alreadyOverrunning ? 'bad' : impact.daysAdded > 0 ? 'warn' : 'good'}`}>
                            {impact.daysAdded > 0
                                ? <b>{impact.daysAdded} days later</b>
                                : <b>{Math.abs(impact.daysAdded)} days earlier</b>}

                            {impact.hasBudget ? (
                                <>
                                    <div className="dm-figures">
                                        <span>
                                            <i>Exposure at current burn</i>
                                            <b>{fmt(impact.exposure, impact.currency)}</b>
                                        </span>
                                        <span>
                                            <i>Project forecast</i>
                                            <b>
                                                {fmt(impact.projectedBefore, impact.currency)} → {fmt(impact.projectedAfter, impact.currency)}
                                            </b>
                                        </span>
                                        <span>
                                            <i>Of {fmt(impact.totalBudget, impact.currency)} budget</i>
                                            <b className={impact.percentAfter > 100 ? 'over' : ''}>
                                                {impact.percentBefore}% → {impact.percentAfter}%
                                            </b>
                                        </span>
                                    </div>

                                    {impact.tipsIntoOverrun && (
                                        <p className="dm-verdict">
                                            This is the decision that puts <b>{impact.project?.title}</b> over
                                            its budget. It is inside budget today.
                                        </p>
                                    )}
                                    {impact.alreadyOverrunning && (
                                        <p className="dm-verdict">
                                            <b>{impact.project?.title}</b> is already forecast to overrun. This adds to it.
                                        </p>
                                    )}

                                    <p className="dm-basis">
                                        Based on {fmt(impact.burnPerDay, impact.currency)} a day over the
                                        last {impact.windowDays} days · confidence {impact.confidence}.
                                        {impact.otherLate.length > 0 &&
                                            ` ${impact.otherLate.length} other task${impact.otherLate.length === 1 ? ' is' : 's are'} already late on this project.`}
                                    </p>
                                </>
                            ) : (
                                <p className="dm-basis">
                                    {impact.project
                                        ? 'This project has no budget set, so there is no cost to show.'
                                        : 'This task is not on a project, so there is no budget to affect.'}
                                </p>
                            )}
                        </div>
                    )}

                    {error && <div className="dm-error">{error}</div>}

                    <button className="dm-commit" disabled={saving || !date} onClick={commit}>
                        {saving ? 'Moving…' : 'Move the deadline'}
                    </button>
                </div>
            )}
        </div>
    )
}
