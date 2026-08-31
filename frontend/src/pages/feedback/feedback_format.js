// Shared constants and formatting for the Feedback & Evaluation module.

// One colour per feedback source.
export const SOURCE = {
    manager: { label: 'Manager', colour: '#0A2947', blurb: 'The person accountable for their work' },
    peer: { label: 'Peer', colour: '#2E7D6F', blurb: 'Someone who works alongside them' },
    self: { label: 'Self', colour: '#8B5E3C', blurb: 'Their own assessment' },
    client: { label: 'Client', colour: '#2C6E9B', blurb: 'The people the work was for' }
}

export const sourceColour = (source) => SOURCE[source]?.colour || '#6B7C8C'
export const sourceLabel = (source) => SOURCE[source]?.label || source

export const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const relative = (value) => {
    if (!value) return ''
    const days = Math.round((Date.now() - new Date(value).getTime()) / 86400000)
    if (days <= 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 30) return `${days} days ago`
    const months = Math.round(days / 30)
    return months === 1 ? 'a month ago' : `${months} months ago`
}
