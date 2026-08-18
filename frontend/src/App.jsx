import { useState, useEffect } from "react"
import { Routes, Route } from "react-router-dom"

import Header from "./components/header/header"
import Footer from "./components/footer/footer"

import Home from "./pages/home/home"
import Leave from "./pages/Leave_management/leave_management"
import AdminDashboard from "./pages/admin_dashboard/admin_dashboard"
import Registration from "./pages/registration/registration"
import Login from "./pages/login/login"
import Attendance from "./pages/attendance"

import ProtectedRoute from "./protected"


function App() {

    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)


    // Check authentication when application starts
    useEffect(() => {

        const checkAuthentication = async () => {

            try {

                const response = await fetch(
                    "http://localhost:5000/user/auth/me",
                    {
                        method: "GET",
                        credentials: "include"
                    }
                )


                if (response.ok) {

                    const data = await response.json()

                    console.log("Authenticated user:", data.user)

                    setUser(data.user)

                } else {

                    setUser(null)

                }

            } catch (err) {

                console.error(
                    "Authentication check failed:",
                    err
                )

                setUser(null)

            } finally {

                setLoading(false)

            }
        }


        checkAuthentication()

    }, [])


    return (
        <>
            <div className="d-flex flex-column min-vh-100">

                <Header
                    user={user}
                    setUser={setUser}
                />

                <div className="flex-grow-1">

                    <Routes>


                        <Route
                            path="/"
                            element={<Home />}
                        />

                        <Route
                            path="/registration"
                            element={<Registration />}
                        />

                        <Route
                            path="/login"
                            element={
                                <Login
                                    setUser={setUser}
                                />
                            }
                        />



                        <Route
                            path="/Leave-management"
                            element={
                                <ProtectedRoute user={user} loading={loading}>
                                    <Leave />
                                </ProtectedRoute>
                            }
                        />

                        <Route 
                            path="/admin-dashboard" 
                            element={
                                <ProtectedRoute user={user} loading={loading} requiredRole="Admin">
                                    <AdminDashboard />
                                </ProtectedRoute>
                            } 
                        />

                        <Route
                            path="/attendance"
                            element={
                                <ProtectedRoute user={user} loading={loading}>
                                    <Attendance />
                                </ProtectedRoute>
                            }
                        />

                    </Routes>

                </div>

                <Footer />

            </div>
        </>
    )
}


export default App