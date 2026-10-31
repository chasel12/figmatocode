#!/usr/bin/env node
/**
 * vitest 统一入口（本机沙箱 / CI 通用）。
 *
 * 存在理由（2026-10-22 实测）：
 *   vite 的 SSR transform 会把中间模块写到 os.tmpdir()；本机沙箱对系统 Temp 的写操作返回
 *   EPERM，导致个别测试文件**加载失败却不计入 failed** —— 汇总只报
 *   "Test Files 48 passed (48)"（真实为 50 个文件 / 667 例），门禁**静默假绿**。
 *   与 `[vite:esbuild-transpile] remove ... Access is denied` 同源。
 *
 * 本脚本做三件事：
 *   1) 把 TEMP/TMP/TMPDIR 固定到项目内 `.tmp-esbuild/tmp`（不写系统目录，已在 .gitignore）；
 *   2) 默认串行（`--no-file-parallelism`）：沙箱 fs shim 在多 worker 并发写同一 SSR 缓存
 *      文件时返回 EPERM，会让文件静默丢失；串行是确定性规避（代价约 +15s）；
 *   3) 跑完用 json reporter 校验「实际收集的测试文件数 == tests/*.test.ts 数量」，不等即 exit 1。
 *
 * 用法与 `vitest run` 等价：
 *   npm test                                  # 全量
 *   node scripts/vitest-run.mjs tests/ai-contract.test.ts
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmpDir = join(root, '.tmp-esbuild', 'tmp');
mkdirSync(tmpDir, { recursive: true });

const extraArgs = process.argv.slice(2);
const onlySpecific = extraArgs.some((a) => a.startsWith('tests/') || a.includes('.test.'));

// 默认串行：本机沙箱的 fs shim 在「多 worker 并发写同一 SSR 缓存文件」时返回 EPERM，
// 会让 1~2 个文件静默加载失败（汇总仍报 passed）。串行是确定性规避，代价约 +15s。
// 若显式传了并行相关开关，则尊重调用方意图。
const userSetParallel = extraArgs.some((a) => a.includes('file-parallelism') || a === '--no-isolate');
const parallelArgs = userSetParallel ? [] : ['--no-file-parallelism'];

const testsDir = join(root, 'tests');
const expectedFiles = readdirSync(testsDir).filter((f) => f.endsWith('.test.ts')).length;

const jsonOut = join(root, '.tmp-esbuild', 'vitest-report.json');
const vitestBin = join(root, 'node_modules', 'vitest', 'vitest.mjs');

const args = [
  vitestBin,
  'run',
  '--reporter=basic',
  '--reporter=json',
  `--outputFile.json=${jsonOut}`,
  ...parallelArgs,
  ...extraArgs,
];

const r = spawnSync(process.execPath, args, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, TEMP: tmpDir, TMP: tmpDir, TMPDIR: tmpDir },
});

if (r.status !== 0) process.exit(r.status ?? 1);

// 只跑指定文件时不做全量文件数校验（用户意图就是子集）
if (onlySpecific) process.exit(0);

let collected = null;
if (existsSync(jsonOut)) {
  try {
    const report = JSON.parse(readFileSync(jsonOut, 'utf8'));
    // 注意：numTotalTestSuites 是「套件数（describe 块）」，不是文件数——必须用 testResults。
    collected = Array.isArray(report.testResults) ? report.testResults.length : null;
  } catch {
    collected = null;
  }
}

/**
 * 拿不到 json 报告 = 无法证明「文件都跑过了」，**必须红**。
 *
 * 原来这里是 `exit(0)` + 一行警告。那是本脚本自身留的假绿口子：
 * 这个脚本存在的唯一理由就是「不允许有文件静默漏跑」，而校验的依据正是这份报告；
 * 依据没了却仍然放行，等于校验形同虚设。
 * json reporter 是 vitest 内置的，输出路径在项目内 `.tmp-esbuild`（已 mkdir），
 * 拿不到只可能是真问题（vitest 崩了 / 报告被写坏），没有「环境正常但拿不到」的情形。
 */
if (collected === null) {
  console.error(
    `\n[vitest-run] 失败：未取到 json 报告（${jsonOut}），无法校验文件数——预期 ${expectedFiles} 个测试文件。`,
  );
  console.error('[vitest-run] 这通常意味着 vitest 异常退出或报告写入失败，不能当作通过。');
  process.exit(1);
}

if (collected !== expectedFiles) {
  console.error(
    `\n[vitest-run] 失败：只收集到 ${collected}/${expectedFiles} 个测试文件——有文件加载失败被静默跳过（门禁假绿）。`,
  );
  console.error('[vitest-run] 排查：看上面输出里的 "Unhandled Errors"，常见为 Temp 写权限 EPERM。');
  process.exit(1);
}

console.log(`\n[vitest-run] 文件数校验通过：${collected}/${expectedFiles}`);
