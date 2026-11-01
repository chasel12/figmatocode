/**
 * 场景期望校验：把 `scenarios.ts` 的 45 条场景变成 **45 条可回归的检查**
 *
 * 为什么需要这一步：`ui-gen` 只统计「生成了几页、几轮通过、几个节点」——
 * 那只回答「有没有生成出来」，不回答「生成的是不是要的东西」。
 * 没有这一层，45 个场景就只是一堆截图，改一次转换层无法判断有没有变好。
 *
 * 判据分两块（`scenarioChecks.ts`）：
 *  - `BASE_CHECKS`：所有场景的底线（节点数、文案数、无重复塌陷、无横向溢出）
 *  - `SCENARIO_CHECKS`：提示词里明确给了字面量/数量的那些期望
 *
 * `expect` 里「三格等高」「箭头在最右」这类视觉判断**不判**——没有客观判据，
 * 硬判只会制造误报。那部分靠 `ui-shots` 的截图人工看。
 *
 * 用法：
 *   npx vite-node scripts/ui-expect.ts            # 校验 `.tmp/ui-gen/*.page.json`
 *   npx vite-node scripts/ui-expect.ts --only=nav-tabbar
 *   npx vite-node scripts/ui-expect.ts --src=.tmp/ui-gen-v3   # 换一批产物（改提示词后对比用）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI_SCENARIOS } from '../src/editor/ai/scenarios';
import { BASE_CHECKS, SCENARIO_CHECKS, runChecks } from '../src/editor/ai/scenarioChecks';
import type { UIPage } from '../src/schema/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_MD = path.join(root, 'docs/ui-expect-report.md');

const argv = process.argv.slice(2);
const argOf = (flag: string, dflt: string): string => {
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  return i >= 0 ? (argv[i + 1] ?? dflt) : dflt;
};
const only = argOf('--only', '');
/**
 * `--src` 换产物目录。
 *
 * 存在的理由：改了提示词要回答「同样的场景现在过不过」，
 * 而直接覆盖 `.tmp/ui-gen` 就把「改之前」的产物删了，前后不可比。
 * 所以新产物先落另一个目录，两边各跑一遍再下结论。
 */
const SRC = path.resolve(root, argOf('--src', '.tmp/ui-gen'));

interface Row {
  id: string;
  group: string;
  priority: number;
  checks: number;
  failed: { detail: string; check: string }[];
  missing: boolean;
}

const rows: Row[] = [];
for (const s of UI_SCENARIOS) {
  if (only && !s.id.startsWith(only)) continue;
  const file = path.join(SRC, `${s.id}.page.json`);
  const checks = [...BASE_CHECKS, ...(SCENARIO_CHECKS[s.id] ?? [])];
  if (!fs.existsSync(file)) {
    rows.push({ id: s.id, group: s.group, priority: s.priority, checks: checks.length, failed: [], missing: true });
    continue;
  }
  const page = JSON.parse(fs.readFileSync(file, 'utf8')) as UIPage;
  const results = runChecks(page, checks);
  rows.push({
    id: s.id,
    group: s.group,
    priority: s.priority,
    checks: checks.length,
    missing: false,
    failed: results.filter((r) => !r.pass).map((r) => ({ detail: r.detail, check: JSON.stringify(r.check) })),
  });
}

const ok = rows.filter((r) => !r.missing && r.failed.length === 0);
const bad = rows.filter((r) => !r.missing && r.failed.length > 0);
const missing = rows.filter((r) => r.missing);
const totalChecks = rows.reduce((n, r) => n + r.checks, 0);
const failedChecks = rows.reduce((n, r) => n + r.failed.length, 0);

const lines: string[] = [];
lines.push('# UI 场景期望校验', '');
lines.push(`> 生成时间 ${new Date().toISOString().slice(0, 19).replace('T', ' ')}　·　场景 ${rows.length} 个　·　判据 ${totalChecks} 条`);
lines.push('>');
lines.push('> 判的是「提示词里明确给了字面量/数量」的那部分。`expect` 里「三格等高」「箭头在最右」');
lines.push('> 这类视觉判断**不在这里判**（没有客观判据，硬判只会制造误报），看 `ui-shots` 的截图。');
lines.push('');
lines.push(`**结论：${ok.length}/${rows.length} 场景全过；判据 ${totalChecks - failedChecks}/${totalChecks} 通过**`);
lines.push('');

if (bad.length) {
  lines.push('## 未通过', '');
  lines.push('| 场景 | 组 | 失败判据 |', '|---|---|---|');
  for (const r of bad) {
    for (const f of r.failed) lines.push(`| \`${r.id}\` | ${r.group} | ${f.detail.replace(/\|/g, '\\|')} |`);
  }
  lines.push('');
}
if (missing.length) {
  lines.push('## 缺产物', '', missing.map((r) => `\`${r.id}\``).join('、'), '');
}

lines.push('## 全量', '');
lines.push('| 场景 | 组 | 优先级 | 判据 | 结果 |', '|---|---|---|---|---|');
for (const r of rows) {
  lines.push(
    `| \`${r.id}\` | ${r.group} | ${r.priority} | ${r.checks} | ${r.missing ? '缺产物' : r.failed.length ? `✗ ${r.failed.length} 条` : '✓'} |`,
  );
}
lines.push('');

fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`, 'utf8');

console.log(`场景 ${rows.length} 个 / 判据 ${totalChecks} 条：通过 ${totalChecks - failedChecks}，失败 ${failedChecks}`);
console.log(`  全过 ${ok.length} 个 · 有失败 ${bad.length} 个${missing.length ? ` · 缺产物 ${missing.length} 个` : ''}`);
for (const r of bad) for (const f of r.failed) console.log(`  ✗ ${r.id.padEnd(18)} ${f.detail}`);
console.log(`\n产物 ${path.relative(root, SRC)} · 报告 → ${path.relative(root, OUT_MD)}`);
process.exit(bad.length + missing.length ? 1 : 0);
