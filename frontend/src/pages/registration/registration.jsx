import { API_BASE } from '../../lib/api_base'
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import "../../index.css"


function Registration() {

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        department: "",
        password: "",
        confirmPassword: "",
        role: "Employee"
    })


    const handleChange = (e) => {
        const { name, value } = e.target

        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }))
    }


    const handleSubmit = async (e) => {
        e.preventDefault()

        // Check if passwords match
        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match")
            return
        }


        try {

            const response = await fetch(`${API_BASE}/user/registration`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    department: formData.department,
                    password: formData.password,
                    role: formData.role
                })
            })


            const result = await response.json()

            console.log("Server response:", result)


            if (response.ok) {
                alert("Account created successfully")

                // Clear form
                setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    department: "",
                    password: "",
                    confirmPassword: "",
                    role: "Employee"
                })
            }
            else {
                alert(result.message || "Registration failed")
            }

        }
        catch (err) {
            console.error("Registration error:", err)
            alert("Something went wrong")
        }
    }


    return (
        <>
            <section id="registration-section">
                <div className="container">

                    <div className="registration-wrapper">

                        <div className="login-logo registration-logo">

                            <Link to="/">
                                CompanyBooster
                            </Link>

                            <p>
                                Register a new employee account
                            </p>

                        </div>


                        <form onSubmit={handleSubmit}>

                            {/* Name */}
                            <div className="row g-3">

                                <div className="col-md-6">
                                    <label className="form-label">
                                        First Name
                                    </label>

                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className="form-control"
                                        placeholder="Enter first name"
                                        required
                                    />
                                </div>


                                <div className="col-md-6">
                                    <label className="form-label">
                                        Last Name
                                    </label>

                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className="form-control"
                                        placeholder="Enter last name"
                                        required
                                    />
                                </div>

                            </div>


                            {/* Email + Phone */}
                            <div className="row g-3 mt-1">

                                <div className="col-md-6">
                                    <label className="form-label">
                                        Email Address
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="form-control"
                                        placeholder="example@email.com"
                                        required
                                    />
                                </div>


                                <div className="col-md-6">
                                    <label className="form-label">
                                        Phone Number
                                    </label>

                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="form-control"
                                        placeholder="Enter phone number"
                                        required
                                    />
                                </div>

                            </div>


                            {/* Department */}
                            <div className="row g-3 mt-1">

                                <div className="col-md-12">

                                    <label className="form-label">
                                        Department
                                    </label>

                                    <select
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        className="form-select"
                                        required
                                    >

                                        <option value="">
                                            Select department
                                        </option>

                                        <option value="Human Resources">
                                            Human Resources
                                        </option>

                                        <option value="Finance">
                                            Finance
                                        </option>

                                        <option value="IT">
                                            IT
                                        </option>

                                        <option value="Marketing">
                                            Marketing
                                        </option>

                                        <option value="Administration">
                                            Administration
                                        </option>

                                    </select>

                                </div>

                            </div>


                            {/* Password */}
                            <div className="row g-3 mt-1">

                                <div className="col-md-6">

                                    <label className="form-label">
                                        Password
                                    </label>

                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="form-control"
                                        placeholder="Create a password"
                                        required
                                    />

                                </div>


                                <div className="col-md-6">

                                    <label className="form-label">
                                        Confirm Password
                                    </label>

                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="form-control"
                                        placeholder="Confirm your password"
                                        required
                                    />

                                </div>

                            </div>


                            {/* Submit */}
                            <div className="registration-submit">

                                <button
                                    type="submit"
                                    className="btn registration-btn"
                                >
                                    Create Account
                                </button>

                            </div>

                        </form>

                        <div className="signup-link">

                            <span>
                                Already have an account?
                            </span>

                            <Link to="/login">
                                {" "}login
                            </Link>

                        </div>

                    </div>

                </div>
            </section>
        </>
    )
}


export default Registration
