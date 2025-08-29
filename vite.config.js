import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow external connections from local network
    open: false, // Don't auto-open browser
    strictPort: true // Don't try alternative ports
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020'
  },
  optimizeDeps: {
    include: ['d3']
  }
})