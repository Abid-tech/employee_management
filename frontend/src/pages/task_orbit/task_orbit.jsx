import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import SolarSystem, { ORBITS } from '../../components/solar_system/solar_system'
import { PRIORITY_LABELS, PROJECT_HEALTH, STATUS_LABELS, daysUntil, formatDate, initialsOf, relativeDays } from '../../lib/format'
import './task_orbit.css'

// Page 1.

const STATUS_ORDER = ['todo', 'in_progress', 'review', 'done']

export default function TaskOrbit() {
    const navigate = useNavigate()

    const [departments, setDepartments] = useState([])
    const [tasks, setTasks] = useState([])
    const [objectives, setObjectives] = useState([])
    const [selected, setSelected] = useState('Engineering')
    const [loading, setLoading] = useState(true)
    // Motion is off to begin with.
    const [animate, setAnimate] = useState(false)
    const [listFilter, setListFilter] = useState('open')
    const [error, setError] = useState('')

    const load = useCallback(async (department) => {
        setLoading(true)
        try {
            const response = await api.board(department, true)
            setDepartments(response.departments)
            setTasks(response.tasks)
            setObjectives(response.objectives || [])
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    // load() awaits the request before setting anything.
    useEffect(() => { load(selected) }, [load, selected])

    const stats = useMemo(() => {
        const open = tasks.filter(task => task.status !== 'done')

        const byStatus = Object.fromEntries(
            STATUS_ORDER.map(status => [status, tasks.filter(task => task.status === status).length])
        )

        // Hours split by priority, so "113h left" can be read as where it sits.
        const hoursByPriority = ORBITS.map(orbit => ({
            priority: orbit.priority,
            label: orbit.label,
            hours: Math.round(open
                .filter(task => task.priority === orbit.priority)
                .reduce((sum, task) => sum + task.remainingHours, 0))
        }))

        const remaining = hoursByPriority.reduce((sum, entry) => sum + entry.hours, 0)
        const estimated = Math.round(tasks.reduce((sum, task) => sum + task.estimateHours, 0))

        return {
            open,
            byStatus,
            late: open.filter(task => task.overdue).length,
            dueSoon: open.filter(task => !task.overdue && task.daysLeft !== null && task.daysLeft <= 3).length,
            unassigned: open.filter(task => !task.assignee).length,
            hoursByPriority,
            remaining,
            estimated,
            finished: Math.max(0, estimated - remaining)
        }
    }, [tasks])

    const listed = useMemo(() => {
        const rows = listFilter === 'open'
            ? tasks.filter(task => task.status !== 'done')
            : listFilter === 'late'
                ? tasks.filter(task => task.overdue)
                : tasks

        // Most urgent first: late at the top, then by priority, then by deadline.
        const rank = { critical: 0, high: 1, medium: 2, low: 3 }
        return [...rows].sort((a, b) => {
            if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
            if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority]
            return (a.daysLeft ?? 999) - (b.daysLeft ?? 999)
        })
    }, [tasks, listFilter])

    // The bottom of the page lists projects, not tasks.
    const projectRows = useMemo(() => {
        const here = new Set(listed.map(task => task.objectiveId).filter(Boolean))

        return objectives
            .filter(objective => here.has(objective.id))
            .map(objective => ({
                ...objective,
                hereCount: listed.filter(task => task.objectiveId === objective.id).length
            }))
            .sort((a, b) => {
                // Trouble first, then whichever has most of this department's work.
                const rank = { late: 0, unowned: 1, on_track: 2, empty: 3, delivered: 4 }
                if (rank[a.health] !== rank[b.health]) return rank[a.health] - rank[b.health]
                return b.hereCount - a.hereCount
            })
    }, [listed, objectives])

    // Work that belongs to nobody's project.
    const looseTasks = useMemo(
        () => listed.filter(task => !task.objectiveId),
        [listed]
    )

    return (
        <div className="page">
            <header className="page-head">
                <div className="page-title">
                    <h1>Task orbit</h1>
                    <p>
                        Every open task in the department, placed by priority — the closer to
                        the centre, the more urgent. The numbers and the full list are below.
                    </p>
                </div>

                <div className="page-actions">
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setAnimate(value => !value)}
                        title={animate ? 'Hold the planets still so the labels are easy to read' : 'Let the rings turn'}
                    >
                        {animate ? '❙❙ Stop motion' : '▶ Play motion'}
                    </button>
                    <Link to="/tasks/new" className="btn">+ New task</Link>
                </div>
            </header>

            {error && <p className="orbit-error" role="alert">{error}</p>}

            <nav className="dept-tabs" aria-label="Department">
                {departments.map(department => (
                    <button
                        key={department.name}
                        type="button"
                        className={`dept-tab${selected === department.name ? ' dept-tab-on' : ''}`}
                        onClick={() => setSelected(department.name)}
                    >
                        <span className="dept-tab-mark" aria-hidden="true">{department.mark}</span>
                        <span className="dept-tab-text">
                            <strong>{department.name}</strong>
                            <em>{department.openCount} open · {department.people} people</em>
                        </span>
                        {department.overdueCount > 0 && (
                            <span className="dept-tab-flag">{department.overdueCount} late</span>
                        )}
                    </button>
                ))}
            </nav>

            <div className="orbit-layout">
                <section className="panel orbit-stage">
                    <div className="panel-body">
                        {loading
                            ? <div className="orbit-loading">Loading {selected}…</div>
                            : <SolarSystem tasks={stats.open} centreLabel={selected} paused={!animate} />}
                    </div>
                </section>

                <aside className="orbit-side">
                    <section className="panel">
                        <div className="panel-header"><h2>Where things stand</h2></div>
                        <div className="panel-body breakdown">
                            <div className="breakdown-headline">
                                <div>
                                    <strong className={stats.late ? 'tone-critical' : ''}>{stats.late}</strong>
                                    <span>late</span>
                                </div>
                                <div>
                                    <strong className={stats.dueSoon ? 'tone-high' : ''}>{stats.dueSoon}</strong>
                                    <span>due in 3 days</span>
                                </div>
                                <div>
                                    <strong>{stats.open.length}</strong>
                                    <span>still open</span>
                                </div>
                                <div>
                                    <strong>{stats.unassigned}</strong>
                                    <span>no owner</span>
                                </div>
                            </div>

                            <div className="breakdown-block">
                                <span className="section-label">By stage</span>
                                <ul className="stage-list">
                                    {STATUS_ORDER.map(status => (
                                        <li key={status}>
                                            <span className={`stage-dot stage-${status}`} aria-hidden="true" />
                                            {STATUS_LABELS[status]}
                                            <b>{stats.byStatus[status] || 0}</b>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="breakdown-block">
                                <span className="section-label">Hours left, by priority</span>

                                {/* A single bar split by priority, so the total is not just one number with no shape to it. */}
                                <div className="hours-bar" role="img" aria-label={`${stats.remaining} hours remaining split by priority`}>
                                    {stats.hoursByPriority.filter(entry => entry.hours > 0).map(entry => (
                                        <span
                                            key={entry.priority}
                                            className={`hours-slice slice-${entry.priority}`}
                                            style={{ width: `${(entry.hours / Math.max(1, stats.remaining)) * 100}%` }}
                                            title={`${entry.label}: ${entry.hours}h`}
                                        />
                                    ))}
                                </div>

                                <ul className="hours-list">
                                    {stats.hoursByPriority.map(entry => (
                                        <li key={entry.priority}>
                                            <span className={`legend-dot legend-${entry.priority}`} aria-hidden="true" />
                                            {entry.label}
                                            <b>{entry.hours}h</b>
                                        </li>
                                    ))}
                                </ul>

                                <p className="hours-total muted">
                                    <strong>{stats.remaining}h</strong> left of {stats.estimated}h estimated
                                    {stats.finished > 0 && ` · ${stats.finished}h already covered`}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-header"><h2>Reading the orbit</h2></div>
                        <div className="panel-body legend">
                            {ORBITS.map(orbit => (
                                <span key={orbit.priority} className="legend-row">
                                    <i className={`legend-dot legend-${orbit.priority}`} />
                                    <span className="legend-text">
                                        {orbit.label} priority
                                        <em>{orbit.ring}</em>
                                    </span>
                                </span>
                            ))}

                            <hr className="legend-rule" />

                            <p className="legend-note muted">
                                Planet size is the estimated hours, the white arc is progress,
                                and a red halo means the task is past its due date.
                            </p>
                        </div>
                    </section>
                </aside>
            </div>

            {/* Projects, not tasks. */}
            <section className="panel">
                <div className="panel-header">
                    <h2>{selected} projects</h2>
                    <div className="list-filters" role="group" aria-label="Filter the list">
                        {[
                            { key: 'open', label: `Open (${stats.open.length})` },
                            { key: 'late', label: `Late (${stats.late})` },
                            { key: 'all', label: `All (${tasks.length})` }
                        ].map(option => (
                            <button
                                key={option.key}
                                type="button"
                                className={`list-filter${listFilter === option.key ? ' list-filter-on' : ''}`}
                                onClick={() => setListFilter(option.key)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {projectRows.length === 0 ? (
                    <p className="list-empty muted">
                        No project has work in {selected} under that filter.
                    </p>
                ) : (
                    <div className="orbit-projects">
                        {projectRows.map(project => {
                            const health = PROJECT_HEALTH[project.health] || PROJECT_HEALTH.empty
                            const left = project.dueDate ? daysUntil(project.dueDate) : null

                            return (
                                <Link to={`/projects/${project.id}`} key={project.id} className="orbit-project">
                                    <div className="orbit-project-main">
                                        <div className="orbit-project-title">
                                            {project.title}
                                            <span className={`pill pill-plain health-${health.tone}`}>{health.label}</span>
                                        </div>

                                        <div className="orbit-project-meta">
                                            <span>{project.hereCount} here of {project.taskCount} tasks</span>
                                            <span>{project.doneCount} done · {project.openCount} open</span>
                                            {project.overdueCount > 0 && (
                                                <span className="is-late">{project.overdueCount} late</span>
                                            )}
                                            <span>{project.remainingHours}h of {project.estimatedHours}h left</span>
                                        </div>

                                        <div className="orbit-project-dates">
                                            <span>
                                                <em>Assigned</em>
                                                {formatDate(project.startDate || project.createdAt)}
                                            </span>
                                            <span className={left !== null && left < 0 && project.openCount > 0 ? 'is-late' : ''}>
                                                <em>Due</em>
                                                {project.dueDate
                                                    ? `${formatDate(project.dueDate)} · ${relativeDays(left)}`
                                                    : 'No date'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="orbit-project-progress">
                                        <div className="orbit-project-bar">
                                            <span className={`health-fill-${health.tone}`} style={{ width: `${project.progress}%` }} />
                                        </div>
                                        <b>{project.progress}%</b>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* Standalone work. */}
            <section className="panel">
                <div className="panel-header">
                    <h2>Single tasks</h2>
                    <span className="muted project-count">{looseTasks.length} not in a project</span>
                </div>

                {looseTasks.length === 0 ? (
                    <p className="list-empty muted">
                        Every {selected} task under that filter belongs to a project.
                    </p>
                ) : (
                    <div className="table-scroll">
                        <table className="task-table">
                            <thead>
                                <tr>
                                    <th scope="col">Task</th>
                                    <th scope="col">Owner</th>
                                    <th scope="col">Priority</th>
                                    <th scope="col">Stage</th>
                                    <th scope="col">Assigned</th>
                                    <th scope="col">Due</th>
                                    <th scope="col">Hours</th>
                                    <th scope="col" className="col-progress">Progress</th>
                                </tr>
                            </thead>
                            <tbody>
                                {looseTasks.map(task => (
                                    <tr
                                        key={task.id}
                                        onClick={() => navigate(`/tasks/${task.id}`)}
                                        className={task.overdue ? 'row-late' : ''}
                                    >
                                        <td><span className="cell-title">{task.title}</span></td>
                                        <td>
                                            {task.assignee ? (
                                                <span className="cell-person">
                                                    <span className="avatar-sm" style={{ background: task.assignee.color }}>
                                                        {initialsOf(task.assignee.name)}
                                                    </span>
                                                    {task.assignee.name.split(' ')[0]}
                                                </span>
                                            ) : <span className="muted">—</span>}
                                        </td>
                                        <td><span className={`pill pill-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span></td>
                                        <td>
                                            <span className={`pill pill-plain ${task.status === 'done' ? 'pill-done' : 'pill-status'}`}>
                                                {STATUS_LABELS[task.status]}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="cell-due">
                                                {task.assignedAt
                                                    ? formatDate(task.assignedAt)
                                                    : <span className="muted">Not assigned</span>}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`cell-due${task.overdue ? ' cell-due-late' : ''}`}>
                                                {formatDate(task.dueDate)}
                                                {task.daysLeft !== null && task.status !== 'done' && (
                                                    <em>{relativeDays(task.daysLeft)}</em>
                                                )}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="cell-hours">
                                                {task.remainingHours}h left
                                                <em>of {task.estimateHours}h</em>
                                            </span>
                                        </td>
                                        <td className="col-progress">
                                            <span className="cell-progress">
                                                <span className="mini-track">
                                                    <span
                                                        className={`mini-fill fill-${task.priority}`}
                                                        style={{ width: `${task.progress}%` }}
                                                    />
                                                </span>
                                                <b>{task.progress}%</b>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

        </div>
    )
}
