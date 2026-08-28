import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { budgetApi } from '../../lib/budget_api'
import { BudgetContext } from './budget_context'
import { Icon } from './budget_ui'
import './budget.css'

const STORAGE_KEY = 'bud.actorId'

const TABS = [
    { to: '/budget', end: true, label: 'Projects' },
    { to: '/budget/clock', label: 'Time clock' },
    { to: '/budget/simulate', label: 'What if' },
    { to: '/budget/advisor', label: 'Advisor' },
    { to: '/budget/rates', label: 'Rates' }
]

const CONTEXT = {
    '/budget/simulate': 'The consequence of a decision, before you make it',
    '/budget/advisor': 'What went wrong, and what to budget differently next time',
    '/budget/clock': 'Clock on and off, or log hours you forgot to start',
    '/budget/rates': 'Cost and bill rates, dated — a raise applies from the day it happened'
}

export default function BudgetLayout() {
    const { pathname } = useLocation()
    const [meta, setMeta] = useState(null)
    const [actorId, setActorId] = useState(() => localStorage.getItem(STORAGE_KEY) || '')

    useEffect(() => { budgetApi.meta().then(setMeta).catch(() => {}) }, [])

    const setActor = useCallback((id) => {
        setActorId(id)
        if (id) localStorage.setItem(STORAGE_KEY, id)
        else localStorage.removeItem(STORAGE_KEY)
    }, [])

    const value = useMemo(() => ({ meta, actorId, setActor }), [meta, actorId, setActor])
    const contextLine = Object.entries(CONTEXT).find(([p]) => pathname.startsWith(p))?.[1]
        || 'What each project is trending to, not just what it has spent'

    return (
        <BudgetContext.Provider value={value}>
            <div className="bud">
                <div className="bd-wrap">
                            <header className="bd-top">
                        <div className="bd-brand">
                            <span className="bd-logo"><Icon name="coin" size={22} /></span>
                            <div>
                                <h1>Project Budgets</h1>
                                <span>Company Booster</span>
                            </div>
                        </div>

                        <nav className="bd-tabs">
                            {TABS.map(tab => (
                                <NavLink key={tab.to} to={tab.to} end={tab.end}
                                    className={({ isActive }) => (isActive ? 'on' : '')}>
                                    {tab.label}
                                </NavLink>
                            ))}
                        </nav>

                        <div className="bd-field" style={{ minWidth: 190 }}>
                            <label htmlFor="bd-actor">Working as</label>
                            <select id="bd-actor" value={actorId} onChange={e => setActor(e.target.value)}>
                                <option value="">Choose a person…</option>
                                {(meta?.employees || []).map(person => (
                                    <option key={person.id} value={person.id}>{person.name} · {person.jobTitle}</option>
                                ))}
                            </select>
                        </div>
                    </header>

                    <p className="bd-ctx">{contextLine}</p>
                    <Outlet />
                </div>
            </div>
        </BudgetContext.Provider>
    )
}
