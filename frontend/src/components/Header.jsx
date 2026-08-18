import { useNavigate, NavLink } from 'react-router-dom'
import { api } from '../lib/api'
import NotificationBell from './NotificationBell'

function Header({ user, setUser }) {
    const navigate = useNavigate()

    const handleLogout = async () => {
        await api.logout()
        setUser(null)
    }

    return (
        <nav className="navbar">
            <div className="container d-flex align-items-center">
                <div className="navbar-brand">
                    <h4>Employee Management</h4>
                </div>
                <ul className="navbar-nav d-flex flex-row gap-1 ms-auto align-items-center">
                    <li className="nav-item">
                        <NavLink to={user.role === 'Admin' ? '/admin-dashboard' : '/dashboard'} className="nav-link">
                            Dashboard
                        </NavLink>
                    </li>
                    <li className="nav-item">
                        <NavLink to="/calendar" className="nav-link">Calendar</NavLink>
                    </li>
                    {user.role === 'Admin' && (
                        <li className="nav-item">
                            <NavLink to="/holidays" className="nav-link">Holidays</NavLink>
                        </li>
                    )}
                    <li className="nav-item">
                        <NotificationBell />
                    </li>
                    <li className="nav-item ms-2">
                        <span style={{ fontSize: '12px', color: 'var(--beige-color)', opacity: 0.7 }}>
                            {user.firstName} ({user.role})
                        </span>
                    </li>
                    <li className="nav-item logout-btn ms-2">
                        <button onClick={handleLogout}>Logout</button>
                    </li>
                </ul>
            </div>
        </nav>
    )
}

export default Header
