import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { PROJECT_HEALTH, daysUntil, formatDate, relativeDays } from '../../lib/format'
import './projects.css'

// Page 4 — every project, and how far through each one is.
//
// The orbit answers "what is urgent in this department". It cannot answer "is
// the supplier portal going to land", because a project cuts across departments
// and the orbit only ever shows one at a time. This page is that second view:
// one row per project, progress counted from the work underneath it.

export default function Projects() {
    const navigate = useNavigate()

    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState('open')

    const [adding, setAdding] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newDue, setNewDue] = useState('')
    const [saving, setSaving] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const response = await api.objectives()
            setProjects(response.objectives)
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    const create = async (event) => {
        event.preventDefault()
        if (!newTitle.trim()) return

        setSaving(true)
        try {
            const { objective } = await api.createObjective({
                title: newTitle.trim(),
                dueDate: newDue || null
            })
            navigate(`/projects/${objective._id}`)
        } catch (err) {
            setError(err.message)
            setSaving(false)
        }
    }

    const shown = useMemo(() => {
        const rows = filter === 'open'
            ? projects.filter(p => p.health !== 'delivered')
            : filter === 'late'
                ? projects.filter(p => p.health === 'late')
                : projects

        // Trouble first: late, then least complete.
        return [...rows].sort((a, b) => {
            const lateDiff = (b.health === 'late') - (a.health === 'late')
            if (lateDiff !== 0) return lateDiff
            return a.progress - b.progress
        })
    }, [projects, filter])

    const totals = useMemo(() => {
        const live = projects.filter(p => p.health !== 'delivered')
        return {
            live: live.length,
            late: projects.filter(p => p.health === 'late').length,
            tasks: projects.reduce((sum, p) => sum + p.taskCount, 0),
            remaining: projects.reduce((sum, p) => sum + p.remainingHours, 0)
        }
    }, [projects])

    return (
        <div className="page">
            <header className="page-head">
                <div className="page-title">
                    <h1>Projects</h1>
                    <p>
                        Work grouped by what it is for, rather than who is doing it. Progress is
                        counted from the tasks underneath each project, weighted by their estimates.
                    </p>
                </div>

                <div className="page-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setAdding(value => !value)}>
                        {adding ? 'Cancel' : '+ New project'}
                    </button>
                    <Link to="/tasks/new" className="btn">Add work from a document</Link>
                </div>
            </header>

            {error && <p className="form-error" role="alert">{error}</p>}

            {adding && (
                <form className="panel project-new" onSubmit={create}>
                    <div className="panel-body project-new-body">
                        <div className="field project-new-title">
                            <label htmlFor="project-title">Project name</label>
                            <input
                                id="project-title"
                                className="input"
                                value={newTitle}
                                onChange={(event) => setNewTitle(event.target.value)}
                                placeholder="Supplier portal for Meghna Group"
                                autoFocus
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="project-due">Target date</label>
                            <input
                                id="project-due"
                                className="input"
                                type="date"
                                value={newDue}
                                onChange={(event) => setNewDue(event.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn" disabled={saving || !newTitle.trim()}>
                            {saving ? 'Creating…' : 'Create project'}
                        </button>
                    </div>
                </form>
            )}

            <section className="project-totals">
                <div><strong>{totals.live}</strong><span>live projects</span></div>
                <div className={totals.late ? 'is-late' : ''}><strong>{totals.late}</strong><span>late</span></div>
                <div><strong>{totals.tasks}</strong><span>tasks in total</span></div>
                <div><strong>{totals.remaining}h</strong><span>still to do</span></div>
            </section>

            {/* Same filter control the orbit list uses, so the two pages behave
                alike rather than each inventing their own. */}
            <div className="list-filters" role="group" aria-label="Filter projects">
                {[
                    { key: 'open', label: `Live (${projects.filter(p => p.health !== 'delivered').length})` },
                    { key: 'late', label: `Late (${projects.filter(p => p.health === 'late').length})` },
                    { key: 'all', label: `All (${projects.length})` }
                ].map(option => (
                    <button
                        key={option.key}
                        type="button"
                        className={`list-filter${filter === option.key ? ' list-filter-on' : ''}`}
                        onClick={() => setFilter(option.key)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="muted">Loading…</p>
            ) : shown.length === 0 ? (
                <div className="panel"><div className="panel-body"><p className="muted">Nothing here yet.</p></div></div>
            ) : (
                <div className="project-list">
                    {shown.map(project => {
                        const health = PROJECT_HEALTH[project.health] || PROJECT_HEALTH.empty
                        const left = daysUntil(project.dueDate)

                        return (
                            <Link to={`/projects/${project.id}`} key={project.id} className="project-card">
                                <div className="project-card-head">
                                    <div>
                                        <h2>{project.title}</h2>
                                        <p className="muted project-card-meta">
                                            {project.taskCount} task{project.taskCount === 1 ? '' : 's'}
                                            {project.departments.length > 0 && ` · ${project.departments.join(', ')}`}
                                            {project.source === 'ai' && ' · from a document'}
                                        </p>
                                    </div>
                                    <span className={`pill pill-plain health-${health.tone}`}>{health.label}</span>
                                </div>

                                <div className="project-bar" role="img" aria-label={`${project.progress}% complete`}>
                                    <span className={`project-bar-fill health-fill-${health.tone}`} style={{ width: `${project.progress}%` }} />
                                </div>

                                <div className="project-card-foot">
                                    <span className="project-percent">{project.progress}%</span>
                                    <span className="muted">
                                        {project.doneCount} of {project.taskCount} done
                                        {project.remainingHours > 0 && ` · ${project.remainingHours}h left`}
                                    </span>
                                    <span className={`muted project-due${left !== null && left < 0 ? ' is-late' : ''}`}>
                                        {project.dueDate
                                            ? `${formatDate(project.dueDate)} · ${relativeDays(left)}`
                                            : 'No target date'}
                                    </span>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
