// Formatting for the Project Budget Tracker.
//
// Kept out of budget_ui.jsx deliberately: a file that exports both components
// and plain functions cannot be hot-reloaded at component granularity, so a
// one-character change to a formatter would remount every chart on the page.

const SYMBOL = { USD: '$', GBP: '£', EUR: '€', BDT: '৳' }

export const money = (value, currency = 'USD', { compact = false } = {}) => {
    const symbol = SYMBOL[currency] || ''
    const n = Number(value) || 0
    const sign = n < 0 ? '−' : ''
    const abs = Math.abs(n)

    if (compact && abs >= 1000) return `${sign}${symbol}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
    return `${sign}${symbol}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export const formatDate = (value) => value
    ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

export const shortDate = (value) => value
    ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : '—'
