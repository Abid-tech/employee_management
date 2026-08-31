// Where the API lives.
//
// Empty in development, so calls stay relative and Vite's proxy forwards them.
// The site and API share an origin in production, so relative works there too.
// Set VITE_API_URL (no trailing slash) if they are ever split.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

// For modules that write their URLs out in full.
export const api = (path) => `${API_BASE}${path}`

export default API_BASE
