// Project Budget Tracker talks to the API through here.

import { API_BASE } from './api_base'
const BASE = `${API_BASE}/api/budget`
const TIMEOUT = 25000

const query = (params = {}) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue
        search.append(key, value)
    }
    const text = search.toString()
    return text ? `?${text}` : ''
}

const request = async (path, { method = 'GET', body, params } = {}) => {
    let response
    try {
        response = await fetch(`${BASE}${path}${query(params)}`, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(TIMEOUT)
        })
    } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            throw new Error('The server took too long to answer. Check the API terminal.', { cause: err })
        }
        throw new Error('Could not reach the server. Is the API running on port 5000?', { cause: err })
    }

    let payload
    try { payload = await response.json() } catch { payload = null }

    if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status})`)
    return payload
}

export const budgetApi = {
    meta: () => request('/meta'),
    portfolio: () => request('/portfolio'),
    advisor: (plan) => request('/advisor', { params: plan ? { plan: JSON.stringify(plan) } : undefined }),
    project: (id) => request(`/project/${id}`),

    // Decision simulation.
    quote: (id, date) => request(`/simulate/${id}/quote`, { params: { date } }),
    addPerson: (id, employee, horizonDays) => request(`/simulate/${id}/add-person`, { params: { employee, horizonDays } }),
    leaveImpact: (employee, from, to) => request('/simulate/leave', { params: { employee, from, to } }),

    shift: (employee) => request('/shift', { params: { employee } }),
    clockIn: (body) => request('/clock-in', { method: 'POST', body }),
    clockOut: (body) => request('/clock-out', { method: 'POST', body }),
    log: (body) => request('/log', { method: 'POST', body }),
    entries: (params) => request('/entries', { params }),

    rates: () => request('/rates'),
    setRate: (body) => request('/rates', { method: 'POST', body }),

    setBudget: (body) => request('/budget', { method: 'POST', body })
}
