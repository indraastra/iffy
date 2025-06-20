import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/iffy/' : '/',
  root: '.',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks(id) {
          // LangChain and AI dependencies
          if (id.includes('@langchain') || id.includes('langchain')) {
            return 'langchain';
          }
          
          // Vue ecosystem
          if (id.includes('node_modules/vue')) {
            return 'vue-vendor';
          }
          
          // Large vendor dependencies  
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          
          // Game engine core
          if (id.includes('/engine/')) {
            return 'game-engine';
          }
          
          // Services and UI
          if (id.includes('/services/') || id.includes('/ui/')) {
            return 'services';
          }
        }
      }
    }
  },
  server: {
    port: 3000
  }
})