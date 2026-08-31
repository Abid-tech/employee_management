import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { PRIORITY_LABELS, toDateInput } from '../../lib/format'
import DocumentImport from './document_import'
import './new_task.css'

// Page 3 — add a task.

const RING_INFO = {
    critical: { radius: 0.30, label: 'Innermost ring', note: 'Right beside the centre — seen first, every time.' },
    high: { radius: 0.50, label: 'Second ring', note: 'Close in, but not competing with the critical work.' },
    medium: { radius: 0.71, label: 'Third ring', note: 'The steady middle of the department’s workload.' },
    low: { radius: 0.92, label: 'Outer ring', note: 'Out at the edge until it becomes more urgent.' }
}

// department is filled in once the real list arrives.
const BLANK = {
    title: '',
    description: '',
    department: '',
    assigneeId: '',
    objectiveId: '',
    priority: 'medium',
    estimateHours: 8,
    dueDate: '',
    subtasks: ''
}

export default function NewTask() {
    const navigate = useNavigate()

    const [form, setForm] = useState(BLANK)
    const [options, setOptions] = useState({ departments: [], employees: [], objectives: [] })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    // Two ways onto the same page: type one task.
    const [mode, setMode] = useState('single')

    useEffect(() => {
        api.options().then(loaded => {
            setOptions(loaded)

            // Settle the department on a real one as soon as the list is known.
            const busiest = [...loaded.departments]
                .sort((a, b) => (b.people || 0) - (a.people || 0))[0]

            setForm(current => (
                loaded.departments.some(d => d.name === current.department)
                    ? current
                    : { ...current, department: busiest?.name || '' }
            ))
        }).catch(err => setError(err.message))
    }, [])

    const set = (key) => (event) => setForm(current => ({ ...current, [key]: event.target.value }))

    const submit = async (event) => {
        event.preventDefault()

        if (!form.title.trim()) {
            setError('Give the task a title.')
            return
        }

        setSaving(true)
        setError('')

        try {
            const response = await api.createTask({
                title: form.title.trim(),
                description: form.description.trim(),
                department: form.department,
                assigneeId: form.assigneeId || null,
                objectiveId: form.objectiveId || null,
                priority: form.priority,
                estimateHours: Number(form.estimateHours) || 4,
                dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
                subtasks: form.subtasks.split('\n').map(line => line.trim()).filter(Boolean)
            })

            // Straight to the new task, so it is obvious it exists.
            navigate(`/tasks/${response.task.id}`)
        } catch (err) {
            setError(err.message)
            setSaving(false)
        }
    }

    const ring = RING_INFO[form.priority]
    const teamForDepartment = options.employees.filter(person => person.department === form.department)
    const subtaskCount = form.subtasks.split('\n').filter(line => line.trim()).length
    // Same size rule the real planets use, so the preview does not lie.
    const previewSize = Math.max(14, Math.min(28, 13 + Math.sqrt(Math.max(0, Number(form.estimateHours) || 0)) * 3))

    return (
        <div className="page">
            <div>
                <Link to="/tasks" className="back-link">← Back to the orbit</Link>

                <header className="page-head">
                    <div className="page-title">
                        <h1>Add work</h1>
                        <p>
                            {mode === 'single'
                                ? 'Describe the work and decide how urgent it is. The preview shows where it will land.'
                                : 'Hand over a project document and the system reads it into a set of tasks for you to review.'}
                        </p>
                    </div>

                    <div className="mode-switch" role="group" aria-label="How to add work">
                        <button
                            type="button"
                            className={`mode-option${mode === 'single' ? ' mode-option-on' : ''}`}
                            onClick={() => setMode('single')}
                        >
                            One task
                        </button>
                        <button
                            type="button"
                            className={`mode-option${mode === 'import' ? ' mode-option-on' : ''}`}
                            onClick={() => setMode('import')}
                        >
                            From a document
                        </button>
                    </div>
                </header>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            {mode === 'import' && (
                <DocumentImport
                    departments={options.departments}
                    employees={options.employees}
                    // Straight to the project when there is one.
                    onCreated={(result) => navigate(result?.objectiveId ? `/projects/${result.objectiveId}` : '/tasks')}
                />
            )}

            <div className="new-layout" hidden={mode !== 'single'}>
                <form id="new-task-form" className="panel new-form" onSubmit={submit}>
                    <div className="panel-body form-body">
                        <div className="field">
                            <label htmlFor="title">Task name</label>
                            <input
                                id="title"
                                className="input"
                                value={form.title}
                                onChange={set('title')}
                                placeholder="Rebuild the invoice list screen"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="description">What needs doing?</label>
                            <textarea
                                id="description"
                                className="textarea"
                                value={form.description}
                                onChange={set('description')}
                                placeholder="Anything the person picking this up would otherwise have to ask."
                            />
                        </div>

                        <div className="form-row">
                            <div className="field">
                                <label htmlFor="department">Department</label>
                                <select
                                    id="department"
                                    className="select"
                                    value={form.department}
                                    onChange={(event) => setForm(current => ({
                                        ...current,
                                        department: event.target.value,
                                        // The old assignee is in another team now.
                                        assigneeId: ''
                                    }))}
                                >
                                    {options.departments.map(department => (
                                        <option key={department.name} value={department.name}>{department.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label htmlFor="assignee">Assign to</label>
                                <select id="assignee" className="select" value={form.assigneeId} onChange={set('assigneeId')}>
                                    <option value="">Nobody yet</option>
                                    {/* _id, not id: the options endpoint returns lean documents, which carry no virtual id. */}
                                    {teamForDepartment.map(person => (
                                        <option key={person._id} value={person._id}>{person.name} — {person.jobTitle}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="priority">Priority</label>
                            <div className="priority-picker" id="priority">
                                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={`priority-option priority-${value}${form.priority === value ? ' priority-on' : ''}`}
                                        onClick={() => setForm(current => ({ ...current, priority: value }))}
                                        aria-pressed={form.priority === value}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-row form-row-3">
                            <div className="field">
                                <label htmlFor="estimate">Estimate (hours)</label>
                                <input
                                    id="estimate"
                                    className="input"
                                    type="number"
                                    min="1"
                                    max="200"
                                    step="1"
                                    value={form.estimateHours}
                                    onChange={set('estimateHours')}
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="due">Due date</label>
                                <input
                                    id="due"
                                    className="input"
                                    type="date"
                                    value={form.dueDate}
                                    onChange={set('dueDate')}
                                    min={toDateInput(new Date())}
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="objective">Objective</label>
                                <select id="objective" className="select" value={form.objectiveId} onChange={set('objectiveId')}>
                                    <option value="">None</option>
                                    {options.objectives.map(objective => (
                                        <option key={objective._id} value={objective._id}>{objective.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="subtasks">Checklist</label>
                            <textarea
                                id="subtasks"
                                className="textarea"
                                value={form.subtasks}
                                onChange={set('subtasks')}
                                placeholder={'One step per line\nTable component with sorting\nWire to the invoices endpoint'}
                            />
                            <span className="field-hint">
                                Ticking these is what moves the task’s progress. {subtaskCount > 0 && `${subtaskCount} step${subtaskCount === 1 ? '' : 's'} so far.`}
                            </span>
                        </div>
                    </div>

                    <footer className="form-footer">
                        <Link to="/tasks" className="btn btn-ghost">Cancel</Link>
                        <button type="submit" className="btn" disabled={saving}>
                            {saving ? 'Creating…' : '✓ Create task'}
                        </button>
                    </footer>
                </form>

                <aside className="panel preview">
                    <div className="panel-header"><h2>Where it will land</h2></div>
                    <div className="panel-body preview-body">
                        <div className="preview-stage">
                            {Object.entries(RING_INFO).map(([priority, info]) => (
                                <span
                                    key={priority}
                                    className={`preview-ring${form.priority === priority ? ' preview-ring-on' : ''}`}
                                    style={{ '--d': `${info.radius * 200}px` }}
                                    aria-hidden="true"
                                />
                            ))}

                            <span className="preview-core" aria-hidden="true">
                                {form.department.split(' ')[0].slice(0, 3)}
                            </span>

                            {/* The planet slides between rings as the priority changes. */}
                            <span
                                className={`preview-planet preview-planet-${form.priority}`}
                                style={{
                                    width: previewSize * 2,
                                    height: previewSize * 2,
                                    transform: `translateY(-${ring.radius * 100}px)`
                                }}
                                aria-hidden="true"
                            />
                        </div>

                        <div className="preview-text">
                            <strong>{ring.label}</strong>
                            <span className="muted">{ring.note}</span>
                        </div>

                        <dl className="preview-facts">
                            <div>
                                <dt>Department</dt>
                                <dd>{form.department}</dd>
                            </div>
                            <div>
                                <dt>Planet size</dt>
                                <dd>{form.estimateHours || 0}h of work</dd>
                            </div>
                            <div>
                                <dt>Owner</dt>
                                <dd>
                                    {teamForDepartment.find(p => p._id === form.assigneeId)?.name || 'Nobody yet'}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </aside>
            </div>
        </div>
    )
}
