import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE } from '../../lib/api_base'
import './holidays.css'

const TYPES = ['Public', 'Company', 'Optional']

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options
    })

    let data = null

    try {
        data = await response.json()
    } catch {
        data = null
    }

    if (!response.ok) {
        throw new Error((data && data.message) || 'Something went wrong.')
    }

    return data
}

const readableDate = (key) => {
    const [y, m, d] = key.split('-').map(Number)
    return `${d} ${MONTHS[m - 1]} ${y}`
}

function Holidays() {
    const thisYear = new Date().getFullYear()

    const [year, setYear] = useState(thisYear)
    const [holidays, setHolidays] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    const [name, setName] = useState('')
    const [date, setDate] = useState('')
    const [type, setType] = useState('Company')
    const [recurring, setRecurring] = useState(false)
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)

    // Conflicts for the date currently in the form, looked up as it is typed so
    // the warning arrives before the save rather than after it.
    const [conflicts, setConflicts] = useState([])
    const [checking, setChecking] = useState(false)
    const [readOnly, setReadOnly] = useState(false)

    const [importReport, setImportReport] = useState(null)
    const fileInput = useRef(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const data = await request(`/api/holidays?year=${year}`)
            setHolidays(data.holidays || [])
        } catch (err) {
            setError(err.message)
            setHolidays([])
        } finally {
            setLoading(false)
        }
    }, [year])

    useEffect(() => { load() }, [load])

    // Debounced so typing a date does not fire a request per keystroke.
    useEffect(() => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            setConflicts([])
            return
        }

        let cancelled = false
        setChecking(true)

        const timer = setTimeout(async () => {
            try {
                const data = await request(`/api/holidays/conflicts?date=${date}`)
                if (!cancelled) {
                    setConflicts(data.conflicts || [])
                    setReadOnly(false)
                }
            } catch (err) {
                // A 403 here means this account may read the calendar but not
                // change it. Say so once, in place, rather than letting the
                // form look broken.
                if (!cancelled && err.message.includes('administrator')) {
                    setReadOnly(true)
                }
                if (!cancelled) setConflicts([])
            } finally {
                if (!cancelled) setChecking(false)
            }
        }, 350)

        return () => { cancelled = true; clearTimeout(timer) }
    }, [date])

    const save = async (e) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        setNotice('')

        try {
            const data = await request('/api/holidays', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    date,
                    type,
                    recurringAnnually: recurring,
                    description
                })
            })

            const affected = data.affected || []

            setNotice(
                affected.length
                    ? `${name} saved. ${affected.length} ${affected.length === 1 ? 'person has' : 'people have'} something already booked that day: ${affected.join(', ')}.`
                    : `${name} saved. Nothing else was booked that day.`
            )

            setName('')
            setDate('')
            setDescription('')
            setRecurring(false)
            setConflicts([])

            await load()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const remove = async (holiday) => {
        setError('')
        setNotice('')

        try {
            const data = await request(`/api/holidays/${holiday._id}`, { method: 'DELETE' })
            setNotice(data.message)
            await load()
        } catch (err) {
            setError(err.message)
        }
    }

    // The file is read in the browser and its text posted as JSON, so the
    // endpoint needs no upload handling and the same request works from a
    // script.
    const importCsv = async (event) => {
        const file = event.target.files && event.target.files[0]
        if (!file) return

        setError('')
        setNotice('')
        setImportReport(null)

        try {
            const csv = await file.text()
            const data = await request('/api/holidays/import', {
                method: 'POST',
                body: JSON.stringify({ csv })
            })

            setImportReport(data)
            await load()
        } catch (err) {
            setError(err.message)
        } finally {
            if (fileInput.current) fileInput.current.value = ''
        }
    }

    return (
        <div className="hol">
            <header className="hol-head">
                <div>
                    <p className="hol-eyebrow">Company holidays</p>
                    <h1>{year}</h1>
                    <p className="hol-sub">
                        Declaring a day a holiday is checked against room bookings, approved
                        leave and task deadlines before it is saved, so you can tell the people
                        it affects.
                    </p>
                </div>

                <div className="hol-years">
                    {[thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map((y) => (
                        <button
                            key={y}
                            type="button"
                            className={y === year ? 'is-on' : ''}
                            onClick={() => setYear(y)}
                        >
                            {y}
                        </button>
                    ))}
                </div>
            </header>

            {error && <div className="hol-msg is-error">{error}</div>}
            {notice && <div className="hol-msg is-ok">{notice}</div>}

            {readOnly && (
                <div className="hol-msg is-warn">
                    You can see the holiday calendar but not change it. Only an administrator
                    or director can add or remove company holidays.
                </div>
            )}

            <div className="hol-body">
                <section className="hol-list-wrap">
                    <div className="hol-list-head">
                        <h2>{holidays.length} {holidays.length === 1 ? 'holiday' : 'holidays'}</h2>

                        <label className="hol-import">
                            <input
                                ref={fileInput}
                                type="file"
                                accept=".csv,text/csv"
                                onChange={importCsv}
                            />
                            Import CSV
                        </label>
                    </div>

                    {loading ? (
                        <p className="hol-empty">Loading…</p>
                    ) : holidays.length === 0 ? (
                        <p className="hol-empty">No holidays set for {year} yet.</p>
                    ) : (
                        <ul className="hol-list">
                            {holidays.map((holiday) => (
                                <li key={`${holiday._id}-${holiday.occursOn}`}>
                                    <div className="hol-date">
                                        <span className="hol-day">{holiday.occursOn.slice(8)}</span>
                                        <span className="hol-mon">
                                            {MONTHS[Number(holiday.occursOn.slice(5, 7)) - 1].slice(0, 3)}
                                        </span>
                                    </div>

                                    <div className="hol-info">
                                        <strong>{holiday.name}</strong>
                                        <div className="hol-tags">
                                            <span className="hol-tag" data-type={holiday.type}>{holiday.type}</span>
                                            {holiday.recurringAnnually && (
                                                <span className="hol-tag is-repeat">Repeats yearly</span>
                                            )}
                                            {holiday.projected && (
                                                <span className="hol-tag is-proj">
                                                    From {holiday.date.slice(0, 4)}
                                                </span>
                                            )}
                                            {holiday.adjusted && (
                                                <span className="hol-tag is-warn">
                                                    Moved to the 28th, {year} is not a leap year
                                                </span>
                                            )}
                                        </div>
                                        {holiday.description && <p>{holiday.description}</p>}
                                    </div>

                                    <button
                                        type="button"
                                        className="hol-del"
                                        onClick={() => remove(holiday)}
                                        aria-label={`Remove ${holiday.name}`}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {importReport && (
                        <div className="hol-report">
                            <h3>Import finished</h3>
                            <p>
                                {importReport.imported} added
                                {importReport.skipped.length > 0 && `, ${importReport.skipped.length} already existed`}
                                {importReport.rejected.length > 0 && `, ${importReport.rejected.length} rejected`}.
                            </p>

                            {importReport.rejected.length > 0 && (
                                <ul>
                                    {importReport.rejected.map((r) => (
                                        <li key={r.line}>Line {r.line}: {r.message}</li>
                                    ))}
                                </ul>
                            )}

                            {importReport.conflicts.length > 0 && (
                                <>
                                    <h3>Dates with something already booked</h3>
                                    <ul>
                                        {importReport.conflicts.map((c) => (
                                            <li key={c.date}>
                                                {readableDate(c.date)} — {c.name}: {c.conflicts.length} clash
                                                {c.conflicts.length === 1 ? '' : 'es'}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    )}
                </section>

                <aside className="hol-side">
                    <form className="hol-panel" onSubmit={save}>
                        <h2>Add a holiday</h2>

                        <label>
                            Name
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Victory Day"
                                maxLength={120}
                                required
                            />
                        </label>

                        <label>
                            Date
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </label>

                        <label>
                            Type
                            <select value={type} onChange={(e) => setType(e.target.value)}>
                                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </label>

                        <label className="hol-check">
                            <input
                                type="checkbox"
                                checked={recurring}
                                onChange={(e) => setRecurring(e.target.checked)}
                            />
                            Repeats on this day every year
                        </label>

                        <label>
                            Description
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                maxLength={500}
                            />
                        </label>

                        {checking && <p className="hol-hint">Checking that day…</p>}

                        {!checking && date && conflicts.length === 0 && (
                            <p className="hol-clear">Nothing is booked on that day.</p>
                        )}

                        {conflicts.length > 0 && (
                            <div className="hol-conflicts">
                                <strong>
                                    {conflicts.length} thing{conflicts.length === 1 ? '' : 's'} already
                                    booked on that day
                                </strong>
                                <ul>
                                    {conflicts.map((c) => (
                                        <li key={`${c.kind}-${c.id}`}>
                                            <span className="hol-kind">{c.kind}</span>
                                            {c.summary} — {c.who}
                                        </li>
                                    ))}
                                </ul>
                                <p>
                                    You can still save. The holiday takes precedence; these are the
                                    people to tell.
                                </p>
                            </div>
                        )}

                        <button type="submit" className="hol-primary" disabled={saving || !name.trim() || !date}>
                            {saving ? 'Saving…' : 'Save holiday'}
                        </button>
                    </form>

                    <div className="hol-panel">
                        <h2>CSV format</h2>
                        <p className="hol-hint">
                            One holiday per line. A header row is optional, and rows that cannot be
                            read are reported by line number rather than failing the whole file.
                        </p>
                        <pre>{`name,date,type,recurring
New Year's Day,2027-01-01,Public,yes
Company retreat,2027-03-14,Company,no`}</pre>
                    </div>
                </aside>
            </div>
        </div>
    )
}

export default Holidays
