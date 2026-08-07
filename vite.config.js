import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  server: {
    // 开发环境把 /api 代理到本地浏览量服务（npm run server）
    proxy: {
      '/api': 'http://localhost:3210',
    },
  },
})
