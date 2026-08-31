// Employee Feedback & Evaluation talks to the API through here.

import { API_BASE } from './api_base'
const BASE = `${API_BASE}/api/feedback`
const TIMEOUT = 20000

const query = (params = {}) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue
        search.append(key, value)
    }
    const text = search.toString()
    return text ? `?${text}` : ''
}

const request = async (path, { method = 'GET', body, params, timeout = TIMEOUT } = {}) => {
    let response

    try {
        response = await fetch(`${BASE}${path}${query(params)}`, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
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

export const feedbackApi = {
    meta: () => request('/meta'),
    overview: () => request('/overview'),

    reviews: (params) => request('/reviews', { params }),
    review: (id) => request(`/reviews/${id}`),
    createReview: (body) => request('/reviews', { method: 'POST', body }),
    updateReview: (id, body) => request(`/reviews/${id}`, { method: 'PATCH', body }),
    acknowledge: (id, body) => request(`/reviews/${id}/acknowledge`, { method: 'POST', body }),
    deleteReview: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),

    employee: (id) => request(`/employee/${id}`),

    calibration: (cycle) => request('/calibration', { params: { cycle } }),

    // Reads the performance module's overview as well as the reviews.
    reconciliation: (department) => request('/reconciliation', { params: { department }, timeout: 45000 }),

    // The agent reads every submitted review, so this one is allowed longer.
    scan: (body) => request('/agent/scan', { method: 'POST', body, timeout: 120000 }),
    signals: (params) => request('/signals', { params }),
    approve: (id, body) => request(`/signals/${id}/approve`, { method: 'POST', body }),
    dismiss: (id, body) => request(`/signals/${id}/dismiss`, { method: 'POST', body }),

    audit: (params) => request('/audit', { params })
}
