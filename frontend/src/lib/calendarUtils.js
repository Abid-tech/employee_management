// Shared calendar helpers used by both Admin and Employee calendar pages

export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

export const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Event type color scheme
export const EVENT_COLORS = {
    holiday:  { bg: '#e3f0ff', text: '#1a5cb0', dot: '#1a5cb0', label: 'Holiday' },
    leave:    { bg: '#dff4e6', text: '#1f7a42', dot: '#1f7a42', label: 'Leave' },
    meeting:  { bg: '#fff4e5', text: '#b8621b', dot: '#e88a2e', label: 'Meeting' },
    deadline: { bg: '#ffe5e5', text: '#d63031', dot: '#d63031', label: 'Deadline' },
    reminder: { bg: '#f3e8ff', text: '#7c3aed', dot: '#7c3aed', label: 'Reminder' },
}

// Holiday sub-type colors
export const HOLIDAY_TYPE_COLORS = {
    National: { bg: '#e3f0ff', text: '#1a5cb0' },
    Religious: { bg: '#f3e8ff', text: '#7c3aed' },
    Company: { bg: '#dff4e6', text: '#1f7a42' },
}

// Build the array of day cells for a calendar month grid
export function getCalendarDays(year, month) {
    const firstDayOfWeek = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()

    const days = []

    for (let i = 0; i < firstDayOfWeek; i++) {
        days.push({ day: null })
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d

        days.push({ day: d, dateStr, isToday })
    }

    return days
}

export function formatDate(isoString) {
    const d = new Date(isoString)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Check if two dates are the same calendar day
export function isSameDay(d1, d2) {
    const a = new Date(d1)
    const b = new Date(d2)
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
