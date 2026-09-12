import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // add server allowed for brought-gizzard-catalyze.ngrok-free.dev/
  server: {
  host: '0.0.0.0',   // IMPORTANT (not just true)
  port: 5173,
  strictPort: true,

  allowedHosts: [
    'brought-gizzard-catalyze.ngrok-free.dev'
  ],

  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      secure: false,
    }
  }
}

})
