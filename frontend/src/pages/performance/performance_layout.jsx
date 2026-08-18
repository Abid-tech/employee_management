import { NavLink, Outlet, useLocation } from 'react-router-dom'
import './performance.css'
import { Icon } from './performance_ui'

// Module 4 renders inside this wrapper, and performance.css is scoped to the
// .perf class it puts on the page.
//
// Same reasoning as Module 3's layout: this app carries more than one design
// system. Bootstrap and the team's index.css style most pages, Module 3 brings
// its own tokens under .m3, and this module brings a third set. All three define
// .card and .btn. Without a wrapper, whichever stylesheet the bundler emitted
// last would win, and adding performance management would quietly restyle the
// leave form and the dashboards.
//
// Importing the stylesheet here rather than in main.jsx keeps that contained
// too: nothing loads until a performance route is actually rendered.
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
                        <NavLink to="/performance/reports" className={({ isActive }) => (isActive ? 'on' : '')}>
                            Reports
                        </NavLink>
                    </nav>
                </header>

                {/* A profile is reached from the leaderboard, so it gets no tab of
                    its own — but the context line should still say where you are. */}
                <p className="p-ctx">
                    {pathname.includes('/performance/employee')
                        ? <>Individual record</>
                        : pathname.includes('/reports')
                            ? <>Pick the columns, filter, then export</>
                            : <>Scored from completed tasks, deadlines, logged hours and comments</>}
                </p>

                <Outlet />
            </div>
        </div>
    )
}
