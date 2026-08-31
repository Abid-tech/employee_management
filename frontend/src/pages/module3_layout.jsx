import { Outlet } from 'react-router-dom'
import '../styles/theme.css'

// Module 3 renders inside this wrapper.
export default function Module3Layout() {
    return (
        <div className="m3">
            <Outlet />
        </div>
    )
}
