import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * FR-58 本地门禁凭证（CI 的本地等价物）。
 *
 * PRD FR-58：「门禁 CI（tsc/test/build/e2e）绿（环境具备时；**不可用则记录替代本地执行凭证**）」。
 * 本脚本串跑与 .github/workflows/ci.yml **完全相同的四道门禁**，逐道记录
 * exit code / 耗时 / 关键输出行，汇总成 `dist/ci-local/report.json` + `summary.md`，
 * 作为 CI 不可用时的替代执行凭证（可归档、可 diff、可对账）。
 *
 * 用法：
 *   node scripts/ci-local.mjs              # 串跑四道门禁
 *   node scripts/ci-local.mjs --only=tsc   # 只跑某一道（tsc|test|build|e2e）
 *
 * 退出码：全部门禁通过 → 0；任一门禁失败 → 1（与 CI 行为一致）。
 */

const root = process.cwd();
const outDir = join(root, 'dist', 'ci-local');
mkdirSync(outDir, { recursive: true });

/** 沙箱兼容：把 TEMP/TMP 指到工作区内（否则 esbuild 报 spawn EPERM / Access is denied） */
const tmpDir = join(root, '.esbuild-tmp');
mkdirSync(tmpDir, { recursive: true });
const childEnv = { ...process.env, TEMP: tmpDir, TMP: tmpDir };

/** 四道门禁（与 ci.yml 一一对应；npx 在 Windows 下需 shell） */
const GATES = [
  { id: 'tsc', label: '门禁① tsc（类型检查零错）', cmd: 'npx', args: ['tsc', '--noEmit'] },
  { id: 'test', label: '门禁② test（vitest run）', cmd: 'npx', args: ['vitest', 'run'] },
  { id: 'build', label: '门禁③ build（tsc + vite build → dist/app）', cmd: 'npm', args: ['run', 'build'] },
  { id: 'e2e', label: '门禁④ e2e（pages + shot + diff，16/16 ≥98%）', cmd: 'npm', args: ['run', 'e2e'] },
];

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()) : null;
const selected = only ? GATES.filter((g) => only.includes(g.id)) : GATES;
if (!selected.length) {
  console.error(`--only 未匹配任何门禁；可用：${GATES.map((g) => g.id).join(', ')}`);
  process.exit(1);
}

/** 跑一道门禁，实时透传输出并回收全文（用于抽取关键行） */
function runGate(gate) {
  return new Promise((resolve) => {
    const started = Date.now();
    const chunks = [];
    const child = spawn(gate.cmd, gate.args, {
      cwd: root,
      env: childEnv,
      shell: true,
    });
    const onData = (buf) => {
      const s = buf.toString();
      chunks.push(s);
      process.stdout.write(s);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('close', (code) => {
      resolve({
        id: gate.id,
        label: gate.label,
        command: `${gate.cmd} ${gate.args.join(' ')}`,
        exitCode: code ?? 1,
        pass: (code ?? 1) === 0,
        durationMs: Date.now() - started,
        output: chunks.join(''),
      });
    });
  });
}

/** 从门禁输出里抽「关键行」——用于凭证对账，避免报告只存一个 exit code */
function keyLines(id, output) {
  const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const pick = (re) => lines.filter((l) => re.test(l)).slice(0, 6);
  switch (id) {
    case 'tsc':
      // tsc 零错时无输出；有错则逐条列出
      return lines.filter((l) => /error TS\d+/.test(l)).slice(0, 20);
    case 'test':
      return pick(/Test Files|Tests\s|Duration|failed|passed/i);
    case 'build':
      return pick(/built in|modules transformed|vite v|dist\/|error/i);
    case 'e2e':
      return pick(/assert-pages|shot done|平均相似度|平均|16\/16|最低|相似度|PASS|FAIL|pages\b/i);
    default:
      return [];
  }
}

console.log(`=== FR-58 本地门禁凭证（${selected.length} 道） ===`);
console.log(`工作目录：${root}`);
console.log(`TEMP/TMP：${tmpDir}（沙箱兼容）\n`);

const results = [];
for (const gate of selected) {
  console.log(`\n──── ${gate.label} ────`);
  const res = await runGate(gate);
  res.keyLines = keyLines(gate.id, res.output);
  delete res.output; // 全文不入 JSON（体积大）；完整输出见控制台/CI 日志
  results.push(res);
  console.log(`\n${res.pass ? 'PASS' : 'FAIL'}  ${gate.id}（exit ${res.exitCode}, ${(res.durationMs / 1000).toFixed(1)}s）`);
}

const failed = results.filter((r) => !r.pass);
const report = {
  feature: 'FR-58 · 本地门禁执行凭证（CI 等价）',
  note: '与 .github/workflows/ci.yml 同四道门禁；CI 环境不可用时作为替代执行凭证',
  cwd: root,
  node: process.version,
  platform: `${process.platform} ${process.arch}`,
  ciWorkflow: '.github/workflows/ci.yml',
  gates: results,
  total: results.length,
  pass: results.length - failed.length,
  fail: failed.length,
  allPass: failed.length === 0,
  generatedAt: new Date().toISOString(),
};
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

/** 人读版凭证（summary.md） */
const md = [
  '# FR-58 本地门禁执行凭证（CI 等价）',
  '',
  `- 生成时间：${report.generatedAt}`,
  `- 环境：Node ${report.node} · ${report.platform}`,
  `- 对应 CI：\`${report.ciWorkflow}\`（同四道门禁）`,
  '',
  '| 门禁 | 命令 | 结果 | 耗时 |',
  '| --- | --- | --- | --- |',
  ...results.map(
    (r) => `| ${r.id} | \`${r.command}\` | ${r.pass ? '✅ PASS' : '❌ FAIL'}（exit ${r.exitCode}） | ${(r.durationMs / 1000).toFixed(1)}s |`,
  ),
  '',
  `**合计：${report.pass}/${report.total} 门禁通过**${report.allPass ? '（全绿）' : '（存在失败）'}`,
  '',
  '## 关键输出行',
  '',
  ...results.flatMap((r) => [
    `### ${r.label}`,
    '',
    ...(r.keyLines.length ? r.keyLines.map((l) => `- \`${l}\``) : ['- （无关键行：该门禁静默通过）']),
    '',
  ]),
].join('\n');
writeFileSync(join(outDir, 'summary.md'), md, 'utf8');

console.log(`\n=== 汇总：${report.pass}/${report.total} 门禁通过 ===`);
for (const r of results) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(6)} exit=${r.exitCode}  ${(r.durationMs / 1000).toFixed(1)}s`);
console.log(`凭证：dist/ci-local/report.json + dist/ci-local/summary.md`);

if (failed.length) {
  console.error(`\n失败门禁：${failed.map((f) => f.id).join(', ')}`);
  process.exitCode = 1;
}
