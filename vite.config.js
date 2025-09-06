import { defineConfig } from 'vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  base: '/llm-wordgraph-exact/',
  plugins: [
    wasm(),
    topLevelAwait({
      // The export name of top-level await promise for each chunk module
      promiseExportName: "__tla",
      // The function to generate import names of top-level await promise in each chunk module
      promiseImportName: i => `__tla_${i}`
    })
  ],
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
    include: ['d3'],
    exclude: ['voy-search']
  }
})