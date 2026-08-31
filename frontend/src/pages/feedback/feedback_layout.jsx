import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { feedbackApi } from '../../lib/feedback_api'
import { ActorContext } from './feedback_context'
import { Icon } from './feedback_ui'
import './feedback.css'

// The module renders inside this wrapper.

const STORAGE_KEY = 'fb.actorId'

const TABS = [
    { to: '/feedback', end: true, label: 'Overview' },
    { to: '/feedback/write', label: 'Write a review' },
    { to: '/feedback/calibration', label: 'Calibration' },
    { to: '/feedback/reconciliation', label: 'Record vs reviewers' },
    { to: '/feedback/agent', label: 'Agent' },
    { to: '/feedback/trust', label: 'Trust log' }
]

// The two pages that actually write.
const WRITES = ['/feedback/write', '/feedback/agent']

const CONTEXT_LINE = {
    '/feedback/write': 'Manager, peer, self or client — all four land on the same record',
    '/feedback/calibration': 'Where reviewers disagree about the same people, and why',
    '/feedback/reconciliation': 'Where the work record and the people who work with them disagree',
    '/feedback/agent': 'Themes the agent found, drafted as objectives for you to approve',
    '/feedback/trust': 'Everything the agent touched, and which human signed it off'
}

export default function FeedbackLayout() {
    const { pathname } = useLocation()
    const [meta, setMeta] = useState(null)
    const [actorId, setActorId] = useState(() => localStorage.getItem(STORAGE_KEY) || '')

    useEffect(() => {
        feedbackApi.meta().then(setMeta).catch(() => {})
    }, [])

    const setActor = useCallback((id) => {
        setActorId(id)
        if (id) localStorage.setItem(STORAGE_KEY, id)
        else localStorage.removeItem(STORAGE_KEY)
    }, [])

    const actor = useMemo(
        () => meta?.employees?.find(e => e.id === actorId) || null,
        [meta, actorId]
    )

    const value = useMemo(() => ({ actor, actorId, setActor, meta }), [actor, actorId, setActor, meta])

    const contextLine = Object.entries(CONTEXT_LINE)
        .find(([path]) => pathname.startsWith(path))?.[1]
        || 'Manager, peer, self and client feedback on one record'

    return (
        <ActorContext.Provider value={value}>
            <div className="fb">
                <div className="fb-wrap">
                            <header className="fb-top">
                        <div className="fb-brand">
                            <span className="fb-logo"><Icon name="chat" size={22} /></span>
                            <div>
                                <h1>Feedback &amp; Evaluation</h1>
                                <span>Company Booster</span>
                            </div>
                        </div>

                        <nav className="fb-tabs">
                            {TABS.map(tab => (
                                <NavLink key={tab.to} to={tab.to} end={tab.end}
                                    className={({ isActive }) => (isActive ? 'on' : '')}>
                                    {tab.label}
                                </NavLink>
                            ))}
                        </nav>

                        {/* Every write is attributed to whoever is chosen here. */}
                        <div className="fb-field" style={{ minWidth: 190 }}>
                            <label htmlFor="fb-actor">Acting as</label>
                            <select id="fb-actor" value={actorId} onChange={e => setActor(e.target.value)}>
                                <option value="">Choose a person…</option>
                                {(meta?.employees || []).map(person => (
                                    <option key={person.id} value={person.id}>
                                        {person.name} · {person.jobTitle}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </header>

                    <p className="fb-ctx">{contextLine}</p>

                    {/* Only the pages that write anything are blocked by this. */}
                    {!actorId && WRITES.some(path => pathname.startsWith(path)) && (
                        <div className="fb-notice">
                            <span className="n-ic"><Icon name="chat" size={14} /></span>
                            <span>
                                Pick who you are in the <b>Acting as</b> box above before writing.
                                Every review and every approval is recorded against a named person, so
                                this page cannot save anything until one is chosen.
                            </span>
                        </div>
                    )}

                    <Outlet />
                </div>
            </div>
        </ActorContext.Provider>
    )
}
