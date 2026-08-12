import "../../index.css"
import { Link, useLocation } from 'react-router-dom'

function Header() {
    const location = useLocation()

    const links = [
        { to: '/', label: 'Holiday Mgmt' },
        { to: '/employees', label: 'Employees' },
        { to: '/admin-calendar', label: 'Admin Calendar' },
        { to: '/employee-calendar', label: 'My Calendar' },
    ]

    return (
        <nav className="navbar navbar-expand-lg">
            <div className="container">
                <Link className="navbar-brand" to="/"><h4>Employee Manager</h4></Link>
                <div className="d-flex gap-2 flex-wrap">
                    {links.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            style={{
                                color: location.pathname === link.to ? '#F3E4C9' : 'rgba(243,228,201,0.6)',
                                textDecoration: 'none',
                                fontSize: '13px',
                                fontWeight: location.pathname === link.to ? '700' : '500',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                background: location.pathname === link.to ? 'rgba(243,228,201,0.15)' : 'transparent',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    )
}

export default Header