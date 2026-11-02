import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' so the build can be served from any sub-path or subdomain (D9).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 400,
  },
})
