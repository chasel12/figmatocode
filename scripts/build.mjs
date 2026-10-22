#!/usr/bin/env node
/**
 * 构建统一入口：`tsc --noEmit` → `vite build`，并把 TEMP/TMP 固定到项目内。
 *
 * 存在理由（2026-10-22 实测）：
 *   本机沙箱对系统 Temp 的文件操作返回 `Access is denied`，vite 的 esbuild-transpile
 *   在收尾删除临时产物时失败——**重试无效**（每次新建 esbuild-<hash> 目录仍失败）：
 *     [vite:esbuild-transpile] remove C:\...\Temp\esbuild-<hash>: Access is denied
 *   把 TEMP/TMP/TMPDIR 指向 `.tmp-esbuild/tmp`（已在 .gitignore）后构建立即通过。
 *
 * 用法与 `npm run build` 等价，参数透传给 vite build（如 `--mode`）：
 *   node scripts/build.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmpDir = join(root, '.tmp-esbuild', 'tmp');
mkdirSync(tmpDir, { recursive: true });

const env = { ...process.env, TEMP: tmpDir, TMP: tmpDir, TMPDIR: tmpDir };

const run = (label, entry, args) => {
  const r = spawnSync(process.execPath, [entry, ...args], { cwd: root, stdio: 'inherit', env });
  if (r.status !== 0) {
    console.error(`\n[build] ${label} 失败（exit ${r.status ?? 'null'}）`);
    process.exit(r.status ?? 1);
  }
};

run('tsc --noEmit', join(root, 'node_modules', 'typescript', 'bin', 'tsc'), ['--noEmit']);
run('vite build', join(root, 'node_modules', 'vite', 'bin', 'vite.js'), ['build', ...process.argv.slice(2)]);
