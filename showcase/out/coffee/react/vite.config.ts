import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  // 相对 base：产物可搬到任意子目录（file:// 或静态托管子路径均可用）
  base: './',
  build: {
    outDir: 'dist',
    // 必须显式 false：vite 的 emptyOutDir 默认就是 true，会用 rmSync 清空 outDir，
    // 在本机沙箱下触发批量删除守卫（>50 文件即拒，构建关假 FAIL）。
    // 产物靠 contenthash 覆盖写（同输入同文件名），不需要清空。
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
