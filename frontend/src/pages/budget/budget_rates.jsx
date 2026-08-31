import { useCallback, useEffect, useState } from 'react'
import { budgetApi } from '../../lib/budget_api'
import { useBudget } from './budget_context'
import { formatDate, money } from './budget_format'
import { Avatar, Icon } from './budget_ui'

// Rates, and the dates they applied from.

export default function BudgetRates() {
    const { meta, actorId } = useBudget()

    const [people, setPeople] = useState([])
    // Stamped when the table is read, not while rendering.
    const [readAt, setReadAt] = useState(() => Date.now())
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ employee: '', costRate: '', billRate: '', effectiveFrom: '', reason: '' })

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await budgetApi.rates()
            setPeople(data.people)
            setReadAt(Date.now())
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    const save = async () => {
        setSaving(true); setError(''); setNote('')
        try {
            const result = await budgetApi.setRate({ ...form, actorId })
            setNote(`New rate for ${result.rate.employee.name} applies from ${formatDate(result.rate.effectiveFrom)}. `
                + 'Hours logged before that date keep the rate they were costed at.')
            setForm({ employee: '', costRate: '', billRate: '', effectiveFrom: '', reason: '' })
            await load()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const now = readAt

    return (
        <div className="bd-grid">
            {error && <div className="bd-err s12">{error}</div>}
            {note && <div className="bd-ok s12">{note}</div>}

            <section className="bd-card s5">
                <div className="bd-lbl"><span>Set a rate</span><Icon name="tag" size={14} /></div>
                <p className="bd-sub">
                    This adds a rate from a date. It never changes what past hours cost.
                </p>

                <div className="bd-fields">
                    <div className="bd-field">
                        <label htmlFor="r-emp">Person</label>
                        <select id="r-emp" value={form.employee} onChange={e => setForm(p => ({ ...p, employee: e.target.value }))}>
                            <option value="">Choose…</option>
                            {(meta?.employees || []).map(person => (
                                <option key={person.id} value={person.id}>{person.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="bd-field">
                        <label htmlFor="r-cost">Cost / hour</label>
                        <input id="r-cost" type="number" min="0" value={form.costRate}
                            onChange={e => setForm(p => ({ ...p, costRate: e.target.value }))} />
                        <span className="bd-hint">What the hour costs the company.</span>
                    </div>
                    <div className="bd-field">
                        <label htmlFor="r-bill">Bill / hour</label>
                        <input id="r-bill" type="number" min="0" value={form.billRate}
                            onChange={e => setForm(p => ({ ...p, billRate: e.target.value }))} />
                        <span className="bd-hint">What a client is charged. Zero for internal roles.</span>
                    </div>
                    <div className="bd-field">
                        <label htmlFor="r-from">Applies from</label>
                        <input id="r-from" type="date" value={form.effectiveFrom}
                            onChange={e => setForm(p => ({ ...p, effectiveFrom: e.target.value }))} />
                    </div>
                    <div className="bd-field">
                        <label htmlFor="r-why">Reason</label>
                        <input id="r-why" value={form.reason} placeholder="Annual review"
                            onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
                    </div>
                </div>

                <button className="bd-btn" style={{ marginTop: 12 }}
                    disabled={saving || !form.employee || !form.costRate} onClick={save}>
                    <Icon name="check" size={13} /> {saving ? 'Saving…' : 'Add rate'}
                </button>
            </section>

            <section className="bd-card s7">
                <div className="bd-lbl">
                    <span>Rate history</span>
                    <span className="bd-pill plain">{people.length} people</span>
                </div>
                <p className="bd-sub">
                    The rate in force today is marked. Anything dated in the future is scheduled, not applied.
                </p>

                {loading && people.length === 0
                    ? <div className="bd-skel" style={{ height: 220, marginTop: 12 }} />
                    : people.map(person => (
                        <div key={person.employee.id} style={{ marginTop: 14 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <Avatar person={person.employee} size="sm" />
                                <span style={{ fontSize: 12.5, fontWeight: 650 }}>{person.employee.name}</span>
                                <span style={{ fontSize: 10.5, color: 'var(--b-muted)' }}>{person.employee.jobTitle}</span>
                                {person.current && (
                                    <span className="bd-pill green" style={{ marginLeft: 'auto' }}>
                                        now {money(person.current.costRate)} / {money(person.current.billRate)}
                                        {person.current.marginPercent !== null ? ` · ${person.current.marginPercent}% margin` : ''}
                                    </span>
                                )}
                            </div>

                            <div className="bd-tablewrap" style={{ marginTop: 8 }}>
                                <table className="bd-table">
                                    <thead>
                                        <tr><th>From</th><th>Cost</th><th>Bill</th><th>Margin</th><th>Reason</th></tr>
                                    </thead>
                                    <tbody>
                                        {person.history.map(rate => {
                                            const isNow = person.current?.id === rate.id
                                            const future = new Date(rate.effectiveFrom).getTime() > now
                                            return (
                                                <tr key={rate.id}>
                                                    <td className={isNow ? 'now' : ''}>
                                                        {formatDate(rate.effectiveFrom)}
                                                        {isNow && <span className="bd-pill green" style={{ marginLeft: 7 }}>in force</span>}
                                                        {future && <span className="bd-pill gold" style={{ marginLeft: 7 }}>scheduled</span>}
                                                    </td>
                                                    <td className="num">{money(rate.costRate)}</td>
                                                    <td className="num">{money(rate.billRate)}</td>
                                                    <td className="num">
                                                        {rate.marginPercent === null ? '—' : `${rate.marginPercent}%`}
                                                    </td>
                                                    <td>{rate.reason || '—'}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
            </section>
        </div>
    )
}
