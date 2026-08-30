import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { feedbackApi } from '../../lib/feedback_api'
import { SOURCE, formatDate, relative, sourceColour } from './feedback_format'
import { Avatar, Icon, Score, SourceTag } from './feedback_ui'

// Page 1 — the whole feedback picture at a glance.
//
// Ordered by what a manager can act on. The people waiting on feedback after a
// delivery come before the leaderboard-style roster, because a review written
// while the project is still fresh is worth more than one written in a cycle
// three months later.

export default function Feedback() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await feedbackApi.overview())
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    if (loading && !data) {
        return (
            <div className="fb-grid">
                <div className="fb-card s12"><div className="fb-skel" style={{ height: 110 }} /></div>
                <div className="fb-card s7"><div className="fb-skel" style={{ height: 280 }} /></div>
                <div className="fb-card s5"><div className="fb-skel" style={{ height: 280 }} /></div>
            </div>
        )
    }

    if (error && !data) {
        return (
            <>
                <div className="fb-err">{error}</div>
                <button className="fb-btn" onClick={load}>Try again</button>
            </>
        )
    }

    const { summary, bySource, roster, pendingAfterDelivery, signals, recent, trail } = data

    return (
        <div className="fb-grid">
            {error && <div className="fb-err s12">{error}</div>}

            {/* ---- Headline ---- */}
            <section className="fb-card s12">
                <div className="fb-lbl">
                    <span>Feedback across the company</span>
                    <span className="fb-pill navy">{summary.peopleCovered} people covered</span>
                </div>

                <div className="fb-kpis">
                    <div className="fb-kpi good">
                        <div className="k-l">Average rating</div>
                        <div className="k-n">{summary.averageOverall ?? '—'}<small style={{ fontSize: 14, color: 'var(--f-muted)' }}>/5</small></div>
                        <div className="k-s">across {summary.total} submitted reviews</div>
                    </div>
                    <div className="fb-kpi">
                        <div className="k-l">Client feedback</div>
                        <div className="k-n">{summary.clientReviews}</div>
                        <div className="k-s">reviews from outside the company</div>
                    </div>
                    <div className={`fb-kpi ${summary.unacknowledged > 0 ? 'warn' : ''}`}>
                        <div className="k-l">Not yet read</div>
                        <div className="k-n">{summary.unacknowledged}</div>
                        <div className="k-s">written but never acknowledged</div>
                    </div>
                    <div className={`fb-kpi ${summary.openProposals > 0 ? 'risk' : ''}`}>
                        <div className="k-l">Waiting on you</div>
                        <div className="k-n">{summary.openProposals}</div>
                        <div className="k-s">agent proposals to decide</div>
                    </div>
                </div>

                <div className="fb-legend">
                    {bySource.map(entry => (
                        <span className="l" key={entry.source}>
                            <i style={{ background: sourceColour(entry.source) }} />
                            {SOURCE[entry.source]?.label}
                            <b>{entry.count}</b>
                            <span style={{ color: 'var(--f-muted)' }}>avg {entry.average ?? '—'}</span>
                        </span>
                    ))}
                </div>
            </section>

            {/* ---- Waiting on feedback after a delivery ---- */}
            <section className="fb-card s7">
                <div className="fb-lbl">
                    <span>Delivered work with no feedback yet</span>
                    <Icon name="briefcase" size={14} />
                </div>
                <p className="fb-sub">
                    People who finished work on a project and have had nothing said about it.
                </p>

                {pendingAfterDelivery.length === 0
                    ? <p className="fb-state">Everyone who delivered recently has had feedback.</p>
                    : pendingAfterDelivery.slice(0, 6).map(item => (
                        <div className="fb-row" key={`${item.employeeId}-${item.objectiveId}`}>
                            <Avatar person={{ name: item.employeeName, color: item.color }} />
                            <span className="r-b">
                                <span className="r-t">{item.employeeName}</span>
                                <span className="r-s">
                                    {item.tasksDelivered} tasks on “{item.objectiveTitle}”
                                </span>
                            </span>
                            <span className="r-r">
                                <Link className="fb-btn sm" to={`/feedback/write?employee=${item.employeeId}&objective=${item.objectiveId}`}>
                                    <Icon name="plus" size={13} /> Give feedback
                                </Link>
                            </span>
                        </div>
                    ))}
            </section>

            {/* ---- Agent proposals ---- */}
            <section className="fb-card s5">
                <div className="fb-lbl">
                    <span>The agent is waiting on a decision</span>
                    <span className="fb-pill gold">{signals.length}</span>
                </div>
                <p className="fb-sub">
                    Themes raised by three or more separate reviewers, each drafted as an objective.
                    Nothing is created until you approve it.
                </p>

                {signals.length === 0
                    ? <p className="fb-state">Nothing waiting. Run the agent from the Agent tab.</p>
                    : signals.map(signal => (
                        <div className="fb-row" key={signal.id}>
                            <Avatar person={signal.employee} size="sm" />
                            <span className="r-b">
                                <span className="r-t">
                                    {signal.employee?.name}
                                    <span className="fb-pill rose">{signal.theme}</span>
                                </span>
                                <span className="r-s">{signal.occurrences} reviewers · avg {signal.averageScore ?? '—'}/5</span>
                            </span>
                        </div>
                    ))}

                {signals.length > 0 && (
                    <Link className="fb-btn" to="/feedback/agent" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
                        Review the proposals <Icon name="right" size={13} />
                    </Link>
                )}
            </section>

            {/* ---- Everyone ---- */}
            <section className="fb-card s7">
                <div className="fb-lbl"><span>Everyone with feedback on record</span><Icon name="users" size={14} /></div>
                <p className="fb-sub">Open a person to see all four sources on one chart.</p>

                <div style={{ marginTop: 6 }}>
                    {roster.map(person => (
                        <Link className="fb-row" key={person.id} to={`/feedback/employee/${person.id}`}>
                            <Avatar person={person} />
                            <span className="r-b">
                                <span className="r-t">
                                    {person.name}
                                    {person.unread > 0 && <span className="fb-pill gold">{person.unread} unread</span>}
                                </span>
                                <span className="r-s">
                                    {person.jobTitle} · {person.department} · {person.reviewCount} reviews
                                    from {person.sourceCount} of 4 sources
                                </span>
                            </span>
                            <span className="r-r">
                                <span style={{ display: 'inline-flex', gap: 3, marginRight: 10, verticalAlign: 'middle' }}>
                                    {['manager', 'peer', 'self', 'client'].map(source => (
                                        <i key={source} title={SOURCE[source].label} style={{
                                            width: 7, height: 7, borderRadius: '50%', display: 'block',
                                            background: person.sources.includes(source) ? sourceColour(source) : 'var(--f-sage)'
                                        }} />
                                    ))}
                                </span>
                                <Score value={person.average} />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ---- Recent + trail ---- */}
            <section className="fb-card s5">
                <div className="fb-lbl"><span>Latest feedback</span><Icon name="clock" size={14} /></div>

                {recent.length === 0
                    ? <p className="fb-state">No feedback submitted yet.</p>
                    : recent.map(review => (
                        <Link className="fb-row" key={review.id} to={`/feedback/employee/${review.employeeId}`}>
                            <span className="r-b">
                                <span className="r-t">
                                    <SourceTag source={review.source} />
                                    {review.employee?.name}
                                </span>
                                <span className="r-s">
                                    from {review.reviewerName} · {relative(review.submittedAt || review.createdAt)}
                                    {review.objectiveTitle ? ` · ${review.objectiveTitle}` : ''}
                                </span>
                            </span>
                            <span className="r-r"><Score value={review.overall} /></span>
                        </Link>
                    ))}

                <div className="fb-lbl" style={{ marginTop: 16 }}>
                    <span>Trust log</span>
                    <Link to="/feedback/trust" style={{ fontSize: 10, color: 'var(--f-navy)' }}>See all</Link>
                </div>
                <div className="fb-log">
                    {trail.slice(0, 4).map(event => (
                        <div className={`e ${event.actorKind}`} key={event.id}>
                            <span className="dot">
                                <Icon name={event.actorKind === 'agent' ? 'spark' : 'shield'} size={13} />
                            </span>
                            <span>
                                <span className="t">{event.summary}</span>
                                <span className="m">{event.actorName} · {formatDate(event.at)}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
