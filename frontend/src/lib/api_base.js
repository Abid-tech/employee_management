// Where the API lives.
//
// In development this is empty, so every call stays a relative path and Vite's
// proxy forwards it to the Express server — no CORS, no environment switch.
// In production the frontend and the API are served from different hosts, so
// VITE_API_URL carries the API's origin and is prefixed to every call.
//
// Set it in the hosting dashboard, e.g. VITE_API_URL=https://<api>.vercel.app
// with no trailing slash.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

// Convenience for the modules that write their URLs out in full.
export const api = (path) => `${API_BASE}${path}`

export default API_BASE
