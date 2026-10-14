/**
 * precanvasdiff：构建含 FR-51② e2e 通道（window.__UIC_E2E__）的编辑器到 dist/app。
 * 等价于 `VITE_E2E_HOOK=1 npx vite build`（不跑 tsc——build 命令已覆盖类型检查）。
 */
import { build } from 'vite';

await build({
  build: {
    outDir: 'dist/app',
  },
  define: {
    'import.meta.env.VITE_E2E_HOOK': JSON.stringify('1'),
  },
});
console.log('e2e-hook build done -> dist/app');
