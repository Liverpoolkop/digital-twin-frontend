import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 💡 确保这一行存在，它告诉 Vite @ 符号指向 src 目录
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})