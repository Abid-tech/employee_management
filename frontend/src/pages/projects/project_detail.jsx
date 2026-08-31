import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { PRIORITY_LABELS, PROJECT_HEALTH, STATUS_LABELS, daysUntil, formatDate, initialsOf, relativeDays, timeAgo } from '../../lib/format'
import './projects.css'

// Page 5 — one project end to end.

const STAGES = ['todo', 'in_progress', 'review', 'done']

export default function ProjectDetail() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [project, setProject] = useState(null)
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState('')

    const load = useCallback(async () => {
        try {
            const response = await api.objective(id)
            setProject(response.objective)
            setTasks(response.tasks)
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [id])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    const change = async (changes) => {
        setBusy('change')
        try {
            await api.updateObjective(id, changes)
            await load()
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy('')
        }
    }

    const remove = async () => {
        if (!window.confirm('Delete this project? Its tasks are kept and simply released back to their departments.')) return

        setBusy('delete')
        try {
            await api.deleteObjective(id)
            navigate('/projects')
        } catch (err) {
            setError(err.message)
            setBusy('')
        }
    }

    if (loading) return <div className="page"><p className="muted">Loading…</p></div>

    if (!project) {
        return (
            <div className="page">
                <p className="form-error" role="alert">{error || 'That project could not be found.'}</p>
                <Link to="/projects" className="btn btn-secondary">Back to projects</Link>
            </div>
        )
    }

    const health = PROJECT_HEALTH[project.health] || PROJECT_HEALTH.empty
    const daysLeft = daysUntil(project.dueDate)

    return (
        <div className="page">
            <div>
                <Link to="/projects" className="back-link">← Back to projects</Link>

                <header className="page-head">
                    <div className="page-title">
                        <div className="detail-badges">
                            <span className={`pill pill-plain health-${health.tone}`}>{health.label}</span>
                            {project.source === 'ai' && <span className="tag">From a document</span>}
                            {project.departments.map(name => <span key={name} className="tag">{name}</span>)}
                        </div>
                        <h1>{project.title}</h1>
                        {project.summary && <p className="project-summary">{project.summary}</p>}
                    </div>

                    <div className="page-actions">
                        <select
                            className="select"
                            value={project.status}
                            onChange={(event) => change({ status: event.target.value })}
                            disabled={busy === 'change'}
                            aria-label="Project status"
                        >
                            <option value="planning">Planning</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="delivered">Delivered</option>
                        </select>
                        <button type="button" className="btn btn-ghost" onClick={remove} disabled={busy === 'delete'}>
                            Delete
                        </button>
                    </div>
                </header>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <div className="project-detail-grid">
                <div className="detail-main">
                    <section className="panel">
                        <div className="panel-header"><h2>Overall progress</h2></div>
                        <div className="panel-body">
                            <div className="project-big">
                                <strong>{project.progress}%</strong>
                                <span className="muted">
                                    {project.doneCount} of {project.taskCount} tasks done
                                    {project.remainingHours > 0 && ` · ${project.remainingHours}h of ${project.estimatedHours}h left`}
                                </span>
                            </div>

                            <div className="project-bar" role="img" aria-label={`${project.progress}% complete`}>
                                <span className={`project-bar-fill health-fill-${health.tone}`} style={{ width: `${project.progress}%` }} />
                            </div>

                            <p className="field-hint">
                                Counted from the tasks below and weighted by their estimates, so a
                                forty-hour build moves this further than a one-hour fix.
                            </p>
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-header">
                            <h2>Tasks in this project</h2>
                            <span className="muted project-count">{tasks.length}</span>
                        </div>

                        {tasks.length === 0 ? (
                            <div className="panel-body">
                                <p className="muted">
                                    Nothing is filed under this project yet. Open a task and set its
                                    project, or import a document to create a set at once.
                                </p>
                            </div>
                        ) : (
                            <div>
                                {tasks.map(task => (
                                    <div key={task.id} className="project-task">
                                        <Link to={`/tasks/${task.id}`} className="project-task-row">
                                            <div>
                                                <div className="project-task-title">{task.title}</div>
                                                <div className="project-task-meta">
                                                    <span className={`pill pill-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
                                                    <span>{task.department}</span>
                                                    <span>{task.assignee ? task.assignee.name : 'No owner'}</span>
                                                    <span>{STATUS_LABELS[task.status]}</span>
                                                </div>

                                                {/* Assigned next to due. */}
                                                <div className="project-task-dates">
                                                    <span>
                                                        <em>Assigned</em>
                                                        {task.assignedAt ? formatDate(task.assignedAt) : 'Not assigned'}
                                                    </span>
                                                    <span className={task.overdue ? 'is-late' : ''}>
                                                        <em>Due</em>
                                                        {task.dueDate
                                                            ? `${formatDate(task.dueDate)} · ${relativeDays(task.daysLeft)}`
                                                            : 'No date'}
                                                    </span>
                                                    {task.completedAt && (
                                                        <span><em>Finished</em>{timeAgo(task.completedAt)}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="project-task-right">
                                                <div className="mini-bar" aria-hidden="true">
                                                    <span style={{ width: `${task.progress}%` }} />
                                                </div>
                                                <span>{task.progress}%</span>
                                            </div>
                                        </Link>

                                        {/* The checklist is where a task's progress actually comes from. */}
                                        {task.subtasks.length > 0 && (
                                            <ul className="project-subtasks">
                                                {task.subtasks.map(subtask => (
                                                    <li key={subtask.id} className={subtask.done ? 'is-done' : ''}>
                                                        <span className="subtask-mark" aria-hidden="true">
                                                            {subtask.done ? '✓' : ''}
                                                        </span>
                                                        <span className="subtask-title">{subtask.title}</span>
                                                        {subtask.done && subtask.completedAt && (
                                                            <span className="subtask-when">{timeAgo(subtask.completedAt)}</span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <aside className="detail-side">
                    <section className="panel">
                        <div className="panel-header"><h2>By stage</h2></div>
                        <div className="panel-body">
                            <ul className="project-stage-list">
                                {STAGES.map(stage => (
                                    <li key={stage}>
                                        <span className={`stage-dot stage-${stage}`} aria-hidden="true" />
                                        {STATUS_LABELS[stage]}
                                        <span className="count">{project.byStatus[stage]}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    {project.byDepartment.length > 0 && (
                        <section className="panel">
                            <div className="panel-header"><h2>Departments involved</h2></div>
                            <div className="panel-body dept-rows">
                                {project.byDepartment.map(dept => (
                                    <div key={dept.name}>
                                        <div className="dept-row-head">
                                            <span>{dept.name}</span>
                                            <span>{dept.done}/{dept.total}</span>
                                        </div>
                                        <div className="dept-bar">
                                            <span style={{ width: `${dept.total ? (dept.done / dept.total) * 100 : 0}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="panel">
                        <div className="panel-header"><h2>Dates</h2></div>
                        <div className="panel-body">
                            <dl className="project-facts">
                                <div>
                                    <dt>Created</dt>
                                    <dd>{formatDate(project.createdAt)}</dd>
                                </div>
                                <div>
                                    <dt>Work started</dt>
                                    <dd>{project.firstStartedAt ? formatDate(project.firstStartedAt) : 'Not yet'}</dd>
                                </div>
                                <div>
                                    <dt>Target date</dt>
                                    <dd className={daysLeft !== null && daysLeft < 0 && project.openCount > 0 ? 'is-late' : ''}>
                                        {project.dueDate ? `${formatDate(project.dueDate)} · ${relativeDays(daysLeft)}` : 'None set'}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Last task due</dt>
                                    <dd>{project.lastDueDate ? formatDate(project.lastDueDate) : '—'}</dd>
                                </div>
                                <div>
                                    <dt>Last finished</dt>
                                    <dd>{project.lastCompletedAt ? timeAgo(project.lastCompletedAt) : 'Nothing yet'}</dd>
                                </div>
                                {project.sourceDocument && (
                                    <div>
                                        <dt>Read from</dt>
                                        <dd>{project.sourceDocument}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-header"><h2>Where it stands</h2></div>
                        <div className="panel-body">
                            <dl className="project-facts">
                                <div>
                                    <dt>Late tasks</dt>
                                    <dd className={project.overdueCount ? 'is-late' : ''}>{project.overdueCount}</dd>
                                </div>
                                <div>
                                    <dt>Without an owner</dt>
                                    <dd>{project.unassignedCount}</dd>
                                </div>
                                <div>
                                    <dt>Critical still open</dt>
                                    <dd>{project.blockedCount}</dd>
                                </div>
                                <div>
                                    <dt>Estimated</dt>
                                    <dd>{project.estimatedHours}h</dd>
                                </div>
                            </dl>
                        </div>
                    </section>

                    {project.people.length > 0 && (
                        <section className="panel">
                            <div className="panel-header"><h2>People on it</h2></div>
                            <div className="panel-body">
                                <ul className="project-stage-list">
                                    {project.people.map(person => (
                                        <li key={person._id}>
                                            <span className="avatar-sm" style={{ background: person.color }}>
                                                {initialsOf(person.name)}
                                            </span>
                                            {person.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}
                </aside>
            </div>
        </div>
    )
}
