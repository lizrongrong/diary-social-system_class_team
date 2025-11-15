import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Explicit HMR config can help avoid WebSocket connect issues
    // (force host/port/protocol instead of relying on location-derived URL)
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      // clientPort can be set if you're accessing dev server via different host/port
      clientPort: 5173
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
