import { API_BASE } from '../../lib/api_base'
import "../../index.css"
import { Link, useNavigate } from "react-router-dom"


function Header({ user, setUser }) {

    const navigate = useNavigate()


    const handleLogout = async () => {

        try {

            const response = await fetch(
                `${API_BASE}/user/logout`,
                {
                    method: "POST",
                    credentials: "include"
                }
            )


            const result = await response.json()

            console.log(result)


            if (response.ok) {

                setUser(null)

                navigate("/")

            }

        } catch (err) {

            console.error("Logout error:", err)

        }
    }


    return (
        <>
            <nav className="navbar navbar-expand-lg">

                <div className="container">

                    {/* Logo */}

                    <Link
                        className="navbar-brand"
                        to={
                            user?.role === "Employee"
                                ? "/employee-dashboard"
                                : user?.role === "Admin" || user?.role === "Director"
                                    ? "/admin-dashboard"
                                    : "/"
                        }
                    >
                        <h4>CompanyBooster</h4>
                    </Link>


                    {/* Mobile toggle */}

                    <button
                        className="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#navbarSupportedContent"
                        aria-controls="navbarSupportedContent"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>


                    <div
                        className="collapse navbar-collapse"
                        id="navbarSupportedContent"
                    >

                        <ul className="navbar-nav ms-auto mb-2 mb-lg-0">

                        
                            {!user && (

                                <>

                                    <li className="nav-item">

                                        <Link
                                            className="nav-link"
                                            to="/login"
                                        >
                                            Login
                                        </Link>

                                    </li>


                                    <li className="nav-item">

                                        <Link
                                            className="nav-link"
                                            to="/registration"
                                        >
                                            Register
                                        </Link>

                                    </li>

                                </>

                            )}



                            {user && user.role === "Employee" && (

                                    <>

                                        {/* Main Employee Links */}

                                        <li className="nav-item">
                                            <Link
                                                className="nav-link"
                                                to="/employee-dashboard"
                                            >
                                                Dashboard
                                            </Link>
                                        </li>


                                        <li className="nav-item">
                                            <Link
                                                className="nav-link"
                                                to="/attendance"
                                            >
                                                Attendance
                                            </Link>
                                        </li>


                                        <li className="nav-item">
                                            <Link
                                                className="nav-link"
                                                to="/tasks"
                                            >
                                                Tasks
                                            </Link>
                                        </li>


                                        <li className="nav-item">
                                            <Link
                                                className="nav-link"
                                                to="/projects"
                                            >
                                                Projects
                                            </Link>
                                        </li>


                                        <li className="nav-item">
                                            <Link
                                                className="nav-link"
                                                to="/book-room"
                                            >
                                                Book Room
                                            </Link>
                                        </li>


                                        {/* ========================= */}
                                        {/* MORE MENU */}
                                        {/* ========================= */}

                                        <li className="nav-item dropdown">

                                            <button
                                                className="nav-link dropdown-toggle more-dropdown-btn"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            >
                                                More
                                            </button>


                                            <ul className="dropdown-menu dropdown-menu-end employee-more-menu">

                                                <li>
                                                    <Link
                                                        className="dropdown-item"
                                                        to="/Leave-management"
                                                    >
                                                        <i className="bi bi-calendar-x me-2"></i>
                                                        Leave Management
                                                    </Link>
                                                </li>


                                                <li>
                                                    <Link
                                                        className="dropdown-item"
                                                        to="/employee/resources"
                                                    >
                                                        <i className="bi bi-folder me-2"></i>
                                                        Resources
                                                    </Link>
                                                </li>


                                                <li>
                                                    <Link
                                                        className="dropdown-item"
                                                        to="/employee/assets"
                                                    >
                                                        <i className="bi bi-box-seam me-2"></i>
                                                        My Assets
                                                    </Link>
                                                </li>


                                                <li>
                                                    <Link
                                                        className="dropdown-item"
                                                        to="/performance"
                                                    >
                                                        <i className="bi bi-graph-up me-2"></i>
                                                        Performance
                                                    </Link>
                                                </li>


                                                <li>
                                                    <Link
                                                        className="dropdown-item"
                                                        to="/feedback"
                                                    >
                                                        <i className="bi bi-chat-square-text me-2"></i>
                                                        Feedback
                                                    </Link>
                                                </li>


                                                <li>
                                                    <Link
                                                        className="dropdown-item"
                                                        to="/budget"
                                                    >
                                                        <i className="bi bi-wallet2 me-2"></i>
                                                        Budget
                                                    </Link>
                                                </li>


                                                <li>
                                                    <Link
                                                        className="dropdown-item"
                                                        to="/meeting/create"
                                                    >
                                                        <i className="bi bi-people me-2"></i>
                                                        Meetings
                                                    </Link>
                                                </li>


                                                <li>
                                                    <Link
                                                        className="dropdown-item"
                                                        to="/calendar"
                                                    >
                                                        <i className="bi bi-calendar3 me-2"></i>
                                                        Calendar
                                                    </Link>
                                                </li>


                                                <li>
                                                    <Link
                                                        className="dropdown-item"
                                                        to="/attendance/insights"
                                                    >
                                                        <i className="bi bi-bar-chart me-2"></i>
                                                        My Attendance
                                                    </Link>
                                                </li>

                                            </ul>

                                        </li>

                                    </>

                                )}


                            {/* ========================= */}
                            {/* ADMIN AND DIRECTOR LINKS */}
                            {/* ========================= */}

                            {user && (user.role === "Admin" || user.role === "Director") && (

                                <>

                                    {user.role === "Admin" && (

                                        <li className="nav-item">

                                            <Link
                                                className="nav-link"
                                                to="/admin-dashboard"
                                            >
                                                Admin Dashboard
                                            </Link>

                                        </li>

                                    )}




                                    <li className="nav-item">

                                        <Link
                                            className="nav-link"
                                            to="/holidays"
                                        >
                                            Holidays
                                        </Link>

                                    </li>


                                    <li className="nav-item">

                                        <Link
                                            className="nav-link"
                                            to="/add-room"
                                        >
                                            Add Room
                                        </Link>

                                    </li>


                                    <li className="nav-item">

                                        <Link
                                            className="nav-link"
                                            to="/admin/resources"
                                        >
                                            Resources
                                        </Link>

                                    </li>


                                    <li className="nav-item">

                                        <Link
                                            className="nav-link"
                                            to="/admin/assets"
                                        >
                                            Assets
                                        </Link>

                                    </li>

                                </>

                            )}


                        
                            {/* USER DROPDOWN */}
                           

                            {user && (

                                <li className="nav-item dropdown">

                                    <button
                                        className="nav-link dropdown-toggle user-dropdown-btn"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer"
                                        }}
                                    >

                                        {user.firstName.length > 15
                                            ? user.firstName.substring(0, 15) + "..."
                                            : user.firstName
                                        }

                                    </button>


                                    <ul className="dropdown-menu dropdown-menu-end">

                                        <li className="dropdown-item-text">

                                            <small className="text-muted">

                                                Role: {user.role}

                                            </small>

                                        </li>


                                        <li>
                                            <hr className="dropdown-divider" />
                                        </li>


                                        <li className="logout-btn">

                                            <button
                                                className="dropdown-item"
                                                onClick={handleLogout}
                                            >
                                                Logout
                                            </button>

                                        </li>

                                    </ul>

                                </li>

                            )}

                        </ul>

                    </div>

                </div>

            </nav>
        </>
    )
}


export default Header