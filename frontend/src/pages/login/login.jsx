import { API_BASE } from '../../lib/api_base'
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import "../../index.css"


function Login({ setUser }) {

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const navigate = useNavigate()


    const handleLogin = async (e) => {

        e.preventDefault()

        try {

            const response = await fetch(
                `${API_BASE}/user/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            )


            const result = await response.json()

            console.log(result)


            if (response.ok) {

                // Store logged-in user in App state
                setUser(result.user)

                // Redirect based on role
                result.user?.role === "Employee"
                    ? navigate("/employee-dashboard")
                    : result.user?.role === "Admin" ||
                      result.user?.role === "Director"
                        ? navigate("/admin-dashboard")
                        : navigate("/")

            } else {

                alert(result.message || "Login failed")

            }

        } catch (err) {

            console.error("Login error:", err)

            alert("Something went wrong")

        }
    }


    return (
        <>

            <section id="login-section">

                <div className="container">

                    <div className="login-wrapper">

                        {/* ================= LOGO ================= */}

                        <div className="login-logo">

                            <Link to="/">
                                CompanyBooster
                            </Link>

                            <p>
                                Sign in to your account to continue
                            </p>

                        </div>


                        {/* ================= HEADER ================= */}


                        {/* ================= LOGIN FORM ================= */}

                        <form onSubmit={handleLogin}>

                            <div className="mb-3">

                                <label className="form-label">
                                    Email Address
                                </label>

                                <input
                                    type="email"
                                    className="form-control"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(e.target.value)
                                    }
                                    required
                                />

                            </div>


                            <div className="mb-2">

                                <label className="form-label">
                                    Password
                                </label>

                                <input
                                    type="password"
                                    className="form-control"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                />

                            </div>


                            <div className="login-submit">

                                <button
                                    type="submit"
                                    className="btn login-btn"
                                >
                                    Login
                                </button>

                            </div>

                        </form>


                        {/* ================= SIGN UP ================= */}

                        <div className="signup-link">

                            <span>
                                Don't have an account?
                            </span>

                            <Link to="/registration">
                                {" "}Sign up
                            </Link>

                        </div>

                    </div>

                </div>

            </section>

        </>
    )
}


export default Login
