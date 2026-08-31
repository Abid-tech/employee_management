import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Module 3 calls /api/... on this origin and Vite forwards it to Express.
    // The same relative URLs then work in development and in production, so
    // there is no CORS setup and no environment switch. Port 5000 is where
    // server.js listens — 9505 since the merge, because the pages that came in
    // from main call that port directly.
    // Only /api used to be forwarded, but the accounts, attendance, salary,
    // internal communication and leave modules answer on their own prefixes.
    // With just /api proxied, a relative call to /user/login found the Vite dev
    // server instead of Express and returned the index page — which is why the
    // API base ended up hardcoded to a port. Forwarding all six means relative
    // URLs work in development exactly as they do in production.
    proxy: Object.fromEntries(
      ['/api', '/user', '/attendance', '/communication', '/salary', '/leave-management']
        .map((prefix) => [prefix, {
          target: 'http://localhost:9505',
          changeOrigin: true
        }])
    )
  }
})
