import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { api } from './lib/api'
import Header from './components/Header'
import EmployeeDashboard from './pages/EmployeeDashboard'
import AdminDashboard from './pages/AdminDashboard'
import CalendarPage from './pages/CalendarPage'
import HolidayPage from './pages/HolidayPage'
import NotificationsPage from './pages/NotificationsPage'

import LoginPage from './pages/LoginPage'

function App() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.checkAuth()
            .then(data => setUser(data?.user || null))
            .catch(() => setUser(null))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="d-flex align-items-center justify-content-center min-vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        )
    }

    if (!user) {
        return <LoginPage onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />
    }

    return (
        <div className="d-flex flex-column min-vh-100">
            <Header user={user} setUser={setUser} />
            <div className="flex-grow-1">
                <Routes>
                    <Route path="/" element={
                        user.role === 'Admin'
                            ? <Navigate to="/admin-dashboard" replace />
                            : <Navigate to="/dashboard" replace />
                    } />
                    <Route path="/dashboard" element={<EmployeeDashboard user={user} />} />
                    <Route path="/admin-dashboard" element={
                        user.role === 'Admin'
                            ? <AdminDashboard user={user} />
                            : <Navigate to="/dashboard" replace />
                    } />
                    <Route path="/calendar" element={<CalendarPage user={user} />} />
                    <Route path="/holidays" element={<HolidayPage user={user} />} />
                    <Route path="/notifications" element={<NotificationsPage user={user} />} />
                </Routes>
            </div>
        </div>
    )
}

export default App
