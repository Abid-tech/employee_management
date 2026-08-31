import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward every prefix the API answers on, so relative URLs work in
    // development the same way they do in production. server.js listens on 9505.
    proxy: Object.fromEntries(
      ['/api', '/user', '/attendance', '/communication', '/salary', '/leave-management']
        .map((prefix) => [prefix, {
          target: 'http://localhost:9505',
          changeOrigin: true
        }])
    )
  }
})
