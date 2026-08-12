import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { PRIORITY_LABELS, STATUS_LABELS, formatDate, formatFileSize, initialsOf, relativeDays, timeAgo } from '../../lib/format'
import './task_detail.css'

// Page 2 — everything about one task, and the few things you can do to it.
export default function TaskDetail() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [task, setTask] = useState(null)
    const [employees, setEmployees] = useState([])
    const [comments, setComments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState('')
    const [newSubtask, setNewSubtask] = useState('')
    const [message, setMessage] = useState('')
    const [asQuestion, setAsQuestion] = useState(false)

    const fileInput = useRef(null)

    const load = useCallback(async () => {
        try {
            const response = await api.task(id)
            setTask(response.task)
            setEmployees(response.employees)
            setComments(response.comments || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [id])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    const run = async (key, action) => {
        setBusy(key)
        try {
            await action()
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy('')
        }
    }

    const change = (changes) => run('change', async () => {
        const response = await api.updateTask(id, changes)
        setTask(response.task)
    })

    const toggle = (subtaskId) => run(`sub-${subtaskId}`, async () => {
        const response = await api.toggleSubtask(id, subtaskId)
        setTask(response.task)
    })

    const addSubtask = (event) => {
        event.preventDefault()
        if (!newSubtask.trim()) return

        return run('add', async () => {
            const response = await api.addSubtask(id, newSubtask.trim())
            setTask(response.task)
            setNewSubtask('')
        })
    }

    const uploadFile = (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        return run('file', async () => {
            await api.uploadAttachment(id, file)
            await load()
            if (fileInput.current) fileInput.current.value = ''
        })
    }

    const removeFile = (fileId) => run(`file-${fileId}`, async () => {
        await api.deleteAttachment(id, fileId)
        await load()
    })

    const postMessage = (event) => {
        event.preventDefault()
        if (!message.trim()) return

        return run('comment', async () => {
            const response = await api.addComment(id, {
                body: message.trim(),
                kind: asQuestion ? 'question' : 'comment',
                authorName: 'Moumita Heena'
            })
            setComments(current => [...current, response.comment])
            setMessage('')
            setAsQuestion(false)
        })
    }

    const remove = () => {
        if (!window.confirm('Delete this task? This cannot be undone.')) return

        return run('delete', async () => {
            await api.deleteTask(id)
            navigate('/tasks')
        })
    }

    if (loading) return <div className="page"><p className="muted">Loading…</p></div>

    if (!task) {
        return (
            <div className="page">
                <p className="detail-error" role="alert">{error || 'That task could not be found.'}</p>
                <Link to="/tasks" className="btn btn-secondary detail-back-btn">Back to the orbit</Link>
            </div>
        )
    }

    const done = task.status === 'done'
    const openQuestions = comments.filter(c => c.kind === 'question' && !c.resolved).length

    return (
        <div className="page">
            <div>
                <Link to="/tasks" className="back-link">← Back to the orbit</Link>

                <header className="page-head">
                    <div className="page-title">
                        <div className="detail-badges">
                            <span className={`pill pill-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
                            <span className={`pill pill-plain ${done ? 'pill-done' : 'pill-status'}`}>{STATUS_LABELS[task.status]}</span>
                            {task.overdue && <span className="pill pill-plain pill-overdue">{relativeDays(task.daysLeft)}</span>}
                            <span className="tag">{task.department}</span>
                        </div>
                        <h1>{task.title}</h1>
                        {task.objective && (
                            <p>Part of <Link to={`/projects/${task.objectiveId}`}><strong>{task.objective.title}</strong></Link></p>
                        )}
                    </div>

                    <div className="page-actions">
                        {!done && (
                            <button
                                type="button"
                                className="btn"
                                onClick={() => change({ status: 'done' })}
                                disabled={busy === 'change'}
                            >
                                ✓ Mark done
                            </button>
                        )}
                        <button type="button" className="btn btn-ghost" onClick={remove} disabled={busy === 'delete'}>
                            Delete
                        </button>
                    </div>
                </header>
            </div>

            {error && <p className="detail-error" role="alert">{error}</p>}

            <div className="detail-grid">
                <div className="detail-main">
                    <section className="panel">
                        <div className="panel-header"><h2>What needs doing</h2></div>
                        <div className="panel-body">
                            {task.description
                                ? <p className="detail-description">{task.description}</p>
                                : <p className="muted">No description was added.</p>}
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-header">
                            <h2>Checklist</h2>
                            <span className="muted checklist-count">
                                {task.subtasksDone} of {task.subtasks.length} done
                            </span>
                        </div>

                        <div className="panel-body">
                            {task.subtasks.length === 0 && (
                                <p className="muted checklist-hint">
                                    Break the task into steps and the progress below is measured
                                    from them instead of guessed.
                                </p>
                            )}

                            <ul className="checklist">
                                {task.subtasks.map(subtask => (
                                    <li key={subtask.id} className={subtask.done ? 'checklist-done' : ''}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={subtask.done}
                                                onChange={() => toggle(subtask.id)}
                                                disabled={busy === `sub-${subtask.id}`}
                                            />
                                            <span>{subtask.title}</span>
                                        </label>
                                        {subtask.done && subtask.completedAt && (
                                            <span className="checklist-when">{timeAgo(subtask.completedAt)}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>

                            <form className="checklist-add" onSubmit={addSubtask}>
                                <input
                                    className="input"
                                    value={newSubtask}
                                    onChange={(event) => setNewSubtask(event.target.value)}
                                    placeholder="Add a step"
                                />
                                <button type="submit" className="btn btn-secondary" disabled={busy === 'add' || !newSubtask.trim()}>
                                    Add
                                </button>
                            </form>
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-header">
                            <h2>Files</h2>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => fileInput.current?.click()}
                                disabled={busy === 'file'}
                            >
                                {busy === 'file' ? 'Uploading…' : 'Attach a file'}
                            </button>
                        </div>

                        <div className="panel-body">
                            <input ref={fileInput} type="file" onChange={uploadFile} hidden />

                            {task.attachments.length === 0 ? (
                                <p className="muted">Nothing attached yet. Up to 5 MB per file.</p>
                            ) : (
                                <ul className="file-list">
                                    {task.attachments.map(file => (
                                        <li key={file._id}>
                                            <a href={api.attachmentUrl(task.id, file._id)} className="file-row" download>
                                                <span className="file-icon" aria-hidden="true" />
                                                <span className="file-text">
                                                    <strong>{file.filename}</strong>
                                                    <span className="muted">{formatFileSize(file.size)} · {timeAgo(file.createdAt)}</span>
                                                </span>
                                            </a>
                                            <button
                                                type="button"
                                                className="file-remove"
                                                onClick={() => removeFile(file._id)}
                                                disabled={busy === `file-${file._id}`}
                                                aria-label={`Remove ${file.filename}`}
                                            >
                                                ×
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-header">
                            <h2>Questions &amp; comments</h2>
                            {openQuestions > 0 && (
                                <span className="pill pill-plain pill-open-q">
                                    {openQuestions} unanswered
                                </span>
                            )}
                        </div>

                        <div className="panel-body">
                            {comments.length === 0 ? (
                                <p className="muted">
                                    Nothing yet. Ask a question if something here is unclear —
                                    it stays marked open until somebody replies.
                                </p>
                            ) : (
                                <ul className="comment-list">
                                    {comments.map(comment => (
                                        <li key={comment._id} className={comment.kind === 'question' ? 'comment comment-question' : 'comment'}>
                                            <span
                                                className="avatar-sm"
                                                style={{ background: comment.author?.color || 'var(--clay)' }}
                                            >
                                                {initialsOf(comment.author?.name || comment.authorName)}
                                            </span>

                                            <div className="comment-body">
                                                <div className="comment-meta">
                                                    <strong>{comment.author?.name || comment.authorName}</strong>
                                                    <span className="muted">{timeAgo(comment.createdAt)}</span>
                                                    {comment.kind === 'question' && (
                                                        <span className={`pill pill-plain ${comment.resolved ? 'pill-done' : 'pill-open-q'}`}>
                                                            {comment.resolved ? 'Answered' : 'Question'}
                                                        </span>
                                                    )}
                                                </div>
                                                <p>{comment.body}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <form className="comment-form" onSubmit={postMessage}>
                                <textarea
                                    className="textarea"
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    placeholder={asQuestion
                                        ? 'What do you need to know before you can continue?'
                                        : 'Add a comment'}
                                />
                                <div className="comment-actions">
                                    <label className="comment-toggle">
                                        <input
                                            type="checkbox"
                                            checked={asQuestion}
                                            onChange={(event) => setAsQuestion(event.target.checked)}
                                        />
                                        Ask as a question
                                    </label>
                                    <button type="submit" className="btn" disabled={busy === 'comment' || !message.trim()}>
                                        {busy === 'comment' ? 'Posting…' : 'Post'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>
                </div>

                <aside className="detail-side">
                    <section className="panel">
                        <div className="panel-body progress-panel">
                            {/* The same progress arc used on the planets, drawn larger. */}
                            <div className="progress-ring">
                                <svg viewBox="0 0 100 100" aria-hidden="true">
                                    <circle className="progress-track" cx="50" cy="50" r="42" />
                                    <circle
                                        className={`progress-fill fill-${task.priority}`}
                                        cx="50" cy="50" r="42"
                                        strokeDasharray={2 * Math.PI * 42}
                                        strokeDashoffset={2 * Math.PI * 42 * (1 - task.progress / 100)}
                                    />
                                </svg>
                                <span>{task.progress}%</span>
                            </div>

                            <div className="progress-text">
                                <strong>{task.progress}% complete</strong>
                                <span className="muted">
                                    {task.subtasks.length > 0
                                        ? 'Calculated from the checklist.'
                                        : 'Taken from the status — add a checklist for a finer measure.'}
                                </span>
                            </div>
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-header"><h2>Details</h2></div>
                        <div className="panel-body">
                            <div className="meta-row">
                                <span className="meta-label">Assignee</span>
                                <span className="meta-value">
                                    {task.assignee ? (
                                        <span className="meta-person">
                                            <span className="avatar" style={{ background: task.assignee.color }}>
                                                {initialsOf(task.assignee.name)}
                                            </span>
                                            <span>
                                                {task.assignee.name}
                                                <em>{task.assignee.jobTitle}</em>
                                            </span>
                                        </span>
                                    ) : <span className="muted">Nobody yet</span>}
                                </span>
                            </div>

                            <div className="meta-row">
                                <span className="meta-label">Due</span>
                                <span className="meta-value">
                                    {formatDate(task.dueDate)}
                                    {task.daysLeft !== null && (
                                        <em className={task.overdue ? 'meta-late' : ''}>{relativeDays(task.daysLeft)}</em>
                                    )}
                                </span>
                            </div>

                            <div className="meta-row">
                                <span className="meta-label">Effort</span>
                                <span className="meta-value">
                                    {task.estimateHours}h estimated
                                    <em>{task.remainingHours}h still to do</em>
                                </span>
                            </div>

                            <div className="meta-row">
                                <span className="meta-label">Project</span>
                                <span className="meta-value">
                                    {task.objective
                                        ? <Link to={`/projects/${task.objectiveId}`}>{task.objective.title}</Link>
                                        : <span className="muted">Not part of one</span>}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* The dates the work actually moved through, not just when
                        the record was made. Each one is stamped by the service
                        layer as the status changes, so they cannot be edited
                        into saying something that did not happen. */}
                    <section className="panel">
                        <div className="panel-header"><h2>Dates</h2></div>
                        <div className="panel-body">
                            <div className="meta-row">
                                <span className="meta-label">Created</span>
                                <span className="meta-value">
                                    {formatDate(task.createdAt)}
                                    <em>{timeAgo(task.createdAt)}</em>
                                </span>
                            </div>

                            <div className="meta-row">
                                <span className="meta-label">Assigned</span>
                                <span className="meta-value">
                                    {task.assignedAt ? formatDate(task.assignedAt) : <span className="muted">Not assigned</span>}
                                    {task.assignedAt && <em>{timeAgo(task.assignedAt)}</em>}
                                </span>
                            </div>

                            <div className="meta-row">
                                <span className="meta-label">Started</span>
                                <span className="meta-value">
                                    {task.startedAt ? formatDate(task.startedAt) : <span className="muted">Not started</span>}
                                    {task.startedAt && <em>{timeAgo(task.startedAt)}</em>}
                                </span>
                            </div>

                            <div className="meta-row">
                                <span className="meta-label">Finished</span>
                                <span className="meta-value">
                                    {task.completedAt ? formatDate(task.completedAt) : <span className="muted">Not yet</span>}
                                    {task.completedAt && <em>{timeAgo(task.completedAt)}</em>}
                                </span>
                            </div>

                            <div className="meta-row">
                                <span className="meta-label">Last change</span>
                                <span className="meta-value">{timeAgo(task.updatedAt)}</span>
                            </div>
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-header"><h2>Change it</h2></div>
                        <div className="panel-body detail-controls">
                            <div className="field">
                                <label htmlFor="detail-status">Status</label>
                                <select
                                    id="detail-status"
                                    className="select"
                                    value={task.status}
                                    onChange={(event) => change({ status: event.target.value })}
                                    disabled={busy === 'change'}
                                >
                                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label htmlFor="detail-priority">Priority</label>
                                <select
                                    id="detail-priority"
                                    className="select"
                                    value={task.priority}
                                    onChange={(event) => change({ priority: event.target.value })}
                                    disabled={busy === 'change'}
                                >
                                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                <span className="field-hint">Changing this moves the task to a different orbit ring.</span>
                            </div>

                            <div className="field">
                                <label htmlFor="detail-assignee">Assignee</label>
                                <select
                                    id="detail-assignee"
                                    className="select"
                                    value={task.assigneeId || ''}
                                    onChange={(event) => change({ assigneeId: event.target.value || null })}
                                    disabled={busy === 'change'}
                                >
                                    <option value="">Nobody yet</option>
                                    {employees
                                        .filter(person => person.department === task.department)
                                        .map(person => (
                                            <option key={person._id} value={person._id}>{person.name}</option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    )
}
