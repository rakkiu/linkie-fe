import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7130',
        changeOrigin: true,
        secure: false, // allow self-signed dev certificate
      },
      '/hubs': {
        target: 'https://localhost:7130',
        changeOrigin: true,
        secure: false,
        ws: true, // proxy WebSocket connections for SignalR
      },
    },
  },
})
