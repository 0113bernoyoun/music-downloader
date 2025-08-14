import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: ['electron']
    }
  },
  server: {
    port: 3000,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@components': path.resolve(__dirname, 'src/renderer/components'),
      '@contexts': path.resolve(__dirname, 'src/renderer/contexts'),
      '@hooks': path.resolve(__dirname, 'src/renderer/hooks'),
      '@utils': path.resolve(__dirname, 'src/renderer/utils'),
      '@views': path.resolve(__dirname, 'src/renderer/views'),
      '@types': path.resolve(__dirname, 'src/renderer/types')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})