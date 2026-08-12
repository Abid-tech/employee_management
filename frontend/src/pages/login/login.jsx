import {useEffect, useState} from 'react'
import '../../index.css'

function Login() {
    return (
        <>
        <section id="login-section">
            <div className="container">

                <div className="login-wrapper">

                    {/* Header */}
                    <div className="login-header">
                        <h3>Welcome Back</h3>
                        <p>Sign in to your account to continue</p>
                    </div>

                    <form>

                        {/* Email */}
                        <div className="mb-3">
                            <label className="form-label">
                                Email Address
                            </label>

                            <input
                                type="email"
                                className="form-control"
                                placeholder="Enter your email"
                            />
                        </div>


                        {/* Password */}
                        <div className="mb-2">
                            <label className="form-label">
                                Password
                            </label>

                            <input
                                type="password"
                                className="form-control"
                                placeholder="Enter your password"
                            />
                        </div>


                        {/* Login Button */}
                        <div className="login-submit">
                            <button
                                type="submit"
                                className="btn login-btn"
                            >
                                Login
                            </button>
                        </div>

                    </form>


                    {/* Signup */}
                    <div className="signup-link">
                        <span>Don't have an account?</span>
                        <a href="/registration"> Sign up</a>
                    </div>

                </div>

            </div>
        </section>
        </>
    )
}
export default Login