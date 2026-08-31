import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { PRIORITY_LABELS } from '../../lib/format'
import './document_import.css'

// Hand over a project document; get back a draft set of tasks.

const SAMPLE = `Client Brief: Customer Self-Service Portal

Scope
- Build a login screen with password reset over email
- Design the account overview page showing recent orders
- Create an API endpoint that returns a customer's order history
- Write end to end tests for the ticket submission flow
- Draft the help centre documentation for the new portal

Constraints
The login work is critical and must be finished first. The help centre is nice to have.`

// Checked here rather than through the input's accept attribute.
const SUPPORTED = ['.txt', '.md', '.csv', '.pdf', '.docx']

const extensionOf = (name = '') => {
    const dot = name.lastIndexOf('.')
    return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

export default function DocumentImport({ departments = [], employees = [], onCreated }) {
    const [file, setFile] = useState(null)
    const [text, setText] = useState('')
    const [notes, setNotes] = useState('')
    const [dragOver, setDragOver] = useState(false)

    const [draft, setDraft] = useState(null)
    // A document describes one piece of work.
    const [projectTitle, setProjectTitle] = useState('')
    const [projectDueDate, setProjectDueDate] = useState('')
    const [groupAsProject, setGroupAsProject] = useState(true)
    const [reading, setReading] = useState(false)
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')
    const [engine, setEngine] = useState(null)

    const fileInput = useRef(null)

    useEffect(() => {
        api.aiStatus().then(setEngine).catch(() => {})
    }, [])

    // One way in for both the picker and a dropped file.
    const chooseFile = (chosen) => {
        if (!chosen) return

        const ext = extensionOf(chosen.name)
        if (!SUPPORTED.includes(ext)) {
            setFile(null)
            setError(`${ext || 'That file type'} cannot be read. Try ${SUPPORTED.join(', ')}.`)
            return
        }

        setFile(chosen)
        setText('')
        setError('')
    }

    const analyse = async () => {
        if (!file && text.trim().length < 40) {
            setError('Upload a document or paste at least a short paragraph.')
            return
        }

        setReading(true)
        setError('')

        try {
            const response = await api.analyseDocument({ file, text: file ? '' : text, notes })
            setDraft(response)
            setProjectTitle(response.suggestedProject || '')
        } catch (err) {
            setError(err.message)
        } finally {
            setReading(false)
        }
    }

    const updateTask = (key, changes) => {
        setDraft(current => ({
            ...current,
            tasks: current.tasks.map(task => (task.key === key ? { ...task, ...changes } : task))
        }))
    }

    const create = async () => {
        const kept = draft.tasks.filter(task => task.include)

        if (kept.length === 0) {
            setError('Keep at least one task to create.')
            return
        }

        setCreating(true)
        setError('')

        try {
            const response = await api.createFromDraft(
                kept.map(task => ({
                    title: task.title,
                    description: task.description,
                    department: task.department,
                    assigneeId: task.assigneeId || null,
                    priority: task.priority,
                    estimateHours: task.estimateHours,
                    subtasks: task.subtasks,
                    reason: task.reason
                })),
                groupAsProject && projectTitle.trim()
                    ? {
                        projectTitle: projectTitle.trim(),
                        projectDueDate: projectDueDate || null,
                        summary: draft.summary || '',
                        sourceDocument: draft.source?.name || ''
                    }
                    : {}
            )
            onCreated?.(response)
        } catch (err) {
            setError(err.message)
            setCreating(false)
        }
    }

    const keptCount = draft ? draft.tasks.filter(t => t.include).length : 0
    const keptHours = draft
        ? draft.tasks.filter(t => t.include).reduce((sum, t) => sum + Number(t.estimateHours || 0), 0)
        : 0

    return (
        <div className="import">
            {error && <p className="form-error" role="alert">{error}</p>}

            {!draft && (
                <div className="import-grid">
                    <section className="panel">
                        <div className="panel-header">
                            <h2>1. Give it the document</h2>
                            {engine && (
                                <span className="engine-chip">
                                    <span className={`engine-dot${engine.geminiConfigured ? ' engine-dot-live' : ''}`} aria-hidden="true" />
                                    {engine.geminiConfigured ? `Gemini · ${engine.model}` : 'Built-in reader'}
                                </span>
                            )}
                        </div>

                        <div className="panel-body import-input">
                            {/* Kept outside the dropzone on purpose. */}
                            <input
                                ref={fileInput}
                                type="file"
                                hidden
                                onChange={(event) => {
                                    chooseFile(event.target.files?.[0])
                                    // Let the same file be picked again after a Remove.
                                    event.target.value = ''
                                }}
                            />

                            <div
                                className={`dropzone${dragOver ? ' dropzone-over' : ''}${file ? ' dropzone-filled' : ''}`}
                                onDragOver={(event) => { event.preventDefault(); setDragOver(true) }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(event) => {
                                    event.preventDefault()
                                    setDragOver(false)
                                    chooseFile(event.dataTransfer.files?.[0])
                                }}
                                onClick={() => fileInput.current?.click()}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        fileInput.current?.click()
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                            >
                                {file ? (
                                    <>
                                        <strong>{file.name}</strong>
                                        <span className="muted">Click to choose a different file</span>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={(event) => { event.stopPropagation(); setFile(null) }}
                                        >
                                            Remove
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <strong>Drop a file here</strong>
                                        <span className="muted">PDF, Word, Markdown, CSV or text — up to 8 MB</span>
                                    </>
                                )}
                            </div>

                            <div className="or-line"><span>or paste the text</span></div>

                            <textarea
                                className="textarea import-textarea"
                                value={text}
                                onChange={(event) => { setText(event.target.value); setFile(null) }}
                                placeholder="Paste a brief, a set of requirements, or notes from a meeting."
                                disabled={Boolean(file)}
                            />

                            <button
                                type="button"
                                className="btn btn-ghost btn-sm sample-button"
                                onClick={() => { setText(SAMPLE); setFile(null) }}
                            >
                                Use a sample brief
                            </button>
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-header"><h2>2. Anything it should know</h2></div>
                        <div className="panel-body import-input">
                            <div className="field">
                                <label htmlFor="import-notes">Notes for the reader</label>
                                <textarea
                                    id="import-notes"
                                    className="textarea"
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    placeholder="Anything the document leaves out — the real deadline, who is away, which part is already done."
                                />
                            </div>

                            <div className="import-steps">
                                <span className="section-label">What happens next</span>
                                <ol>
                                    <li>The document is read and broken into tasks with estimates.</li>
                                    <li>Each task is matched to a department and, where possible, a person.</li>
                                    <li>You edit and remove anything you disagree with.</li>
                                    <li>The set is filed under one project, so it stays one piece of work.</li>
                                    <li>Nothing is created until you press the button.</li>
                                </ol>
                            </div>

                            <button type="button" className="btn import-go" onClick={analyse} disabled={reading}>
                                {reading ? 'Reading the document…' : 'Read it and draft tasks'}
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {draft && (
                <>
                    <section className="panel draft-head">
                        <div className="panel-body">
                            <div className="draft-top">
                                <div>
                                    <span className="section-label">What it understood</span>
                                    <p className="draft-summary">{draft.summary || 'No summary was produced.'}</p>
                                    <p className="muted draft-source">
                                        Read from {draft.source.name} · drafted by {draft.engine}
                                        {draft.source.truncated && ' · only the first part of the document was used'}
                                    </p>
                                </div>

                                <div className="draft-totals">
                                    <div><strong>{keptCount}</strong><span>tasks kept</span></div>
                                    <div><strong>{keptHours}h</strong><span>estimated</span></div>
                                    <div><strong>{draft.tasks.filter(t => t.include && t.assigneeId).length}</strong><span>with an owner</span></div>
                                </div>
                            </div>

                            {draft.notice && <p className="draft-notice">{draft.notice}</p>}
                        </div>
                    </section>

                    {/* Without this the twelve tasks scatter into their departments and the document they came. */}
                    <section className="panel">
                        <div className="panel-header"><h2>File these under a project</h2></div>
                        <div className="panel-body">
                            <label className="draft-group-toggle">
                                <input
                                    type="checkbox"
                                    checked={groupAsProject}
                                    onChange={(event) => setGroupAsProject(event.target.checked)}
                                />
                                Keep this document together as one project
                            </label>

                            {groupAsProject ? (
                                <div className="draft-project">
                                    <div className="field">
                                        <label htmlFor="draft-project-title">Project name</label>
                                        <input
                                            id="draft-project-title"
                                            className="input"
                                            value={projectTitle}
                                            onChange={(event) => setProjectTitle(event.target.value)}
                                            placeholder="Named from the document — change it to whatever the team calls it"
                                        />
                                    </div>

                                    <div className="field">
                                        <label htmlFor="draft-project-due">Target date</label>
                                        <input
                                            id="draft-project-due"
                                            className="input"
                                            type="date"
                                            value={projectDueDate}
                                            onChange={(event) => setProjectDueDate(event.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="field-hint">
                                    The tasks will be created on their own. You can still attach them
                                    to a project one at a time afterwards.
                                </p>
                            )}
                        </div>
                    </section>

                    <div className="draft-list">
                        {draft.tasks.map(task => (
                            <article key={task.key} className={`draft-task${task.include ? '' : ' draft-task-out'}`}>
                                <label className="draft-include">
                                    <input
                                        type="checkbox"
                                        checked={task.include}
                                        onChange={(event) => updateTask(task.key, { include: event.target.checked })}
                                        aria-label={`Keep ${task.title}`}
                                    />
                                </label>

                                <div className="draft-body">
                                    <input
                                        className="input draft-title"
                                        value={task.title}
                                        onChange={(event) => updateTask(task.key, { title: event.target.value })}
                                    />

                                    {task.reason && <p className="draft-reason">{task.reason}</p>}

                                    <div className="draft-controls">
                                        <label className="draft-control">
                                            <span>Department</span>
                                            <select
                                                className="select"
                                                value={task.department}
                                                onChange={(event) => updateTask(task.key, { department: event.target.value, assigneeId: '' })}
                                            >
                                                {departments.map(department => (
                                                    <option key={department.name} value={department.name}>{department.name}</option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="draft-control">
                                            <span>Owner</span>
                                            <select
                                                className="select"
                                                value={task.assigneeId || ''}
                                                onChange={(event) => updateTask(task.key, { assigneeId: event.target.value })}
                                            >
                                                <option value="">Nobody yet</option>
                                                {employees
                                                    .filter(person => person.department === task.department)
                                                    .map(person => (
                                                        <option key={person._id} value={person._id}>{person.name}</option>
                                                    ))}
                                            </select>
                                        </label>

                                        <label className="draft-control draft-control-sm">
                                            <span>Priority</span>
                                            <select
                                                className="select"
                                                value={task.priority}
                                                onChange={(event) => updateTask(task.key, { priority: event.target.value })}
                                            >
                                                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="draft-control draft-control-sm">
                                            <span>Hours</span>
                                            <input
                                                className="input"
                                                type="number"
                                                min="1"
                                                value={task.estimateHours}
                                                onChange={(event) => updateTask(task.key, { estimateHours: Number(event.target.value) })}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    <section className="panel draft-actions">
                        <div className="panel-body draft-actions-body">
                            <p className="muted">
                                Nothing has been created yet. This will add {keptCount} task
                                {keptCount === 1 ? '' : 's'} to the orbit.
                            </p>
                            <div className="page-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setDraft(null)}>
                                    Start over
                                </button>
                                <button type="button" className="btn" onClick={create} disabled={creating || keptCount === 0}>
                                    {creating ? 'Creating…' : `✓ Create ${keptCount} task${keptCount === 1 ? '' : 's'}`}
                                </button>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}
