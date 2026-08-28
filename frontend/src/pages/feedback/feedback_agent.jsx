import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { feedbackApi } from '../../lib/feedback_api'
import { useActor } from './feedback_context'
import { formatDate } from './feedback_format'
import { Avatar, Icon } from './feedback_ui'

// The agent's inbox.
//
// This is the loop-closer. The agent reads every submitted review, finds themes
// raised by three or more separate reviewers, and drafts the objective that
// would address each one — already shaped for the Task & Objective module.
//
// It cannot create anything itself. Approving is the only route from here into
// that module, the draft is editable before it goes, and both the decision and
// any edit are written to the trust log against a named person. That is the
// human-in-the-loop requirement, built as a gate rather than as a promise.

export default function FeedbackAgent() {
    const { actorId } = useActor()

    const [signals, setSignals] = useState([])
    const [loading, setLoading] = useState(true)
    const [scanning, setScanning] = useState(false)
    const [error, setError] = useState('')
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState('')
    const [editing, setEditing] = useState({})
    const [filter, setFilter] = useState('proposed')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await feedbackApi.signals(filter === 'all' ? {} : { status: filter })
            setSignals(data.signals)
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [filter])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    const runScan = async () => {
        setScanning(true)
        setError('')
        try {
            const result = await feedbackApi.scan({})
            setNote(
                `Read ${result.scanned} reviews. ${result.themes} themes seen, ${result.metThreshold} cleared the bar, `
                + `${result.created} raised${result.heldBack ? `, ${result.heldBack} held back until these are decided` : ''}. `
                + `Engine: ${result.engine}.`
            )
            await load()
        } catch (err) {
            setError(err.message)
        } finally {
            setScanning(false)
        }
    }

    const decide = async (id, action) => {
        if (!actorId) return setError('Choose who you are in the Acting as box first.')

        setBusy(id)
        setError('')
        try {
            const edits = editing[id]
            if (action === 'approve') {
                await feedbackApi.approve(id, { actorId, edits: edits || undefined })
            } else {
                await feedbackApi.dismiss(id, { actorId, note: edits?.note || '' })
            }
            setEditing(prev => { const next = { ...prev }; delete next[id]; return next })
            await load()
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy('')
        }
    }

    const edit = (id, key, value, base) => setEditing(prev => ({
        ...prev,
        [id]: { ...(prev[id] || { title: base.title, description: base.description }), [key]: value }
    }))

    return (
        <div className="fb-grid">
            {error && <div className="fb-err s12">{error}</div>}
            {note && <div className="fb-ok s12">{note}</div>}

            <section className="fb-card s12">
                <div className="fb-lbl">
                    <span>The feedback agent</span>
                    <span className="fb-pill navy">{signals.length} shown</span>
                </div>
                <p className="fb-sub">
                    Reads every submitted review and looks for a theme raised by <b>three or more different
                    reviewers</b> — one person's opinion is not a pattern. For each, it drafts the objective
                    that would address it. It creates nothing until you approve, and only ever raises the
                    strongest theme per person, so nobody is handed five objectives at once.
                </p>

                <div style={{ display: 'flex', gap: 9, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="fb-btn" onClick={runScan} disabled={scanning}>
                        <Icon name="spark" size={14} />
                        {scanning ? 'Reading the reviews…' : 'Run the agent'}
                    </button>

                    <div className="fb-tabs" style={{ marginLeft: 'auto' }}>
                        {['proposed', 'approved', 'dismissed', 'all'].map(value => (
                            <a key={value} className={filter === value ? 'on' : ''}
                                onClick={(e) => { e.preventDefault(); setFilter(value) }} href="#!">
                                {value[0].toUpperCase() + value.slice(1)}
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <section className="fb-card s12">
                {loading && signals.length === 0
                    ? <div className="fb-skel" style={{ height: 180 }} />
                    : signals.length === 0
                        ? (
                            <p className="fb-state">
                                {filter === 'proposed'
                                    ? 'Nothing waiting on a decision. Press “Run the agent” to look again.'
                                    : `No ${filter} proposals.`}
                            </p>
                        )
                        : signals.map(signal => {
                            const draft = editing[signal.id] || signal.proposal
                            const open = signal.status === 'proposed'

                            return (
                                <div className={`fb-prop ${signal.status !== 'proposed' ? signal.status : signal.severity}`} key={signal.id}>
                                    <div className="p-head">
                                        <Avatar person={signal.employee} size="sm" />
                                        <b style={{ fontSize: 13 }}>{signal.employee?.name}</b>
                                        <span className="fb-pill rose">{signal.theme}</span>
                                        <span className="fb-pill plain">
                                            {signal.occurrences} reviewers
                                            {signal.averageScore !== null ? ` · avg ${signal.averageScore}/5` : ''}
                                        </span>
                                        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--f-muted)' }}>
                                            drafted by {signal.engine}
                                        </span>
                                    </div>

                                    {/* The evidence, in the agent's own words. */}
                                    <p className="p-why">{signal.rationale}</p>

                                    <div className="p-draft">
                                        <div className="d-l">Drafted {signal.proposal.kind} — not created yet</div>

                                        {open ? (
                                            <>
                                                <div className="fb-field" style={{ marginTop: 7 }}>
                                                    <input value={draft.title}
                                                        onChange={e => edit(signal.id, 'title', e.target.value, signal.proposal)} />
                                                </div>
                                                <div className="fb-field" style={{ marginTop: 7 }}>
                                                    <textarea value={draft.description} style={{ minHeight: 62 }}
                                                        onChange={e => edit(signal.id, 'description', e.target.value, signal.proposal)} />
                                                </div>
                                                <span className="fb-hint">
                                                    Edit before approving if you want — the change is recorded in the trust log.
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="d-t">{signal.proposal.title}</div>
                                                <div className="d-d">{signal.proposal.description}</div>
                                            </>
                                        )}
                                    </div>

                                    {open ? (
                                        <div className="p-acts">
                                            <button className="fb-btn go sm" disabled={!actorId || busy === signal.id}
                                                onClick={() => decide(signal.id, 'approve')}>
                                                <Icon name="check" size={13} />
                                                {busy === signal.id ? 'Creating…' : 'Approve into projects'}
                                            </button>
                                            <button className="fb-btn ghost sm" disabled={!actorId || busy === signal.id}
                                                onClick={() => decide(signal.id, 'dismiss')}>
                                                <Icon name="cross" size={13} /> Dismiss
                                            </button>
                                            <Link className="fb-btn ghost sm" to={`/feedback/employee/${signal.employeeId}`}>
                                                Read the evidence
                                            </Link>
                                            {!actorId && <span className="fb-hint warn">Choose who you are first.</span>}
                                        </div>
                                    ) : (
                                        <div className="p-acts">
                                            <span className={`fb-pill ${signal.status === 'approved' ? 'green' : 'plain'}`}>
                                                {signal.status === 'approved' ? 'Approved' : 'Dismissed'} by {signal.decidedByName}
                                                {' · '}{formatDate(signal.decidedAt)}
                                            </span>
                                            {signal.status === 'approved' && signal.createdRef && (
                                                <Link className="fb-btn ghost sm" to="/projects">See it in projects</Link>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
            </section>
        </div>
    )
}
