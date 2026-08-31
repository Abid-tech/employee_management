import { useCallback, useEffect, useMemo, useState } from 'react'
import { performanceApi } from '../../lib/performance_api'
import { Icon } from './performance_ui'

// Module 4, page 3 — the customisable report.

const STATUSES = [
    { value: '', label: 'Any wellbeing' },
    { value: 'healthy', label: 'Healthy' },
    { value: 'stretched', label: 'Stretched' },
    { value: 'at_risk', label: 'At risk' }
]

const MOMENTUM = [
    { value: '', label: 'Any direction' },
    { value: 'Rising', label: 'Rising' },
    { value: 'Steady', label: 'Steady' },
    { value: 'Slipping', label: 'Slipping' },
    { value: 'No activity', label: 'No activity' }
]

export default function PerformanceReport() {
    const [report, setReport] = useState(null)
    const [departments, setDepartments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [columns, setColumns] = useState(null)
    const [filters, setFilters] = useState({
        department: '', minScore: '', maxScore: '',
        // '' means every employee.
        status: '', momentum: '', sortBy: 'rank', sortDir: 'desc', limit: ''
    })

    // The department list comes from the overview rather than a second endpoint.
    useEffect(() => {
        performanceApi.overview()
            .then(data => setDepartments(data.departments.map(d => d.name)))
            .catch(() => { /* the report itself still works without the filter */ })
    }, [])

    const query = useMemo(() => ({
        ...filters,
        columns: columns || undefined
    }), [filters, columns])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const built = await performanceApi.report(query)
            setReport(built)
            // First load decides the default column set, then the user owns it.
            setColumns(current => current || built.columns)
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [query])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

    const toggleColumn = (key) => {
        setColumns(current => {
            const list = current || report?.columns || []
            if (list.includes(key)) {
                // Never let the table become no table at all.
                return list.length === 1 ? list : list.filter(c => c !== key)
            }
            // Keep the author's chosen order rather than click order.
            const order = report.availableColumns.map(c => c.key)
            return [...list, key].sort((a, b) => order.indexOf(a) - order.indexOf(b))
        })
    }

    const reset = () => {
        setFilters({ department: '', minScore: '', maxScore: '', status: '', momentum: '', sortBy: 'rank', sortDir: 'desc', limit: '' })
        setColumns(report?.defaultColumns || null)
    }

    if (loading && !report) {
        return (
            <div className="p-grid">
                <div className="p-card s12"><div className="p-skel" style={{ height: 150 }} /></div>
                <div className="p-card s12"><div className="p-skel" style={{ height: 320 }} /></div>
            </div>
        )
    }

    if (error && !report) {
        return (
            <>
                <div className="p-err">{error}</div>
                <button className="p-btn" onClick={load}>Try again</button>
            </>
        )
    }

    const active = columns || report.columns
    const labelFor = (key) => report.availableColumns.find(c => c.key === key)?.label || key
    const isNumeric = (key) => report.availableColumns.find(c => c.key === key)?.type === 'number'

    // One chip per filter actually in force.
    const appliedChips = [
        filters.department && { key: 'department', label: filters.department },
        filters.minScore && { key: 'minScore', label: `Score ≥ ${filters.minScore}` },
        filters.maxScore && { key: 'maxScore', label: `Score ≤ ${filters.maxScore}` },
        filters.status && { key: 'status', label: STATUSES.find(s => s.value === filters.status)?.label },
        filters.momentum && { key: 'momentum', label: filters.momentum },
        filters.limit && { key: 'limit', label: `Top ${filters.limit}` }
    ].filter(Boolean)

    return (
        <div className="p-grid">

            {/* Builder. */}
            <section className="p-card s12">
                <div className="p-lbl">
                    <span>Report builder</span>
                    <span className={`p-pill ${loading ? 'gold' : 'violet'}`}>
                        {loading ? 'Updating…' : `${report.count} of ${report.total} ${report.total === 1 ? 'employee' : 'employees'}`}
                    </span>
                </div>
                <p className="p-sub">
                    Every change applies immediately — there is no Generate button. The table below
                    and the exported file are built from the same request, so they can never disagree.
                </p>

                <div className="p-controls">
                    <div className="p-field">
                        <label htmlFor="r-dept">Department</label>
                        <select id="r-dept" value={filters.department} onChange={e => setFilter('department', e.target.value)}>
                            <option value="">All departments</option>
                            {departments.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>

                    <div className="p-field">
                        <label htmlFor="r-min">Min score</label>
                        <input id="r-min" type="number" min="0" max="100" placeholder="0"
                            value={filters.minScore} onChange={e => setFilter('minScore', e.target.value)} />
                    </div>

                    <div className="p-field">
                        <label htmlFor="r-max">Max score</label>
                        <input id="r-max" type="number" min="0" max="100" placeholder="100"
                            value={filters.maxScore} onChange={e => setFilter('maxScore', e.target.value)} />
                    </div>

                    <div className="p-field">
                        <label htmlFor="r-status">Wellbeing</label>
                        <select id="r-status" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
                            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>

                    <div className="p-field">
                        <label htmlFor="r-mom">Momentum</label>
                        <select id="r-mom" value={filters.momentum} onChange={e => setFilter('momentum', e.target.value)}>
                            {MOMENTUM.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>

                    <div className="p-field">
                        <label htmlFor="r-sort">Sort by</label>
                        <select id="r-sort" value={filters.sortBy} onChange={e => setFilter('sortBy', e.target.value)}>
                            {report.availableColumns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                    </div>

                    <div className="p-field">
                        <label htmlFor="r-dir">Order</label>
                        <select id="r-dir" value={filters.sortDir} onChange={e => setFilter('sortDir', e.target.value)}>
                            <option value="desc">Best first</option>
                            <option value="asc">Worst first</option>
                        </select>
                    </div>

                    {/* How many rows to keep after sorting. */}
                    <div className="p-field">
                        <label htmlFor="r-limit">Show</label>
                        <select id="r-limit" value={filters.limit} onChange={e => setFilter('limit', e.target.value)}>
                            <option value="">Everyone</option>
                            <option value="3">Top 3</option>
                            <option value="5">Top 5</option>
                            <option value="10">Top 10</option>
                            <option value="20">Top 20</option>
                            <option value="50">Top 50</option>
                        </select>
                    </div>

                    <div className="p-field">
                        <label htmlFor="r-limit-n">Or exactly</label>
                        <input id="r-limit-n" type="number" min="1" placeholder="all"
                            value={filters.limit} onChange={e => setFilter('limit', e.target.value)} />
                    </div>
                </div>

                <div className="p-lbl" style={{ marginTop: 18 }}><span>Columns</span></div>
                <div className="p-chips">
                    {report.availableColumns.map(col => (
                        <button
                            key={col.key}
                            className={`p-chip ${active.includes(col.key) ? 'on' : ''}`}
                            onClick={() => toggleColumn(col.key)}
                            aria-pressed={active.includes(col.key)}
                        >
                            {col.label}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 9, marginTop: 16, flexWrap: 'wrap' }}>
                    <a className="p-btn" href={performanceApi.reportCsvUrl(query)}>
                        <Icon name="download" size={15} /> Export CSV
                    </a>
                    <button className="p-btn ghost" onClick={reset}>Reset</button>
                    <button className="p-btn ghost" onClick={load} disabled={loading}>
                        {loading ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </section>

            {/* Result. */}
            <section className="p-card s12">
                <div className="p-lbl">
                    <span>Result · {report.count} {report.count === 1 ? 'row' : 'rows'}, {active.length} columns</span>
                    <span className="p-pill plain">
                        {loading ? 'Rebuilding…' : `Generated ${new Date(report.generatedAt).toLocaleTimeString()}`}
                    </span>
                </div>

                {/* A visible summary of what is currently applied. */}
                <div className="p-applied">
                    {appliedChips.length === 0
                        ? <span className="ap-none">No filters — showing every employee</span>
                        : appliedChips.map(chip => (
                            <span className="ap-chip" key={chip.key}>
                                {chip.label}
                                <button onClick={() => setFilter(chip.key, '')} aria-label={`Clear ${chip.label}`}>×</button>
                            </span>
                        ))}
                </div>

                {error && <div className="p-err" style={{ marginTop: 12 }}>{error}</div>}

                {report.rows.length === 0
                    ? <p className="p-state">No employee matches these filters. Widen the score range or clear a filter.</p>
                    : (
                        <div className="p-tablewrap">
                            <table className="p-table">
                                <thead>
                                    <tr>{active.map(key => <th key={key}>{labelFor(key)}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {report.rows.map((row, i) => (
                                        <tr key={`${row.name}-${i}`}>
                                            {active.map(key => (
                                                <td key={key} className={isNumeric(key) ? 'num' : ''}>
                                                    {row[key] === null || row[key] === undefined || row[key] === '' ? '—' : row[key]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        {active.map((key, i) => (
                                            <td key={key} className={isNumeric(key) ? 'num' : ''}>
                                                {i === 0 ? 'Average' : (isNumeric(key) ? report.totals[key] ?? '—' : '')}
                                            </td>
                                        ))}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
            </section>
        </div>
    )
}
