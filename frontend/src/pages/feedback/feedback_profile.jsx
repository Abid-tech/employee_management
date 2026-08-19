import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { feedbackApi } from '../../lib/feedback_api'
import { useActor } from './feedback_context'
import { SOURCE, formatDate, relative, sourceColour } from './feedback_format'
import { Avatar, Bar, Icon, Radar, Score, SourceTag, Timeline } from './feedback_ui'

// One person's record — and the argument for the whole module.
//
// Manager, peer, self and client feedback are drawn on one set of axes rather
// than in four tabs. The disagreement between them is the finding: where the
// self polygon sits outside everyone else's, that is a blind spot; where a
// client rates delivery well above the internal view, the team is being harder
// on itself than the people paying for the work are.

export default function FeedbackProfile() {
    const { id } = useParams()
    const { actorId } = useActor()

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState('')
    const [reply, setReply] = useState({})

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await feedbackApi.employee(id))
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [id])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    const acknowledge = async (reviewId) => {
        setBusy(reviewId)
        try {
            await feedbackApi.acknowledge(reviewId, { actorId, response: reply[reviewId] || '' })
            setReply(prev => ({ ...prev, [reviewId]: '' }))
            await load()
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy('')
        }
    }

    if (loading && !data) {
        return (
            <div className="fb-grid">
                <div className="fb-card s12"><div className="fb-skel" style={{ height: 90 }} /></div>
                <div className="fb-card s5"><div className="fb-skel" style={{ height: 320 }} /></div>
                <div className="fb-card s7"><div className="fb-skel" style={{ height: 320 }} /></div>
            </div>
        )
    }

    if (error && !data) {
        return (
            <>
                <div className="fb-err">{error}</div>
                <Link className="fb-back" to="/feedback"><Icon name="left" size={13} /> Back</Link>
            </>
        )
    }

    const { employee, graph, history, signals, competencies } = data

    // The axes where the person's own view is furthest from everyone else's.
    const blindSpots = graph.radar
        .filter(a => a.selfGap !== null && Math.abs(a.selfGap) >= 0.6)
        .sort((a, b) => Math.abs(b.selfGap) - Math.abs(a.selfGap))

    return (
        <div className="fb-grid">
            {error && <div className="fb-err s12">{error}</div>}

            {/* ---- Header ---- */}
            <section className="fb-card s12">
                <Link className="fb-back" to="/feedback"><Icon name="left" size={13} /> Back to everyone</Link>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
                    <Avatar person={employee} size="lg" />
                    <div style={{ minWidth: 0 }}>
                        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 650, letterSpacing: '-.02em' }}>{employee.name}</h2>
                        <div style={{ fontSize: 12, color: 'var(--f-muted)' }}>
                            {employee.jobTitle} · {employee.department}
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.03em' }}>
                            {graph.average ?? '—'}<span style={{ fontSize: 15, color: 'var(--f-muted)' }}>/5</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--f-muted)' }}>
                            {graph.reviewCount} reviews · {graph.bySource.filter(s => s.count > 0).length} of 4 sources
                        </div>
                    </div>
                    <Link className="fb-btn" to={`/feedback/write?employee=${employee.id}`}>
                        <Icon name="plus" size={13} /> Add feedback
                    </Link>
                </div>
            </section>

            {/* ---- The one graph ---- */}
            <section className="fb-card s5">
                <div className="fb-lbl"><span>All four sources, one chart</span></div>

                <Radar axes={graph.radar} />

                <div className="fb-legend" style={{ justifyContent: 'center' }}>
                    {graph.bySource.filter(s => s.count > 0).map(entry => (
                        <span className="l" key={entry.source}>
                            <i style={{ background: sourceColour(entry.source) }} />
                            {SOURCE[entry.source].label}
                            <b>{entry.average ?? '—'}</b>
                        </span>
                    ))}
                </div>

                {blindSpots.length > 0 && (
                    <div className="fb-find" style={{ marginTop: 14 }}>
                        <div className="f-h">
                            {blindSpots[0].selfGap > 0 ? 'Rates themselves above the room' : 'Rates themselves below the room'}
                        </div>
                        <dl>
                            <dt>Where</dt>
                            <dd>
                                {blindSpots.map(a => (
                                    `${a.label} (${a.selfGap > 0 ? '+' : ''}${a.selfGap})`
                                )).join(', ')}
                            </dd>
                            <dt>So what</dt>
                            <dd>
                                {blindSpots[0].selfGap > 0
                                    ? 'They are more confident on these than their colleagues are. Worth walking through a specific example rather than restating the score.'
                                    : 'They are harder on themselves here than anyone else is. Often the fastest confidence win available to a manager.'}
                            </dd>
                        </dl>
                    </div>
                )}
            </section>

            {/* ---- Competency detail + timeline ---- */}
            <section className="fb-card s7">
                <div className="fb-lbl"><span>Every review over time</span></div>
                <Timeline points={graph.timeline} />

                <div className="fb-legend">
                    {Object.entries(SOURCE).map(([key, meta]) => (
                        <span className="l" key={key}><i style={{ background: meta.colour }} />{meta.label}</span>
                    ))}
                </div>

                <div className="fb-lbl" style={{ marginTop: 16 }}><span>By competency</span></div>
                <div style={{ marginTop: 6 }}>
                    {graph.radar.map(axis => {
                        const tone = axis.overall === null ? '' : axis.overall >= 4 ? 'green' : axis.overall >= 3 ? '' : axis.overall >= 2.4 ? 'gold' : 'rose'
                        return (
                            <div className="fb-rate" key={axis.competency}>
                                <span className="n">
                                    {axis.label}
                                    <small>{axis.blurb}</small>
                                </span>
                                <Bar value={axis.overall ?? 0} tone={tone} />
                                <Score value={axis.overall} />
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* ---- Agent proposals for this person ---- */}
            {signals.length > 0 && (
                <section className="fb-card s12">
                    <div className="fb-lbl">
                        <span>What the agent drew from this feedback</span>
                        <Link to="/feedback/agent" style={{ fontSize: 10, color: 'var(--f-navy)' }}>Decide on these</Link>
                    </div>
                    {signals.map(signal => (
                        <div className={`fb-prop ${signal.status === 'approved' ? 'approved' : signal.status === 'dismissed' ? 'dismissed' : signal.severity}`} key={signal.id}>
                            <div className="p-head">
                                <span className="fb-pill navy">{signal.theme}</span>
                                <b style={{ fontSize: 12.5 }}>{signal.proposal.title}</b>
                                <span className="fb-pill plain" style={{ marginLeft: 'auto' }}>
                                    {signal.status === 'proposed' ? 'Awaiting a decision' : `${signal.status} by ${signal.decidedByName}`}
                                </span>
                            </div>
                            <p className="p-why">{signal.rationale}</p>
                        </div>
                    ))}
                </section>
            )}

            {/* ---- The history ---- */}
            <section className="fb-card s12">
                <div className="fb-lbl">
                    <span>Evaluation history</span>
                    <span className="fb-pill plain">{history.length} on record</span>
                </div>
                <p className="fb-sub">
                    Nothing here is ever overwritten — a review from an earlier cycle reads exactly as it was signed off.
                </p>

                {history.length === 0
                    ? <p className="fb-state">No feedback on record for this person yet.</p>
                    : history.map(review => (
                        <div key={review.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--f-line)' }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                <SourceTag source={review.source} />
                                <b style={{ fontSize: 12.5 }}>{review.reviewerName}</b>
                                <span style={{ fontSize: 11, color: 'var(--f-muted)' }}>
                                    {review.cycle}
                                    {review.objectiveTitle ? ` · ${review.objectiveTitle}` : ''}
                                    {' · '}{formatDate(review.submittedAt || review.createdAt)}
                                </span>
                                <span style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
                                    {review.status === 'submitted'
                                        ? <span className="fb-pill gold">Not yet read</span>
                                        : <span className="fb-pill green">Acknowledged {relative(review.acknowledgedAt)}</span>}
                                    <Score value={review.overall} />
                                </span>
                            </div>

                            {review.ratings.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 9 }}>
                                    {review.ratings.map(rating => (
                                        <span key={rating.competency} style={{ fontSize: 11, color: 'var(--f-muted)' }}>
                                            {competencies.find(c => c.key === rating.competency)?.label || rating.competency}{' '}
                                            <b style={{ color: 'var(--f-text)', fontFamily: 'var(--f-mono)' }}>{rating.score}</b>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {review.strengths && <p className="fb-quote"><b>Strengths.</b> {review.strengths}</p>}
                            {review.improvements && <p className="fb-quote"><b>To improve.</b> {review.improvements}</p>}
                            {review.employeeResponse && <p className="fb-quote"><b>Their reply.</b> {review.employeeResponse}</p>}

                            {review.status === 'submitted' && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                                    <input
                                        className="fb-reply"
                                        placeholder="Optional reply before acknowledging…"
                                        value={reply[review.id] || ''}
                                        onChange={e => setReply(prev => ({ ...prev, [review.id]: e.target.value }))}
                                        style={{
                                            flex: 1, minWidth: 200, font: 'inherit', fontSize: 12.5,
                                            background: 'var(--f-surface)', border: '1px solid var(--f-line-2)',
                                            borderRadius: 9, padding: '8px 11px', color: 'var(--f-text)'
                                        }}
                                    />
                                    <button className="fb-btn go sm" disabled={!actorId || busy === review.id}
                                        onClick={() => acknowledge(review.id)}>
                                        <Icon name="check" size={13} />
                                        {busy === review.id ? 'Saving…' : 'Mark as read'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
            </section>
        </div>
    )
}
