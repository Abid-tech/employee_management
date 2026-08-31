import { NavLink, Outlet, useLocation } from 'react-router-dom'
import './performance.css'
import { Icon } from './performance_ui'

// Module 4 renders inside this wrapper.
export default function PerformanceLayout() {
    const { pathname } = useLocation()

    return (
        <div className="perf">
            <div className="p-wrap">
                        <header className="p-top">
                    <div className="p-brand">
                        <span className="p-logo"><Icon name="trophy" size={22} /></span>
                        <div>
                            <h1>Performance</h1>
                            <span>Company Booster</span>
                        </div>
                    </div>

                    <nav className="p-tabs">
                        <NavLink to="/performance" end className={({ isActive }) => (isActive ? 'on' : '')}>
                            Overview
                        </NavLink>
                        <NavLink to="/performance/rebalance" className={({ isActive }) => (isActive ? 'on' : '')}>
                            Rebalance
                        </NavLink>
                        <NavLink to="/performance/reports" className={({ isActive }) => (isActive ? 'on' : '')}>
                            Reports
                        </NavLink>
                    </nav>
                </header>

                {/* A profile is reached from the leaderboard, so it gets no tab of its own. */}
                <p className="p-ctx">
                    {pathname.includes('/performance/employee')
                        ? <>Individual record</>
                        : pathname.includes('/rebalance')
                            ? <>Which work can move, to whom, and what it costs</>
                        : pathname.includes('/reports')
                            ? <>Pick the columns, filter, then export</>
                            : <>Scored from completed tasks, deadlines, logged hours and comments</>}
                </p>

                <Outlet />
            </div>
        </div>
    )
}
