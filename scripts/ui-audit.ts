/**
 * UI 形态审计：把 `bugscan/` 的检测器跑在真实产物上，出报告 + 基线。
 *
 * 扫描对象分三组，**口径不同不能混着看**：
 *
 * 1. `demo`（19 页，人工设计）—— 是「设计基线」。这里命中说明检测器误报，
 *    或者那条设计本身确实有问题。**误报的第一道防线。**
 * 2. `mall`（6 页，AI 生成 → draftToPage → 存盘）—— 真实 AI 产物的代表。
 * 3. `draft`（模型原始输出）—— 走同一条 `draftToPage` 管线，得到的就是
 *    「现在生成会得到什么」。与 mall 的区别是它没经过人工改。
 *
 * 三组都跑 `normalize`（即 `draftToPage` 内部会跑的那套），因为要回答的是
 * **「现在生成出来的东西还有哪些 bug」**，而不是「模型原始输出有哪些 bug」——
 * 后者已经被 normalize 修掉的不需要再写规则。
 *
 * 用法：
 *   npx vite-node scripts/ui-audit.ts                 # 全量
 *   npx vite-node scripts/ui-audit.ts --only=badge-inline
 *   npx vite-node scripts/ui-audit.ts --baseline      # 重写基线
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allDemoPages } from '../src/demo/pages';
import { draftToPage, normalizePage } from '../src/editor/ai/specToPage';
import { BUG_DETECTORS } from '../src/editor/ai/bugscan/detectors';
import { scanPages, countNodes } from '../src/editor/ai/bugscan';
import type { BugHit } from '../src/editor/ai/bugscan/types';
import type { AiPageDraft } from '../src/editor/ai/types';
import type { UIPage } from '../src/schema/types';
import { getPack } from '../src/tokens/packs';
import { readFileSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_MD = path.join(root, 'docs/ui-audit-report.md');
const OUT_JSON = path.join(root, 'docs/ui-audit-baseline.json');

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);
const writeBaseline = argv.includes('--baseline');

/* ---------------- 页面来源 ---------------- */

interface Group {
  key: string;
  label: string;
  pages: UIPage[];
  /** 采集失败的原因（报告里如实写，不静默跳过） */
  note?: string;
}

/** 从 `src/assets/icons/lucide.ts` 读图标表（与运行时同一份数据，免动态 import） */
function loadIcons(): Record<string, string> {
  try {
    const src = readFileSync(path.join(root, 'src/assets/icons/lucide.ts'), 'utf8');
    const out: Record<string, string> = {};
    for (const m of src.matchAll(/['"]?([a-z0-9-]+)['"]?\s*:\s*\{\s*d:\s*['"]([^'"]+)['"]/g)) out[m[1]] = m[2];
    return out;
  } catch {
    return {};
  }
}

const icons = loadIcons();
const pack = getPack('shadcn');

function collectDrafts(): { pages: UIPage[]; note?: string } {
  const dirs = [
    '.tmp/ai-ab-diancai',
    '.tmp/ai-ab-ev-scooter',
    '.tmp/ai-ab-ev-scooter-verify',
    '.tmp/ai-ab-manga',
    '.tmp/ai-brutalist',
  ];
  const pages: UIPage[] = [];
  const failed: string[] = [];
  for (const d of dirs) {
    const abs = path.join(root, d);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) {
      if (!/draft/i.test(f) || !f.endsWith('.json')) continue;
      try {
        const draft = JSON.parse(fs.readFileSync(path.join(abs, f), 'utf8')) as AiPageDraft;
        const { page } = draftToPage(draft, { pack, icons });
        // 页面名带上来源，报告里能分清是哪一份 draft
        page.name = `${d.split('/').pop()}/${f.replace('.json', '')}`;
        pages.push(page);
      } catch (err) {
        failed.push(`${d}/${f}: ${(err as Error).message.slice(0, 60)}`);
      }
    }
  }
  return { pages, note: failed.length ? `解析失败 ${failed.length} 份：${failed.join('; ')}` : undefined };
}

function collectMall(): { pages: UIPage[]; note?: string } {
  const p = path.join(root, '.tmp/mall/project.json');
  if (!fs.existsSync(p)) return { pages: [], note: '未找到 .tmp/mall/project.json（先跑 `npm run mall:verify` 或生成一次）' };
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as { project?: { pages?: UIPage[] }; pages?: UIPage[] };
    const pages = (raw.project ?? raw).pages ?? [];
    return { pages, note: pages.length ? undefined : 'project.json 里没有页面' };
  } catch (err) {
    return { pages: [], note: `解析失败：${(err as Error).message.slice(0, 80)}` };
  }
}

const demoPages = [...allDemoPages()];
const mall = collectMall();
/**
 * `mall` 的 `project.json` 是**已存盘**产物，规则改了它不会变 —— 扫出来的是旧缺陷。
 * 所以再复制一份补跑 `normalizePage`，得到「现在重新生成会怎样」。
 *
 * 两份都留：存量那份反映「用户手里的东西长什么样」，重跑那份验证「规则真的有用」。
 * 只留一份就会误导 —— 只留存量会显得规则没用，只留重跑会显得没有问题。
 */
const mallAfter: UIPage[] = mall.pages.length
  ? (JSON.parse(JSON.stringify(mall.pages)) as UIPage[]).map((p) => {
      normalizePage(p.root, [], []);
      return p;
    })
  : [];
const drafts = collectDrafts();

const groups: Group[] = [
  { key: 'demo', label: 'demo（人工设计，误报防线）', pages: demoPages },
  { key: 'mall', label: 'mall 存量（已存盘，规则改动对它无效）', pages: mall.pages, note: mall.note },
  { key: 'mall+', label: 'mall 重跑（补跑 normalizePage，等于「现在重新生成」）', pages: mallAfter },
  { key: 'draft', label: 'draft（模型原始输出 → 同管线）', pages: drafts.pages, note: drafts.note },
];

/* ---------------- 跑检测器 ---------------- */

const detectors = onlyArg ? BUG_DETECTORS.filter((d) => d.id === onlyArg) : BUG_DETECTORS;
if (onlyArg && detectors.length === 0) {
  console.error(`未找到检测器 ${onlyArg}；可用：${BUG_DETECTORS.map((d) => d.id).join(', ')}`);
  process.exit(1);
}

interface GroupResult {
  group: Group;
  summary: ReturnType<typeof scanPages>;
}

const results: GroupResult[] = groups.map((g) => ({ group: g, summary: scanPages(g.pages, detectors) }));

/* ---------------- 出报告 ---------------- */

const lines: string[] = [];
const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
lines.push('# UI 形态审计报告', '');
lines.push(`> 生成时间 ${now}　·　检测器 ${detectors.length} 个　·　页面 ${results.reduce((n, r) => n + r.summary.totalPages, 0)} 个`);
lines.push('>', '> `mall` 有两列：**存量**是已存盘的 `project.json`（规则改动对它无效），**重跑**是补跑一遍 `normalizePage` 的结果。两列之差 = 现有 normalize 能修多少。');
lines.push('>');
lines.push('> 本报告**只检测不修复**。它回答「现在生成出来的东西有哪些坏形态」，');
lines.push('> 不回答「怎么修」——修不修、写哪条 normalize，看完全部数字再定。');
lines.push('');

lines.push('## 一、扫描范围', '');
lines.push('| 组 | 页面 | 节点 | 说明 |', '|---|---|---|---|');
for (const r of results) {
  const note = r.group.note ? `（${r.group.note}）` : '';
  lines.push(`| ${r.group.key} | ${r.summary.totalPages} | ${r.summary.totalNodes} | ${r.group.label}${note} |`);
}
lines.push('');

/* 总览表：按检测器 */
lines.push('## 二、按检测器', '');
lines.push('| 检测器 | 严重度 | demo | mall 存量 | mall 重跑 | draft | 合计 | 判定 |', '|---|---|---|---|---|---|---|---|');

const bugIds = detectors.map((d) => d.id);
for (const id of bugIds) {
  const d = detectors.find((x) => x.id === id)!;
  const counts = results.map((r) => r.summary.byBug[id] ?? 0);
  const total = counts.reduce((a, b) => a + b, 0);
  let verdict: string;
  if (total === 0) verdict = d.coveredBy ? `回归基线（${d.coveredBy}）` : '产物里无此形态';
  else if (counts[0] > 0) verdict = `⚠ demo 也命中 ${counts[0]}，先查误报`;
  else verdict = '仅 AI 产物命中，可信';
  lines.push(`| \`${id}\` | ${d.severity} | ${counts[0]} | ${counts[1]} | ${counts[2]} | ${counts[3]} | ${total} | ${verdict} |`);
}
lines.push('');

/* 判定说明 */
const zeroHit = bugIds.filter((id) => results.every((r) => (r.summary.byBug[id] ?? 0) === 0));
if (zeroHit.length) {
  const covered = zeroHit.filter((id) => detectors.find((d) => d.id === id)?.coveredBy);
  const absent = zeroHit.filter((id) => !detectors.find((d) => d.id === id)?.coveredBy);
  lines.push('**0 命中有两种含义，必须分开看：**', '');
  if (covered.length) {
    lines.push(`- **回归基线**（有 normalize 负责修，0 命中说明那条修复在跑）：${covered.map((x) => `\`${x}\``).join(', ')}`);
  }
  if (absent.length) {
    lines.push(`- **产物里真没有这种形态**（没有 normalize 负责）：${absent.map((x) => `\`${x}\``).join(', ')}`);
  }
  lines.push('');
  lines.push('两者都不是「检测器没跑」：`scanPages` 会记录每个检测器是否被调用，');
  lines.push('从未调用的会出现在下面「未调用」清单里 —— 那才是真的接错了。');
  lines.push('');
}

const silent = [...new Set(results.flatMap((r) => r.summary.silent))];
if (silent.length) {
  lines.push(`- ⚠ **从未被调用**的检测器：${silent.map((x) => `\`${x}\``).join(', ')}（注册表接错了，不是 0 命中）`);
  lines.push('');
}

/* 按页面 */
lines.push('## 三、按页面', '');
for (const r of results) {
  if (r.summary.totalPages === 0) continue;
  lines.push(`### ${r.group.key}`, '');
  lines.push('| 页面 | 节点 | bug | taste | 主要命中 |', '|---|---|---|---|---|');
  const rows = [...r.summary.pages].sort((a, b) => b.hits.length - a.hits.length);
  for (const p of rows) {
    const bug = p.hits.filter((h) => h.severity === 'bug').length;
    const taste = p.hits.length - bug;
    const top = Object.entries(
      p.hits.reduce<Record<string, number>>((m, h) => ({ ...m, [h.bugId]: (m[h.bugId] ?? 0) + 1 }), {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k}×${v}`)
      .join(' ');
    lines.push(`| ${p.page} | ${p.nodes} | ${bug} | ${taste} | ${top || '—'} |`);
  }
  lines.push('');
}

/* 明细：只列 bug 级，taste 太多 */
const allBugHits: BugHit[] = results.flatMap((r) =>
  r.summary.pages.flatMap((p) => p.hits.filter((h) => h.severity === 'bug')),
);
lines.push('## 四、bug 级明细', '');
if (allBugHits.length === 0) {
  lines.push('无。当前所有产物里没有 `severity: bug` 级的命中。', '');
} else {
  lines.push('| 检测器 | 页面 | 节点 | 说明 |', '|---|---|---|---|');
  for (const h of allBugHits.slice(0, 60)) {
    lines.push(`| \`${h.bugId}\` | ${h.page} | ${h.path} | ${h.detail.replace(/\|/g, '\\|')} |`);
  }
  if (allBugHits.length > 60) lines.push('', `（另有 ${allBugHits.length - 60} 条未列出）`);
  lines.push('');
}

/* taste 汇总（不逐条列，只给组合） */
lines.push('## 五、taste 级分布', '');
const tasteHits = results.flatMap((r) => r.summary.pages.flatMap((p) => p.hits.filter((h) => h.severity === 'taste')));
if (tasteHits.length === 0) {
  lines.push('无。', '');
} else {
  const byId = tasteHits.reduce<Record<string, BugHit[]>>((m, h) => {
    (m[h.bugId] ??= []).push(h);
    return m;
  }, {});
  for (const [id, hs] of Object.entries(byId).sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`### \`${id}\`（${hs.length} 条）`, '');
    for (const h of hs.slice(0, 8)) lines.push(`- ${h.page} · ${h.path} · ${h.detail}`);
    if (hs.length > 8) lines.push(`- …… 另有 ${hs.length - 8} 条`);
    lines.push('');
  }
}

/* 基线 diff */
lines.push('## 六、基线', '');
const baseline: Record<string, number> = {};
for (const id of bugIds) baseline[id] = results.reduce((n, r) => n + (r.summary.byBug[id] ?? 0), 0);

if (fs.existsSync(OUT_JSON) && !writeBaseline) {
  try {
    const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')) as { counts?: Record<string, number> };
    const before = prev.counts ?? {};
    lines.push('| 检测器 | 上次 | 本次 | 变化 |', '|---|---|---|---|');
    for (const id of bugIds) {
      const a = before[id] ?? 0;
      const b = baseline[id];
      const delta = b - a;
      const mark = delta === 0 ? '持平' : delta > 0 ? `+${delta}` : `${delta}`;
      lines.push(`| \`${id}\` | ${a} | ${b} | ${mark} |`);
    }
    lines.push('');
  } catch {
    lines.push('（基线文件损坏，已忽略）', '');
  }
} else {
  lines.push('本次作为基线写入 `docs/ui-audit-baseline.json`。', '');
}

if (writeBaseline || !fs.existsSync(OUT_JSON)) {
  fs.writeFileSync(
    OUT_JSON,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        pages: results.map((r) => ({ group: r.group.key, pages: r.summary.totalPages, nodes: r.summary.totalNodes })),
        counts: baseline,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`, 'utf8');

/* ---------------- 控制台摘要 ---------------- */

console.log(`扫描 ${results.reduce((n, r) => n + r.summary.totalPages, 0)} 页 / ${results.reduce((n, r) => n + r.summary.totalNodes, 0)} 节点`);
for (const r of results) {
  console.log(`  ${r.group.key.padEnd(6)} ${String(r.summary.totalPages).padStart(2)} 页 ${String(r.summary.totalNodes).padStart(4)} 节点 ${String(r.summary.totalHits).padStart(3)} 命中${r.group.note ? `（${r.group.note}）` : ''}`);
}
console.log('');
for (const id of bugIds) {
  const counts = results.map((r) => r.summary.byBug[id] ?? 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const d = detectors.find((x) => x.id === id)!;
  const cells = results.map((r, i) => `${r.group.key}=${counts[i]}`).join(' ');
  console.log(`  ${total === 0 ? '·' : '!'} ${id.padEnd(18)} ${String(total).padStart(3)}  ${cells}  [${d.severity}]`);
}
if (silent.length) console.log(`\n⚠ 从未调用：${silent.join(', ')}`);
console.log(`\n报告 → ${path.relative(root, OUT_MD)}`);
