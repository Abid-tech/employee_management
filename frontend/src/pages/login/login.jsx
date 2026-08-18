import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../../index.css"


function Login({ setUser }) {

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const navigate = useNavigate()


    const handleLogin = async (e) => {

        e.preventDefault()

        try {

            const response = await fetch(
                "http://localhost:5000/user/login",
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

                // Go to home
                navigate("/")

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

                        <div className="login-header">
                            <h3>Welcome Back</h3>
                            <p>
                                Sign in to your account to continue
                            </p>
                        </div>


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


                        <div className="signup-link">
                            <span>
                                Don't have an account?
                            </span>

                            <a href="/registration">
                                {" "}Sign up
                            </a>
                        </div>

                    </div>

                </div>

            </section>
        </>
    )
}


export default Login