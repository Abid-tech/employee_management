// Where the API lives.
//
// In development this is empty, so every call stays a relative path and Vite's
// proxy forwards it to the Express server — no CORS, no environment switch.
// In production the frontend and the API are served from different hosts, so
// VITE_API_URL carries the API's origin and is prefixed to every call.
//
// Set it in the hosting dashboard, e.g. VITE_API_URL=https://<api>.vercel.app
// with no trailing slash.
// A non-empty string on the left of || is always truthy, so hardcoding the port
// here sent every request in the deployed app to the visitor's own machine, not
// to the server. The reason it was hardcoded is fixed properly in
// vite.config.js: the dev proxy now forwards the five prefixes outside /api
// that this app uses, so relative URLs work locally too and nothing has to name
// a port.
//
// Empty in development, so calls stay relative and Vite forwards them. In
// production the frontend and API share an origin, so relative still works;
// VITE_API_URL is there for the day they are split.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

// Convenience for the modules that write their URLs out in full.
export const api = (path) => `${API_BASE}${path}`


export default API_BASE
