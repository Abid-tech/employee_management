import "../../index.css"
import { Link, useNavigate } from "react-router-dom"


function Header({ user, setUser }) {

    const navigate = useNavigate()


    const handleLogout = async () => {

        try {

            const response = await fetch(
                "http://localhost:9505/user/logout",
                {
                    method: "POST",
                    credentials: "include"
                }
            )


            const result = await response.json()

            console.log(result)


            if (response.ok) {

                setUser(null)

                navigate("/login")

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
                        to="/"
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

                            {/* ========================= */}
                            {/* MODULE 3-6 LINKS */}
                            {/* Task, performance, feedback and budget stay */}
                            {/* reachable whoever is signed in.             */}
                            {/* ========================= */}

                            <li className="nav-item">
                                <Link className="nav-link" to="/tasks">Task orbit</Link>
                            </li>

                            <li className="nav-item">
                                <Link className="nav-link" to="/projects">Projects</Link>
                            </li>

                            <li className="nav-item">
                                <Link className="nav-link" to="/performance">Performance</Link>
                            </li>

                            <li className="nav-item">
                                <Link className="nav-link" to="/feedback">Feedback</Link>
                            </li>

                            <li className="nav-item">
                                <Link className="nav-link" to="/budget">Budget</Link>
                            </li>



                     

                            {!user && (

                                <li className="nav-item">

                                    <Link
                                        className="nav-link"
                                        to="/login"
                                    >
                                        Login
                                    </Link>

                                </li>

                            )}



                            {user && user.role === "Employee" && (

                                <>

                                    <li className="nav-item">

                                        <Link
                                            className="nav-link"
                                            to="/employee-dashboard"
                                        >
                                            Employee Dashboard
                                        </Link>

                                    </li>


                                    <li className="nav-item">

                                        <Link
                                            className="nav-link"
                                            to="/Leave-management"
                                        >
                                            Leave Management
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

                                </>

                            )}


                            {/* ========================= */}
                            {/* ADMIN LINKS */}
                            {/* ========================= */}

                            {user && user.role === "Admin" && (

                                <li className="nav-item">

                                    <Link
                                        className="nav-link"
                                        to="/admin-dashboard"
                                    >
                                        Admin Dashboard
                                    </Link>

                                </li>

                            )}


                            {/* ========================= */}
                            {/* USER DROPDOWN */}
                            {/* ========================= */}

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