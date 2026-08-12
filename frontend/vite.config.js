import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Module 3 calls /api/... on this origin and Vite forwards it to Express.
    // The same relative URLs then work in development and in production, so
    // there is no CORS setup and no environment switch. Port 5000 is where
    // server.js listens.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
