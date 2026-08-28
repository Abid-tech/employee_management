import { API_BASE } from './lib/api_base'
import { useState, useEffect } from "react"
import { Routes, Route } from "react-router-dom"
import './App.css'

import Header from "./components/header/header"
import Footer from "./components/footer/footer"

import Home from "./pages/home/home"
import Leave from "./pages/Leave_management/leave_management"
import AdminDashboard from "./pages/admin_dashboard/admin_dashboard"
import EmployeeDashboard from "./pages/employee_dashboard/employee_dashboard"
import Registration from "./pages/registration/registration"
import Login from "./pages/login/login"
import Attendance from "./pages/attendance"
import ProtectedRoute from "./protected"

// --- Room booking -----------------------------------------------------------
import BookRoom from './pages/BookRoom/BookRoom'
import AddRoom from './pages/AddRoom/AddRoom'

// --- Meetings, resources and assets -----------------------------------------
import MeetingSetup from './pages/MeetingSetup/MeetingSetup'
import MeetingHost from './pages/MeetingHost/MeetingHost'
import MeetingParticipant from './pages/MeetingParticipant/MeetingParticipant'
import AdminResources from './pages/admin_dashboard/AdminResources'
import EmployeeResources from './pages/employee_dashboard/EmployeeResources'
import AssetManagement from './pages/admin_dashboard/AssetManagement'
import MyAssets from './pages/employee_dashboard/MyAssets'

// --- Company holidays and the shared calendar -------------------------------
import Calendar from './pages/calendar/calendar'
import Holidays from './pages/holidays/holidays'
import AttendanceInsights from './pages/attendance_insights/attendance_insights'
// ---------------------------------------------------------------------------
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
import PerformanceRebalance from './pages/performance/performance_rebalance'
// ---------------------------------------------------------------------------
// --- Module 5: Employee Feedback & Evaluation -------------------------------
import FeedbackLayout from './pages/feedback/feedback_layout'
import Feedback from './pages/feedback/feedback'
import FeedbackProfile from './pages/feedback/feedback_profile'
import FeedbackWrite from './pages/feedback/feedback_write'
import FeedbackCalibration from './pages/feedback/feedback_calibration'
import FeedbackReconciliation from './pages/feedback/feedback_reconciliation'
import FeedbackAgent from './pages/feedback/feedback_agent'
import FeedbackTrust from './pages/feedback/feedback_trust'
// ---------------------------------------------------------------------------
// --- Module 6: Project Budget Tracker ---------------------------------------
import BudgetLayout from './pages/budget/budget_layout'
import Budget from './pages/budget/budget'
import BudgetProject from './pages/budget/budget_project'
import BudgetClock from './pages/budget/budget_clock'
import BudgetRates from './pages/budget/budget_rates'
import BudgetAdvisor from './pages/budget/budget_advisor'
import BudgetSimulate from './pages/budget/budget_simulate'
// ---------------------------------------------------------------------------

function App() {

    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // Check authentication when application starts
    useEffect(() => {

        const checkAuthentication = async () => {

            try {

                const response = await fetch(
                    `${API_BASE}/user/auth/me`,
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

                        <Route
                            path="/employee-dashboard"
                            element={
                                <ProtectedRoute
                                    user={user}
                                    loading={loading}
                                    requiredRole="Employee"
                                >
                                    <EmployeeDashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* --- Room booking ------------------------------------------ */}
                        <Route path='/book-room' element={<BookRoom />} />
                        <Route path='/add-room' element={<AddRoom />} />

                        {/* --- Meetings, resources and assets ------------------------- */}
                        <Route path='/meeting/create' element={<MeetingSetup />} />
                        <Route path='/meeting/:meetingId/host' element={<MeetingHost />} />
                        <Route path='/meeting/:meetingId' element={<MeetingParticipant />} />
                        <Route path='/admin/resources' element={<AdminResources />} />
                        <Route path='/employee/resources' element={<EmployeeResources />} />
                        <Route path='/admin/assets' element={<AssetManagement />} />
                        <Route path='/employee/assets' element={<MyAssets />} />

                        {/* --- Calendar and holidays ---------------------------------
                            Both read data belonging to other people, so both sit behind
                            a sign-in. The holidays page lets anyone signed in look, and
                            the API refuses edits from anyone who is not an administrator
                            or director. */}
                        <Route
                            path='/calendar'
                            element={
                                <ProtectedRoute user={user} loading={loading}>
                                    <Calendar />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path='/holidays'
                            element={
                                <ProtectedRoute user={user} loading={loading}>
                                    <Holidays />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path='/attendance/insights'
                            element={
                                <ProtectedRoute user={user} loading={loading}>
                                    <AttendanceInsights />
                                </ProtectedRoute>
                            }
                        />
                        {/* --------------------------------------------------------------- */}

                        {/* --- Module 3 -------------------------------------------------
                            Wrapped in a layout route so every page inside gets the .m3
                            scope its stylesheet depends on. */}
                        <Route element={<Module3Layout />}>
                            <Route path='/tasks' element={<TaskOrbit />} />
                            <Route path='/tasks/new' element={<NewTask />} />
                            <Route path='/tasks/:id' element={<TaskDetail />} />
                            <Route path='/projects' element={<Projects />} />
                            <Route path='/projects/:id' element={<ProjectDetail />} />
                        </Route>
                        {/* --------------------------------------------------------------- */}

                        {/* --- Module 4 -------------------------------------------------
                            Same pattern as Module 3: a layout route so every page inside
                            gets the .perf scope its stylesheet depends on. */}
                        <Route element={<PerformanceLayout />}>
                            <Route path='/performance' element={<Performance />} />
                            <Route path='/performance/reports' element={<PerformanceReport />} />
                            <Route path='/performance/rebalance' element={<PerformanceRebalance />} />
                            <Route path='/performance/employee/:id' element={<PerformanceProfile />} />
                        </Route>

                        {/* --- Module 5 -------------------------------------------------
                            Wrapped so every page inside gets the .fb scope its stylesheet
                            depends on, and shares the "acting as" context the audit trail
                            needs. */}
                        <Route element={<FeedbackLayout />}>
                            <Route path='/feedback' element={<Feedback />} />
                            <Route path='/feedback/write' element={<FeedbackWrite />} />
                            <Route path='/feedback/calibration' element={<FeedbackCalibration />} />
                            <Route path='/feedback/reconciliation' element={<FeedbackReconciliation />} />
                            <Route path='/feedback/agent' element={<FeedbackAgent />} />
                            <Route path='/feedback/trust' element={<FeedbackTrust />} />
                            <Route path='/feedback/employee/:id' element={<FeedbackProfile />} />
                        </Route>

                        {/* --- Module 6 — scoped under .bud ------------------------------ */}
                        <Route element={<BudgetLayout />}>
                            <Route path='/budget' element={<Budget />} />
                            <Route path='/budget/clock' element={<BudgetClock />} />
                            <Route path='/budget/simulate' element={<BudgetSimulate />} />
                            <Route path='/budget/advisor' element={<BudgetAdvisor />} />
                            <Route path='/budget/rates' element={<BudgetRates />} />
                            <Route path='/budget/project/:id' element={<BudgetProject />} />
                        </Route>
                        {/* --------------------------------------------------------------- */}

                    </Routes>

                </div>

                <Footer />

            </div>
        </>
    )
}

export default App
