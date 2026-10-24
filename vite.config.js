import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Vendored editors, release copies and design mockups are not SPA entries.
  optimizeDeps: { entries: ['index.html'] },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'https://zuraback',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
