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



import BookRoom from './pages/BookRoom/BookRoom'
import AddRoom from './pages/AddRoom/AddRoom'

// --- Module 3: Task & Objective Management ---------------------------------
import Module3Layout from './pages/module3_layout'
import TaskOrbit from './pages/task_orbit/task_orbit'
import TaskDetail from './pages/task_detail/task_detail'
import NewTask from './pages/new_task/new_task'
import Projects from './pages/projects/projects'
import ProjectDetail from './pages/projects/project_detail'
// ---------------------------------------------------------------------------
// --- Module 4: Employee Performance Management ------------------------------
import PerformanceLayout from './pages/performance/performance_layout'
import Performance from './pages/performance/performance'
import PerformanceProfile from './pages/performance/performance_profile'
import PerformanceReport from './pages/performance/performance_report'
// ---------------------------------------------------------------------------

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


                        <Route path="/" element={<Home />}/>
                        <Route path="/registration" element={<Registration />}/>
                        <Route path="/login" element={ <Login setUser={setUser}/>}/>
                        <Route path="/Leave-management" element={ <ProtectedRoute user={user} loading={loading}><Leave /> </ProtectedRoute>}/>

                        <Route  path="/admin-dashboard" element={
                                <ProtectedRoute user={user} loading={loading} requiredRole="Admin">
                                    <AdminDashboard />
                                </ProtectedRoute> } />

                        <Route path="/attendance"
                            element={
                                <ProtectedRoute user={user} loading={loading}>
                                    <Attendance />
                                </ProtectedRoute>
                            }
                        />

                      <Route path='/book-room' element={<BookRoom/>}/>
                      <Route path='/add-room' element={<AddRoom/>}/>
                      <Route element={<Module3Layout/>}>
                      <Route path='/tasks' element={<TaskOrbit/>}/>
                      <Route path='/tasks/new' element={<NewTask/>}/>
                      <Route path='/tasks/:id' element={<TaskDetail/>}/>
                      <Route path='/projects' element={<Projects/>}/>
                      <Route path='/projects/:id' element={<ProjectDetail/>}/>
                      <Route element={<PerformanceLayout/>}>
                      <Route path='/performance' element={<Performance/>}/>
                      <Route path='/performance/reports' element={<PerformanceReport/>}/>
                      <Route path='/performance/employee/:id' element={<PerformanceProfile/>}/>

                    </Routes>

                </div>

                <Footer />

            </div>
        </>
    )
