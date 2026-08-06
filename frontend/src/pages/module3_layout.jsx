import { Outlet } from 'react-router-dom'
import '../styles/theme.css'

// Module 3 renders inside this wrapper, and styles/theme.css is scoped to the
// .m3 class it puts on the page.
//
// The reason is that this app has two design systems in it. The rest of the
// project uses Bootstrap plus the team's index.css; Module 3 brings its own
// tokens, panels and buttons. Both define .btn. Without a wrapper, whichever
// stylesheet the bundler happened to emit last would win, and adding this
// module would quietly restyle the leave form and the dashboards.
//
// Importing theme.css here rather than in main.jsx keeps that contained too:
// nothing loads until a Module 3 route is rendered.
export default function Module3Layout() {
    return (
        <div className="m3">
            <Outlet />
        </div>
    )
}
