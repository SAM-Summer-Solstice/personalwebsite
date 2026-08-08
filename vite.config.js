import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  server: {
    // 开发环境把 /api 代理到本地 Django API（http://127.0.0.1:8000）
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
