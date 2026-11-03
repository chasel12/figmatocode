import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    // 必须显式 false：vite 默认 true，会用 rmSync 清空 outDir，本机沙箱下触发批量删除守卫
    emptyOutDir: false,
    rollupOptions: {
      input: {
      'p-1': fileURLToPath(new URL('./pages/p-1/index.html', import.meta.url)),
      'p-2': fileURLToPath(new URL('./pages/p-2/index.html', import.meta.url)),
      'p-3': fileURLToPath(new URL('./pages/p-3/index.html', import.meta.url)),
      'p-4': fileURLToPath(new URL('./pages/p-4/index.html', import.meta.url)),
      'p-5': fileURLToPath(new URL('./pages/p-5/index.html', import.meta.url)),
      'p-6': fileURLToPath(new URL('./pages/p-6/index.html', import.meta.url)),
      },
    },
  },
})
