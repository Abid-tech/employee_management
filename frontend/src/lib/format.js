// Small display helpers, kept together so dates and labels read the same way on every page.

export const PRIORITY_LABELS = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low'
}

export const STATUS_LABELS = {
    todo: 'To do',
    in_progress: 'In progress',
    review: 'In review',
    done: 'Done'
}

// How a project's derived health is shown.
export const PROJECT_HEALTH = {
    on_track: { label: 'On track', tone: 'ok' },
    late: { label: 'Late', tone: 'bad' },
    unowned: { label: 'Needs owners', tone: 'warn' },
    delivered: { label: 'Delivered', tone: 'done' },
    empty: { label: 'No tasks yet', tone: 'muted' }
}

// Whole days from now until a date.
export const daysUntil = (date) => {
    if (!date) return null
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export const formatDate = (value) => {
    if (!value) return 'No date'
    return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// "in 3 days" reads faster than a date when the real question is "is it late?".
export const relativeDays = (days) => {
    if (days === null || days === undefined) return ''
    if (days === 0) return 'due today'
    if (days === 1) return 'due tomorrow'
    if (days > 0) return `due in ${days} days`
    if (days === -1) return '1 day late'
    return `${Math.abs(days)} days late`
}

export const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB'
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const timeAgo = (value) => {
    if (!value) return ''
    const seconds = Math.round((Date.now() - new Date(value)) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return formatDate(value)
}

export const initialsOf = (name = '') =>
    name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('')

// Date inputs only accept yyyy-mm-dd.
export const toDateInput = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const offset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}
