import { useState, useEffect } from "react"
import "../../index.css" 

function Registration() {
    return (
        <>
        <section id="registration-section">
            <div className="container">

                <div className="registration-wrapper">

                    <div className="registration-header">
                        <h3>Create Account</h3>
                        <p>Register a new employee account</p>
                    </div>

                    <form>

                        {/* Name */}
                        <div className="row g-3">

                            <div className="col-md-6">
                                <label className="form-label">
                                    First Name
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter first name"
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">
                                    Last Name
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter last name"
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
                                    className="form-control"
                                    placeholder="example@email.com"
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">
                                    Phone Number
                                </label>

                                <input
                                    type="tel"
                                    className="form-control"
                                    placeholder="Enter phone number"
                                />
                            </div>

                        </div>


                        {/* Department */}
                        <div className="row g-3 mt-1">

                            <div className="col-md-12">
                                <label className="form-label">
                                    Department
                                </label>

                                <select className="form-select">
                                    <option value="">
                                        Select department
                                    </option>
                                    <option>Human Resources</option>
                                    <option>Finance</option>
                                    <option>IT</option>
                                    <option>Marketing</option>
                                    <option>Administration</option>
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
                                    className="form-control"
                                    placeholder="Create a password"
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">
                                    Confirm Password
                                </label>

                                <input
                                    type="password"
                                    className="form-control"
                                    placeholder="Confirm your password"
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

                </div>

            </div>
        </section>
        </>
    );
}

export default Registration;