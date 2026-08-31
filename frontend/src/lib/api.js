// One place that talks to the server.

import { API_BASE } from './api_base'
const BASE = `${API_BASE}/api`

// A backend that accepts the connection but never replies.
const TIMEOUT = 15000

const request = async (path, { method = 'GET', body, formData, timeout = TIMEOUT } = {}) => {
    let response

    try {
        response = await fetch(`${BASE}${path}`, {
            method,
            // The browser must set its own multipart boundary.
            headers: body && !formData ? { 'Content-Type': 'application/json' } : undefined,
            body: formData || (body ? JSON.stringify(body) : undefined),
            signal: AbortSignal.timeout(timeout)
        })
    } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            throw new Error('The server took too long to answer. Check the API terminal — it may have failed to start.', { cause: err })
        }
        throw new Error('Could not reach the server. Is the API running on port 5000?', { cause: err })
    }

    let payload
    try {
        payload = await response.json()
    } catch {
        // Some responses legitimately have no body.
        payload = null
    }

    if (!response.ok) {
        throw new Error(payload?.error || `Request failed (${response.status})`)
    }

    return payload
}

const query = (params = {}) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') search.append(key, value)
    }
    const text = search.toString()
    return text ? `?${text}` : ''
}

export const api = {
    board: (department, includeDone = true) => request(`/tasks/board${query({ department, includeDone })}`),
    options: () => request('/tasks/options'),

    task: (id) => request(`/tasks/${id}`),
    createTask: (body) => request('/tasks', { method: 'POST', body }),
    updateTask: (id, body) => request(`/tasks/${id}`, { method: 'PATCH', body }),
    deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),

    addSubtask: (id, title) => request(`/tasks/${id}/subtasks`, { method: 'POST', body: { title } }),
    toggleSubtask: (id, subtaskId) => request(`/tasks/${id}/subtasks/${subtaskId}`, { method: 'PATCH' }),

    addComment: (id, body) => request(`/tasks/${id}/comments`, { method: 'POST', body }),

    uploadAttachment: (id, file) => {
        const formData = new FormData()
        formData.append('file', file)
        return request(`/tasks/${id}/attachments`, { method: 'POST', formData })
    },
    attachmentUrl: (taskId, fileId) => `${BASE}/tasks/${taskId}/attachments/${fileId}`,
    deleteAttachment: (taskId, fileId) => request(`/tasks/${taskId}/attachments/${fileId}`, { method: 'DELETE' }),

    // --- Projects (objectives) ----------------------------------------------
    objectives: () => request('/objectives'),
    objective: (id) => request(`/objectives/${id}`),
    createObjective: (body) => request('/objectives', { method: 'POST', body }),
    updateObjective: (id, body) => request(`/objectives/${id}`, { method: 'PATCH', body }),
    deleteObjective: (id) => request(`/objectives/${id}`, { method: 'DELETE' }),

    // --- Document import ----------------------------------------------------
    aiStatus: () => request('/ai/status'),

    analyseDocument: ({ file, text, notes }) => {
        const formData = new FormData()
        if (file) formData.append('document', file)
        if (text) formData.append('text', text)
        if (notes) formData.append('notes', notes)
        // Reading a document and drafting tasks from it is slow work.
        return request('/ai/analyse', { method: 'POST', formData, timeout: 120000 })
    },

    createFromDraft: (tasks, project) =>
        request('/ai/create-tasks', { method: 'POST', body: { tasks, ...project } })
}
