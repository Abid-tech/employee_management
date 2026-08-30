import "../../index.css"
import { Link } from "react-router-dom"

function Home() {

    return (

        <section className="home-page">

            <div className="container">

                <div className="row min-vh-100 align-items-center g-5">

                    {/* ================= LEFT SIDE ================= */}

                    <div className="col-lg-7">

                        <span className="home-badge">
                            Welcome to your workplace
                        </span>


                        <h1 className="home-title mt-3">

                            Manage Your Workforce

                            <span>
                                {" "}Efficiently
                            </span>

                        </h1>


                        <p className="home-description">

                            A complete solution to manage employees,
                            attendance, leaves, payroll, meetings,
                            projects and performance — all in one place.

                        </p>


                        {/* ================= FEATURES ================= */}

                        <div className="row mt-4">

                            {/* Employee Management */}

                            <div className="col-md-6 mb-3">

                                <div className="home-feature">

                                    <div className="feature-icon employee-icon">
                                        <i className="bi bi-people"></i>
                                    </div>

                                    <div>

                                        <h6>
                                            Employee Management
                                        </h6>

                                        <p>
                                            Manage employees and their information
                                        </p>

                                    </div>

                                </div>

                            </div>


                            {/* Attendance */}

                            <div className="col-md-6 mb-3">

                                <div className="home-feature">

                                    <div className="feature-icon attendance-icon">
                                        <i className="bi bi-calendar-check"></i>
                                    </div>

                                    <div>

                                        <h6>
                                            Attendance & GPS
                                        </h6>

                                        <p>
                                            Track attendance with location verification
                                        </p>

                                    </div>

                                </div>

                            </div>


                            {/* Leave */}

                            <div className="col-md-6 mb-3">

                                <div className="home-feature">

                                    <div className="feature-icon leave-icon">
                                        <i className="bi bi-file-earmark-text"></i>
                                    </div>

                                    <div>

                                        <h6>
                                            Leave Management
                                        </h6>

                                        <p>
                                            Apply and manage employee leaves
                                        </p>

                                    </div>

                                </div>

                            </div>


                            {/* Payroll */}

                            <div className="col-md-6 mb-3">

                                <div className="home-feature">

                                    <div className="feature-icon payroll-icon">
                                        <i className="bi bi-wallet2"></i>
                                    </div>

                                    <div>

                                        <h6>
                                            Payroll & Reports
                                        </h6>

                                        <p>
                                            Manage salary and business reports
                                        </p>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* ================= RIGHT SIDE ================= */}

                    <div className="col-lg-5">

                        <div className="auth-card">

                            <div className="auth-card-icon">

                                <i className="bi bi-person-circle"></i>

                            </div>


                            <h2>
                                Get Started
                            </h2>


                            <p className="auth-card-description">

                                Access your employee management
                                dashboard or create a new account.

                            </p>


                            {/* Login */}

                            <Link
                                to="/login"
                                className="btn btn-primary auth-login-btn"
                            >

                                <i className="bi bi-box-arrow-in-right me-2"></i>

                                Login

                            </Link>


                            {/* Registration */}

                            <Link
                                to="/registration"
                                className="btn btn-outline-primary auth-register-btn"
                            >

                                <i className="bi bi-person-plus me-2"></i>

                                Create Account

                            </Link>


                            <div className="auth-divider">

                                <span>
                                    Secure Employee Management
                                </span>

                            </div>


                            <div className="auth-features">

                                <div>
                                    <i className="bi bi-shield-check"></i>
                                    Secure access
                                </div>

                                <div>
                                    <i className="bi bi-speedometer2"></i>
                                    Easy to manage
                                </div>

                                <div>
                                    <i className="bi bi-people"></i>
                                    Built for teams
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>


            {/* Decorative background elements */}

            <div className="home-decoration home-decoration-one"></div>

            <div className="home-decoration home-decoration-two"></div>

        </section>

    )

}

export default Home