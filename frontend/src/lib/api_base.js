// Where the API lives.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

// For modules that write their URLs out in full.
export const api = (path) => `${API_BASE}${path}`

export default API_BASE
