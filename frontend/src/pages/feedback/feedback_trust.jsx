import { useCallback, useEffect, useState } from 'react'
import { feedbackApi } from '../../lib/feedback_api'
import { formatDate, relative } from './feedback_format'
import { Icon } from './feedback_ui'

// The trust log.
//
// Performance evaluation is one of the uses regulators treat as higher-risk, and
// what that actually demands is less about the model and more about the record:
// a human stayed in the loop, and you can show afterwards who it was.
//
// So this is append-only. Nothing here can be edited or deleted, because a log
// you can edit is not evidence. Agent actions and human decisions are separated
// by colour, so "what did the software do on its own" is answerable at a glance.

const ACTION_COPY = {
    'agent.scanned': 'Read the reviews',
    'agent.proposed': 'Drafted a proposal',
    'human.approved': 'Approved',
    'human.dismissed': 'Dismissed',
    'human.edited': 'Edited a draft',
    'review.submitted': 'Review submitted',
    'review.acknowledged': 'Review acknowledged',
    'calibration.flagged': 'Calibration finding'
}

export default function FeedbackTrust() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [only, setOnly] = useState('all')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await feedbackApi.audit({ limit: 120 }))
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
        return <div className="fb-card s12"><div className="fb-skel" style={{ height: 320 }} /></div>
    }
    if (error && !data) {
        return <><div className="fb-err">{error}</div><button className="fb-btn" onClick={load}>Try again</button></>
    }

    const events = data.events.filter(e => only === 'all' || e.actorKind === only)
    const agentCount = data.events.filter(e => e.actorKind === 'agent').length
    const humanCount = data.events.filter(e => e.actorKind === 'human').length

    return (
        <div className="fb-grid">
            {error && <div className="fb-err s12">{error}</div>}

            <section className="fb-card s12">
                <div className="fb-lbl">
                    <span>Trust log</span>
                    <span className="fb-pill plain">append-only</span>
                </div>
                <p className="fb-sub">
                    Everything the agent did, and every human decision that followed it. Nothing on this
                    page can be edited or deleted.
                </p>

                <div className="fb-kpis">
                    <div className="fb-kpi">
                        <div className="k-l">Proposals raised</div>
                        <div className="k-n">{data.counts.proposed + data.counts.approved + data.counts.dismissed}</div>
                        <div className="k-s">by the agent, all time</div>
                    </div>
                    <div className="fb-kpi good">
                        <div className="k-l">Approved by a human</div>
                        <div className="k-n">{data.counts.approved}</div>
                        <div className="k-s">reached the projects module</div>
                    </div>
                    <div className="fb-kpi">
                        <div className="k-l">Dismissed</div>
                        <div className="k-n">{data.counts.dismissed}</div>
                        <div className="k-s">rejected by a manager</div>
                    </div>
                    <div className="fb-kpi warn">
                        <div className="k-l">Awaiting a decision</div>
                        <div className="k-n">{data.counts.proposed}</div>
                        <div className="k-s">created nothing yet</div>
                    </div>
                </div>

                <div className="fb-tabs" style={{ marginTop: 14 }}>
                    {[['all', `Everything (${data.events.length})`], ['agent', `The agent (${agentCount})`], ['human', `People (${humanCount})`]].map(([value, label]) => (
                        <a key={value} href="#!" className={only === value ? 'on' : ''}
                            onClick={(e) => { e.preventDefault(); setOnly(value) }}>
                            {label}
                        </a>
                    ))}
                </div>
            </section>

            <section className="fb-card s12">
                <div className="fb-lbl"><span>Every entry, newest first</span><Icon name="shield" size={14} /></div>

                {events.length === 0
                    ? <p className="fb-state">Nothing recorded yet. Run the agent from the Agent tab.</p>
                    : (
                        <div className="fb-log">
                            {events.map(event => (
                                <div className={`e ${event.actorKind}`} key={event.id}>
                                    <span className="dot">
                                        <Icon name={event.actorKind === 'agent' ? 'spark' : 'shield'} size={13} />
                                    </span>
                                    <span style={{ minWidth: 0, flex: 1 }}>
                                        <span className="t">{event.summary}</span>
                                        <span className="m">
                                            <b style={{ color: 'var(--f-soft)' }}>{ACTION_COPY[event.action] || event.action}</b>
                                            {' · '}{event.actorName}
                                            {event.engine ? ` · ${event.engine}` : ''}
                                            {' · '}{formatDate(event.at)} ({relative(event.at)})
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
            </section>
        </div>
    )
}
