// Module 4 — Employee Performance Management talks to the API through here.

import { API_BASE } from './api_base'
const BASE = `${API_BASE}/api/performance`
const TIMEOUT = 20000

const query = (params = {}) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue
        if (Array.isArray(value)) {
            if (value.length) search.append(key, value.join(','))
        } else {
            search.append(key, value)
        }
    }
    const text = search.toString()
    return text ? `?${text}` : ''
}

const request = async (path, params, timeout = TIMEOUT) => {
    let response

    try {
        response = await fetch(`${BASE}${path}${query(params)}`, {
            signal: AbortSignal.timeout(timeout)
        })
    } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            throw new Error('The server took too long to answer. Check the API terminal.', { cause: err })
        }
        throw new Error('Could not reach the server. Is the API running on port 5000?', { cause: err })
    }

    let payload
    try {
        payload = await response.json()
    } catch {
        payload = null
    }

    if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status})`)
    return payload
}

export const performanceApi = {
    overview: (filters) => request('/overview', filters),
    employee: (id, filters) => request(`/employee/${id}`, filters),
    report: (filters) => request('/report', filters),

    // Reads the whole company scoring plus the rate table.
    rebalance: () => request('/rebalance', undefined, 45000),
    rules: () => request('/rules'),

    // Handed straight to the browser as a download rather than fetched.
    reportCsvUrl: (filters) => `${BASE}/report.csv${query(filters)}`
}
