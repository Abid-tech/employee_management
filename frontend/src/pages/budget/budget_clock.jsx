import { useCallback, useEffect, useState } from 'react'
import { budgetApi } from '../../lib/budget_api'
import { useBudget } from './budget_context'
import { shortDate } from './budget_format'
import { Icon } from './budget_ui'

// Clocking on and off, and logging hours after the fact.
//
// The forgot-to-start path matters as much as the live timer: hours that only
// exist if somebody remembered to press a button at the right moment produce a
// ledger nobody trusts, and a budget built on an untrusted ledger is decoration.
// A manual entry carries the day the work happened, so it is costed at the rate
// in force then rather than the rate today.

const elapsed = (since) => {
    const ms = Date.now() - new Date(since).getTime()
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function BudgetClock() {
    const { meta, actorId } = useBudget()

    const [shift, setShift] = useState(null)
    const [entries, setEntries] = useState([])
    const [tick, setTick] = useState(0)
    const [error, setError] = useState('')
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)

    const [pick, setPick] = useState({ objective: '', note: '' })
    const [manual, setManual] = useState({ objective: '', hours: '', workedOn: '', note: '' })

    const load = useCallback(async () => {
        if (!actorId) { setShift(null); setEntries([]); return }
        try {
            const [s, e] = await Promise.all([
                budgetApi.shift(actorId),
                budgetApi.entries({ employee: actorId, limit: 15 })
            ])
            setShift(s.shift)
            setEntries(e.entries)
            setError('')
        } catch (err) {
            setError(err.message)
        }
    }, [actorId])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    // Only runs while a shift is open, so an idle page is not re-rendering once
    // a second for no reason.
    useEffect(() => {
        if (!shift?.clockIn) return undefined
        const timer = setInterval(() => setTick(t => t + 1), 1000)
        return () => clearInterval(timer)
    }, [shift])

    const start = async () => {
        setBusy(true); setError(''); setNote('')
        try {
            await budgetApi.clockIn({ employee: actorId, objective: pick.objective || null, note: pick.note })
            await load()
        } catch (err) { setError(err.message) } finally { setBusy(false) }
    }

    const stop = async () => {
        setBusy(true); setError('')
        try {
            const result = await budgetApi.clockOut({ employee: actorId })
            setNote(`Logged ${result.entry.hours}h.`
                + (result.thresholdsFired?.length ? ` That crossed the ${result.thresholdsFired.join('% and ')}% budget alert.` : ''))
            await load()
        } catch (err) { setError(err.message) } finally { setBusy(false) }
    }

    const logIt = async () => {
        setBusy(true); setError(''); setNote('')
        try {
            const result = await budgetApi.log({
                employee: actorId,
                objective: manual.objective || null,
                hours: Number(manual.hours),
                workedOn: manual.workedOn || undefined,
                note: manual.note
            })
            setNote(`Logged ${result.entry.hours}h against ${result.entry.objective?.title || 'no project'}.`
                + (result.thresholdsFired?.length ? ` That crossed the ${result.thresholdsFired.join('% and ')}% alert.` : ''))
            setManual({ objective: '', hours: '', workedOn: '', note: '' })
            await load()
        } catch (err) { setError(err.message) } finally { setBusy(false) }
    }

    if (!actorId) {
        return (
            <div className="bd-card s12">
                <p className="bd-state">Choose who you are in the <b>Working as</b> box above to clock on.</p>
            </div>
        )
    }

    return (
        <div className="bd-grid">
            {error && <div className="bd-err s12">{error}</div>}
            {note && <div className="bd-ok s12">{note}</div>}

            {/* ---- The clock ---- */}
            <section className="bd-card s6">
                <div className="bd-lbl"><span>Time clock</span><Icon name="clock" size={14} /></div>

                {shift ? (
                    <>
                        <div className="bd-live">
                            <span className="l-dot" />
                            <span className="l-time" key={tick}>{elapsed(shift.clockIn)}</span>
                            <span className="l-what">
                                on {shift.objective?.title || 'no project'}
                                {shift.task ? ` · ${shift.task.title}` : ''}
                            </span>
                        </div>
                        <button className="bd-btn stop" style={{ marginTop: 12 }} disabled={busy} onClick={stop}>
                            <Icon name="stop" size={13} /> {busy ? 'Closing…' : 'Clock out'}
                        </button>
                    </>
                ) : (
                    <>
                        <div className="bd-fields">
                            <div className="bd-field">
                                <label htmlFor="c-obj">Project</label>
                                <select id="c-obj" value={pick.objective} onChange={e => setPick(p => ({ ...p, objective: e.target.value }))}>
                                    <option value="">No project</option>
                                    {(meta?.objectives || []).map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
                                </select>
                            </div>
                            <div className="bd-field">
                                <label htmlFor="c-note">What are you working on</label>
                                <input id="c-note" value={pick.note} onChange={e => setPick(p => ({ ...p, note: e.target.value }))} />
                            </div>
                        </div>
                        <button className="bd-btn go" style={{ marginTop: 12 }} disabled={busy} onClick={start}>
                            <Icon name="play" size={13} /> {busy ? 'Starting…' : 'Clock in'}
                        </button>
                    </>
                )}
            </section>

            {/* ---- Forgot to start ---- */}
            <section className="bd-card s6">
                <div className="bd-lbl"><span>Log hours you forgot to start</span></div>
                <p className="bd-sub">
                    Costed at the rate in force on the day the work happened, not today's.
                </p>

                <div className="bd-fields">
                    <div className="bd-field">
                        <label htmlFor="m-obj">Project</label>
                        <select id="m-obj" value={manual.objective} onChange={e => setManual(p => ({ ...p, objective: e.target.value }))}>
                            <option value="">No project</option>
                            {(meta?.objectives || []).map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
                        </select>
                    </div>
                    <div className="bd-field">
                        <label htmlFor="m-hours">Hours</label>
                        <input id="m-hours" type="number" step="0.25" min="0" value={manual.hours}
                            onChange={e => setManual(p => ({ ...p, hours: e.target.value }))} />
                    </div>
                    <div className="bd-field">
                        <label htmlFor="m-date">Day worked</label>
                        <input id="m-date" type="date" value={manual.workedOn}
                            onChange={e => setManual(p => ({ ...p, workedOn: e.target.value }))} />
                    </div>
                </div>

                <button className="bd-btn" style={{ marginTop: 12 }} disabled={busy || !manual.hours} onClick={logIt}>
                    <Icon name="plus" size={13} /> Log it
                </button>
            </section>

            {/* ---- Recent ---- */}
            <section className="bd-card s12">
                <div className="bd-lbl"><span>Your recent entries</span></div>
                {entries.length === 0
                    ? <p className="bd-state">Nothing logged yet.</p>
                    : (
                        <div style={{ marginTop: 6 }}>
                            {entries.map(entry => (
                                <div className="bd-row" key={entry.id}>
                                    <span className="r-b">
                                        <span className="r-t">
                                            {entry.objective?.title || 'No project'}
                                            <span className="bd-pill plain">{entry.source}</span>
                                        </span>
                                        <span className="r-s">
                                            {shortDate(entry.workedOn)}{entry.note ? ` · ${entry.note}` : ''}
                                        </span>
                                    </span>
                                    <span className="r-r">{entry.hours}h</span>
                                </div>
                            ))}
                        </div>
                    )}
            </section>
        </div>
    )
}
