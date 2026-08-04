import { useState, useEffect } from 'react'
import '../../index.css'
import './holiday_management.css'

// In development, Vite proxy forwards /api to localhost:5000, so API_BASE = "".
// In production (Vercel), VITE_API_URL points to the Render backend URL.
// Vite only exposes env vars prefixed with VITE_ to the frontend code.
const API_BASE = import.meta.env.VITE_API_URL || ''

// ==========================================================================
// Holiday Management page
// Two-column layout: left = role-dependent controls, right = company calendar
// ==========================================================================
function HolidayManagement() {

    // ----------------------------------------------------------------------
    // ROLE TOGGLE — dev-only affordance
    // This is NOT real authentication. It's a simple React state toggle
    // so we can demo admin vs employee views side by side during development.
    // In a real app, the role would come from a JWT token / session / auth context.
    // ----------------------------------------------------------------------
    const [viewAsRole, setViewAsRole] = useState("employee") // "admin" | "employee"

    // ----------------------------------------------------------------------
    // STATE — holidays, employees, forms, feedback
    // ----------------------------------------------------------------------
    const [holidays, setHolidays] = useState([])               // all holidays from DB
    const [employees, setEmployees] = useState([])             // all employees from DB
    const [feedback, setFeedback] = useState(null)             // { type: 'success'|'error', message }

    // Holiday form state
    const [holidayName, setHolidayName] = useState('')
    const [holidayDate, setHolidayDate] = useState('')
    const [holidayType, setHolidayType] = useState('')
    const [editingHolidayId, setEditingHolidayId] = useState(null) // null = creating, id = editing

    // Employee form state
    const [empName, setEmpName] = useState('')
    const [empRole, setEmpRole] = useState('')
    const [empCustomRole, setEmpCustomRole] = useState('')     // shown when "Other" is selected

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState(null)     // holiday object or null

    // Calendar state
    const [calendarDate, setCalendarDate] = useState(new Date()) // which month is shown
    const [selectedDay, setSelectedDay] = useState(null)         // clicked day details

    // ----------------------------------------------------------------------
    // FETCH data on first render
    // useEffect with [] means "run once when the component mounts"
    // ----------------------------------------------------------------------
    useEffect(() => {
        fetchHolidays()
        fetchEmployees()
    }, [])

    // Auto-clear feedback messages after 4 seconds
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 4000)
            return () => clearTimeout(timer) // cleanup if component unmounts
        }
    }, [feedback])

    // ----------------------------------------------------------------------
    // API CALLS — talk to the Express backend
    // fetch() sends HTTP requests; the Vite proxy forwards /api/* to port 5000
    // ----------------------------------------------------------------------

    async function fetchHolidays() {
        try {
            const res = await fetch(`${API_BASE}/api/holidays`)
            const data = await res.json()
            setHolidays(data)
        } catch (err) {
            console.error('Failed to fetch holidays:', err)
        }
    }

    async function fetchEmployees() {
        try {
            const res = await fetch(`${API_BASE}/api/employees`)
            const data = await res.json()
            setEmployees(data)
        } catch (err) {
            console.error('Failed to fetch employees:', err)
        }
    }

    // Create or update a holiday (the same form handles both)
    async function handleHolidaySubmit(e) {
        e.preventDefault() // prevent the browser from reloading the page

        const body = { name: holidayName, date: holidayDate, type: holidayType }

        try {
            let res
            if (editingHolidayId) {
                // PUT = update an existing resource
                res = await fetch(`${API_BASE}/api/holidays/${editingHolidayId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                })
            } else {
                // POST = create a new resource
                res = await fetch(`${API_BASE}/api/holidays`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                })
            }

            const data = await res.json()

            if (!res.ok) {
                // The server returned an error (400, 500, etc.)
                setFeedback({ type: 'error', message: data.error || 'Something went wrong' })
                return
            }

            // Success — refresh the list and reset the form
            setFeedback({
                type: 'success',
                message: editingHolidayId ? 'Holiday updated!' : 'Holiday added!',
            })
            resetHolidayForm()
            fetchHolidays()
        } catch (err) {
            setFeedback({ type: 'error', message: 'Network error — is the backend running?' })
        }
    }

    // Delete a holiday (called after user confirms)
    async function confirmDeleteHoliday() {
        if (!deleteTarget) return

        try {
            const res = await fetch(`${API_BASE}/api/holidays/${deleteTarget._id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const data = await res.json()
                setFeedback({ type: 'error', message: data.error || 'Delete failed' })
            } else {
                setFeedback({ type: 'success', message: 'Holiday deleted!' })
                fetchHolidays()
            }
        } catch (err) {
            setFeedback({ type: 'error', message: 'Network error — is the backend running?' })
        }

        setDeleteTarget(null) // close the confirm dialog
    }

    // Create a new employee
    async function handleEmployeeSubmit(e) {
        e.preventDefault()

        // If the user picked "Other" from the dropdown, use the custom role text
        const finalRole = empRole === 'Other' ? empCustomRole : empRole

        try {
            const res = await fetch(`${API_BASE}/api/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: empName, role: finalRole }),
            })

            const data = await res.json()

            if (!res.ok) {
                setFeedback({ type: 'error', message: data.error || 'Failed to create employee' })
                return
            }

            setFeedback({ type: 'success', message: 'Employee added!' })
            setEmpName('')
            setEmpRole('')
            setEmpCustomRole('')
            fetchEmployees()
        } catch (err) {
            setFeedback({ type: 'error', message: 'Network error — is the backend running?' })
        }
    }

    // ----------------------------------------------------------------------
    // FORM HELPERS
    // ----------------------------------------------------------------------

    function resetHolidayForm() {
        setHolidayName('')
        setHolidayDate('')
        setHolidayType('')
        setEditingHolidayId(null)
    }

    // Pre-fill the holiday form for editing
    function startEditing(holiday) {
        setHolidayName(holiday.name)
        // Convert the ISO date string to YYYY-MM-DD for the date input
        setHolidayDate(holiday.date.slice(0, 10))
        setHolidayType(holiday.type)
        setEditingHolidayId(holiday._id)
        // Scroll to the form so the user sees it's now in "edit mode"
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // ----------------------------------------------------------------------
    // CALENDAR HELPERS
    // Build a simple month grid from scratch — no external calendar library
    // ----------------------------------------------------------------------

    // Names for display
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ]
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Navigate to previous or next month
    function prevMonth() {
        setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))
        setSelectedDay(null)
    }
    function nextMonth() {
        setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
        setSelectedDay(null)
    }

    // Build the array of day cells for the calendar grid
    function getCalendarDays() {
        const year = calendarDate.getFullYear()
        const month = calendarDate.getMonth()

        // What day of the week does the 1st fall on? (0=Sun, 6=Sat)
        const firstDayOfWeek = new Date(year, month, 1).getDay()
        // How many days in this month?
        const daysInMonth = new Date(year, month + 1, 0).getDate()

        const days = []

        // Leading empty cells (days from the previous month)
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push({ day: null })
        }

        // Actual days
        for (let d = 1; d <= daysInMonth; d++) {
            // Build a YYYY-MM-DD string for display purposes
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

            // Compare holidays using LOCAL date fields, not UTC string slicing.
            // Why? MongoDB stores dates in UTC. A date like "Oct 8" entered in UTC+6
            // gets stored as "2026-10-07T18:00:00Z" — slicing that string gives
            // "2026-10-07" (wrong day!). Using new Date() + getFullYear/Month/Date
            // converts to the user's local timezone, giving the correct local day.
            const holidaysOnDay = holidays.filter(h => {
                const hd = new Date(h.date)
                return hd.getFullYear() === year && hd.getMonth() === month && hd.getDate() === d
            })

            const today = new Date()
            const isToday =
                today.getFullYear() === year &&
                today.getMonth() === month &&
                today.getDate() === d

            days.push({
                day: d,
                dateStr,
                holidays: holidaysOnDay,
                isToday,
            })
        }

        return days
    }

    // When a day with holidays is clicked, show its details below the calendar
    function handleDayClick(dayInfo) {
        if (dayInfo.holidays && dayInfo.holidays.length > 0) {
            setSelectedDay(dayInfo)
        } else {
            setSelectedDay(null)
        }
    }

    // Format a date string for display
    function formatDate(isoString) {
        const d = new Date(isoString)
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    // Get upcoming holidays (from today onwards), sorted by date
    function getUpcomingHolidays() {
        const today = new Date()
        today.setHours(0, 0, 0, 0) // strip time so we compare dates only
        return holidays
            .filter(h => new Date(h.date) >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
    }

    // Navigate the calendar to the month of a specific holiday.
    // Called when the user clicks a holiday in the left panel.
    function navigateToHolidayMonth(holiday) {
        const d = new Date(holiday.date)
        setCalendarDate(new Date(d.getFullYear(), d.getMonth(), 1))
        setSelectedDay(null)
    }

    // ======================================================================
    // RENDER
    // ======================================================================
    return (
        <>
            <section id="holiday-management">
                <div className="container">

                    {/* --- Role toggle ------------------------------------ */}
                    <div className="role-toggle-wrapper">
                        <span className="role-toggle-label">View as:</span>
                        <div className="role-toggle-btn">
                            <button
                                className={viewAsRole === 'employee' ? 'active' : ''}
                                onClick={() => setViewAsRole('employee')}
                            >
                                Employee
                            </button>
                            <button
                                className={viewAsRole === 'admin' ? 'active' : ''}
                                onClick={() => setViewAsRole('admin')}
                            >
                                Admin
                            </button>
                        </div>
                    </div>

                    {/* --- Feedback alert ---------------------------------- */}
                    {feedback && (
                        <div className={`hm-alert ${feedback.type === 'success' ? 'hm-alert-success' : 'hm-alert-error'}`}>
                            {feedback.message}
                        </div>
                    )}

                    {/* --- Two-column layout ------------------------------- */}
                    <div className="row g-4">

                        {/* ===== LEFT COLUMN ===== */}
                        <div className="col-md-5">
                            {viewAsRole === 'admin' ? (
                                <AdminPanel
                                    // Employee form props
                                    empName={empName}
                                    setEmpName={setEmpName}
                                    empRole={empRole}
                                    setEmpRole={setEmpRole}
                                    empCustomRole={empCustomRole}
                                    setEmpCustomRole={setEmpCustomRole}
                                    handleEmployeeSubmit={handleEmployeeSubmit}
                                    employees={employees}
                                    // Holiday form props
                                    holidayName={holidayName}
                                    setHolidayName={setHolidayName}
                                    holidayDate={holidayDate}
                                    setHolidayDate={setHolidayDate}
                                    holidayType={holidayType}
                                    setHolidayType={setHolidayType}
                                    editingHolidayId={editingHolidayId}
                                    handleHolidaySubmit={handleHolidaySubmit}
                                    resetHolidayForm={resetHolidayForm}
                                    // Holiday list props
                                    holidays={holidays}
                                    startEditing={startEditing}
                                    setDeleteTarget={setDeleteTarget}
                                    formatDate={formatDate}
                                />
                            ) : (
                                <EmployeePanel
                                    upcomingHolidays={getUpcomingHolidays()}
                                    formatDate={formatDate}
                                    navigateToHolidayMonth={navigateToHolidayMonth}
                                />
                            )}
                        </div>

                        {/* ===== RIGHT COLUMN — Calendar ===== */}
                        <div className="col-md-7">
                            <div className="calendar-wrapper">
                                {/* Calendar header with month nav */}
                                <div className="calendar-header">
                                    <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
                                    <h5>{monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}</h5>
                                    <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
                                </div>

                                {/* Day-of-week headers */}
                                <div className="calendar-grid">
                                    {dayHeaders.map(d => (
                                        <div key={d} className="calendar-day-header">{d}</div>
                                    ))}

                                    {/* Day cells */}
                                    {getCalendarDays().map((info, i) => {
                                        if (info.day === null) {
                                            // Empty leading cell
                                            return <div key={`empty-${i}`} className="calendar-day empty"></div>
                                        }

                                        // Build CSS classes for this day cell
                                        const hasHoliday = info.holidays.length > 0
                                        // Use the type of the first holiday for background color
                                        const typeBg = hasHoliday
                                            ? info.holidays[0].type.toLowerCase() + '-bg'
                                            : ''

                                        let classes = 'calendar-day'
                                        if (info.isToday) classes += ' today'
                                        if (hasHoliday) classes += ` has-holiday ${typeBg}`

                                        return (
                                            <div
                                                key={`day-${info.day}`}
                                                className={classes}
                                                onClick={() => handleDayClick(info)}
                                                title={hasHoliday ? info.holidays.map(h => h.name).join(', ') : ''}
                                            >
                                                {info.day}
                                                {/* Small colored dot below the number */}
                                                {hasHoliday && (
                                                    <span className={`holiday-dot ${info.holidays[0].type.toLowerCase()}-dot`}></span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Detail panel — shows when a holiday day is clicked */}
                                {selectedDay && selectedDay.holidays.length > 0 && (
                                    <div className="calendar-detail">
                                        <div className="calendar-detail-date">
                                            {formatDate(selectedDay.dateStr)}
                                        </div>
                                        {selectedDay.holidays.map(h => (
                                            <div key={h._id} className="calendar-detail-name">
                                                {h.name}
                                                <span className={`holiday-type-badge ${h.type.toLowerCase()}`}>
                                                    {h.type}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Delete confirmation overlay ----------------------------- */}
            {deleteTarget && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <h5>Delete Holiday?</h5>
                        <p>Are you sure you want to delete "<strong>{deleteTarget.name}</strong>"? This can't be undone.</p>
                        <div className="confirm-actions">
                            <button className="hm-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                            <button className="hm-btn-primary" onClick={confirmDeleteHoliday}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}


// ==========================================================================
// ADMIN PANEL — left column when role is "admin"
// Contains: Create Employee form, Employee list, Holiday CRUD form, Holiday list
// ==========================================================================
function AdminPanel({
    empName, setEmpName, empRole, setEmpRole,
    empCustomRole, setEmpCustomRole, handleEmployeeSubmit, employees,
    holidayName, setHolidayName, holidayDate, setHolidayDate,
    holidayType, setHolidayType, editingHolidayId,
    handleHolidaySubmit, resetHolidayForm,
    holidays, startEditing, setDeleteTarget, formatDate,
}) {
    return (
        <>
            {/* ---- Create Employee form ---------------------------------- */}
            <div className="hm-card">
                <div className="hm-card-title">Create Employee</div>
                <form className="hm-form" onSubmit={handleEmployeeSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Employee Name</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Jane Doe"
                            value={empName}
                            onChange={e => setEmpName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Role</label>
                        <select
                            className="form-select"
                            value={empRole}
                            onChange={e => {
                                setEmpRole(e.target.value)
                                // Clear the custom role text when switching away from "Other"
                                if (e.target.value !== 'Other') setEmpCustomRole('')
                            }}
                            required
                        >
                            <option value="">Select a role</option>
                            <option value="SWE">SWE</option>
                            <option value="CEO">CEO</option>
                            <option value="Other">Other (type below)</option>
                        </select>
                    </div>
                    {/* Show custom role input only when "Other" is selected */}
                    {empRole === 'Other' && (
                        <div className="mb-3">
                            <label className="form-label">Custom Role</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Product Manager"
                                value={empCustomRole}
                                onChange={e => setEmpCustomRole(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <button type="submit" className="hm-btn-primary">Add Employee</button>
                </form>
            </div>

            {/* ---- Employee list ----------------------------------------- */}
            {employees.length > 0 && (
                <div className="hm-card">
                    <div className="hm-card-title">Employees ({employees.length})</div>
                    {employees.map(emp => (
                        <div key={emp._id} className="employee-list-item">
                            <span className="employee-name">{emp.name}</span>
                            <span className="employee-role">{emp.role}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ---- Holiday CRUD form ------------------------------------- */}
            <div className="hm-card">
                <div className="hm-card-title">
                    {editingHolidayId ? '✏️ Edit Holiday' : '➕ Add Holiday'}
                </div>
                <form className="hm-form" onSubmit={handleHolidaySubmit}>
                    <div className="mb-3">
                        <label className="form-label">Holiday Name</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Independence Day"
                            value={holidayName}
                            onChange={e => setHolidayName(e.target.value)}
                            required
                            minLength={2}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Date</label>
                        <input
                            type="date"
                            className="form-control"
                            value={holidayDate}
                            onChange={e => setHolidayDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Type</label>
                        <select
                            className="form-select"
                            value={holidayType}
                            onChange={e => setHolidayType(e.target.value)}
                            required
                        >
                            <option value="">Select type</option>
                            <option value="National">National</option>
                            <option value="Religious">Religious</option>
                            <option value="Company">Company</option>
                        </select>
                    </div>
                    <div className="d-flex gap-2">
                        <button type="submit" className="hm-btn-primary">
                            {editingHolidayId ? 'Update Holiday' : 'Add Holiday'}
                        </button>
                        {editingHolidayId && (
                            <button type="button" className="hm-btn-secondary" onClick={resetHolidayForm}>
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* ---- Holiday list ------------------------------------------ */}
            <div className="hm-card">
                <div className="hm-card-title">All Holidays ({holidays.length})</div>
                {holidays.length === 0 ? (
                    <div className="empty-state">No holidays yet — add one above!</div>
                ) : (
                    holidays.map(h => (
                        <div key={h._id} className="holiday-list-item">
                            <div className="holiday-list-info">
                                <div className="holiday-list-name">
                                    {h.name}
                                    <span className={`holiday-type-badge ${h.type.toLowerCase()}`}>
                                        {h.type}
                                    </span>
                                </div>
                                <div className="holiday-list-date">{formatDate(h.date)}</div>
                            </div>
                            <div className="holiday-list-actions">
                                <button className="btn-edit" onClick={() => startEditing(h)}>Edit</button>
                                <button className="btn-delete" onClick={() => setDeleteTarget(h)}>Delete</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    )
}


// ==========================================================================
// EMPLOYEE PANEL — left column when role is "employee"
// Read-only: just a message and a list of upcoming holidays
// ==========================================================================
function EmployeePanel({ upcomingHolidays, formatDate, navigateToHolidayMonth }) {
    return (
        <div className="hm-card">
            <div className="employee-view-message">
                <h5>📅 Company Holidays</h5>
                <p>View the company calendar on the right. Click a holiday below to jump to its month:</p>
            </div>

            {upcomingHolidays.length === 0 ? (
                <div className="empty-state">No upcoming holidays scheduled.</div>
            ) : (
                upcomingHolidays.map(h => {
                    const d = new Date(h.date)
                    const monthShort = d.toLocaleDateString('en-US', { month: 'short' })
                    const dayNum = d.getDate()

                    return (
                        <div
                            key={h._id}
                            className="upcoming-holiday-item"
                            onClick={() => navigateToHolidayMonth(h)}
                            style={{ cursor: 'pointer' }}
                            title="Click to jump to this month on the calendar"
                        >
                            <div className="upcoming-date-box">
                                <div className="day">{dayNum}</div>
                                <div className="month">{monthShort}</div>
                            </div>
                            <div className="holiday-list-info">
                                <div className="holiday-list-name">
                                    {h.name}
                                    <span className={`holiday-type-badge ${h.type.toLowerCase()}`}>
                                        {h.type}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}

export default HolidayManagement
