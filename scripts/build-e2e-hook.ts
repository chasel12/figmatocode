/**
 * precanvasdiff：构建含 FR-51② e2e 通道（window.__UIC_E2E__）的编辑器到 dist/app。
 * 等价于 `VITE_E2E_HOOK=1 npx vite build`（不跑 tsc——build 命令已覆盖类型检查）。
 */
// Windows 环境保险：esbuild 服务进程读取 >1MB chunk 的 TEMP 输入文件后立即删除，
// 偶发 EACCES（杀软扫描/句柄占用）会使整个 vite build 失败且 JS 侧 fs 补丁无法触及 Go 侧删除。
// chunk 级转译（vite:esbuild-transpile）在 target=esnext 且 minify=false 时直接跳过，
// 编辑器产物只被 canvasdiff 用现代 Chromium 静态加载，无需降级语法/压缩。
// fs.unlink 退避重试为本进程内其它 JS 侧删除兜底。
import fs from 'node:fs';
const rawUnlink = fs.unlink.bind(fs);
// @ts-expect-error monkey-patch 内置 fs.unlink（保留原签名与错误语义）
fs.unlink = ((p: fs.PathLike, cb: (err: NodeJS.ErrnoException | null) => void) => {
  let attempts = 0;
  const retry = (err: NodeJS.ErrnoException | null): void => {
    if (!err || (err.code !== 'EPERM' && err.code !== 'EACCES') || attempts >= 5) return cb(err);
    attempts += 1;
    setTimeout(() => rawUnlink(p, retry), 120 * attempts);
  };
  rawUnlink(p, retry);
}) as typeof fs.unlink;
import { build } from 'vite';

await build({
  build: {
    outDir: 'dist/app',
    target: 'esnext',
    // 伪造 e2e 通道用产物只被 canvasdiff 静态加载，不做压缩，加快构建
    minify: false,
  },
  define: {
    'import.meta.env.VITE_E2E_HOOK': JSON.stringify('1'),
  },
});
console.log('e2e-hook build done -> dist/app');
