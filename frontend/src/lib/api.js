const API = '/api'

const f = async (url, options = {}) => {
    const res = await fetch(`${API}${url}`, {
        ...options,
        credentials: 'include',
        headers: {
            ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers,
        },
        body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || err.message || 'Request failed')
    }
    return res.json()
}

export const api = {
    // Auth check
    register: (userData) => f('/auth/register', { method: 'POST', body: userData }),
    login: (credentials) => f('/auth/login', { method: 'POST', body: credentials }),
    checkAuth: () => f('/auth/me').catch(() => null),
    logout: () => f('/auth/logout', { method: 'POST' }).catch(() => null),

    // Holidays
    getHolidays: () => f('/holidays'),
    createHoliday: (data) => f('/holidays', { method: 'POST', body: data }),
    updateHoliday: (id, data) => f(`/holidays/${id}`, { method: 'PUT', body: data }),
    deleteHoliday: (id) => f(`/holidays/${id}`, { method: 'DELETE' }),
    generateRecurring: (year) => f('/holidays/generate-recurring', { method: 'POST', body: { year } }),
    importCSV: (formData) => f('/holidays/import-csv', { method: 'POST', body: formData }),
    checkConflicts: (date) => f('/holidays/check-conflicts', { method: 'POST', body: { date } }),
    flagConflicts: (data) => f('/holidays/flag-conflicts', { method: 'POST', body: data }),

    // Dashboard
    getEmployeeDashboard: () => f('/dashboard/employee'),
    getAdminDashboard: () => f('/dashboard/admin'),
    updateLeaveStatus: (id, status) => f(`/dashboard/leave-status/${id}`, { method: 'PUT', body: { status } }),

    // Calendar
    getCalendarEvents: (start, end) => f(`/calendar/events?start=${start}&end=${end}`),
    getReminders: () => f('/calendar/reminders'),
    createReminder: (data) => f('/calendar/reminders', { method: 'POST', body: data }),
    updateReminder: (id, data) => f(`/calendar/reminders/${id}`, { method: 'PUT', body: data }),
    deleteReminder: (id) => f(`/calendar/reminders/${id}`, { method: 'DELETE' }),

    // Notifications
    getNotifications: (page = 1) => f(`/notifications?page=${page}`),
    getUnreadCount: () => f('/notifications/unread-count'),
    markAsRead: (id) => f(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllAsRead: () => f('/notifications/read-all', { method: 'PUT' }),

    // Seed / Demo
    seedDemoNotifications: () => f('/seed/notifications', { method: 'POST' }),
    seedAttendanceHeatmap: () => f('/seed/attendance-heatmap', { method: 'POST' }),
}
