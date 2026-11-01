/**
 * 前端规范门禁（`docs/frontend-standards-final.md` §4.6）。
 *
 * 四段，任一失败非零退出：
 *   S1 规则表自检（每条规则都有 pass/fail fixture，且 fixture 能解析）
 *   S2 fixture 全跑（T1 正例 0 命中 / T2 反例 ≥1 命中）
 *   S3 变异测试（T3：把 check 换成 () => [] 后反例必须变红）
 *   S4 真产物跑（19 页 demo + 6 页零食商城）→ 命中率对比 baseline
 *
 * **不并进 `npm test`**：S4 要编译真实产物，慢。S1~S3 是纯内存的，已经在单测里
 * （`tests/standards-registry.test.ts` 调用的是同一份 `audit.ts`，不是另写一遍）。
 *
 * 用法：
 *   npm run standards:check             # S1~S4，S4 只比对不写盘
 *   npm run standards:check -- --update # 重写 docs/standards-baseline.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilePage } from '../src/compiler';
import { scssFromPage } from '../src/compiler/css-model';
import { allDemoPages } from '../src/demo/pages';
import { parseProjectOnly } from '../src/editor/project';
import { RULES, rulesByDomain } from '../src/standards/rules';
import { fixtureReport, mutationReport, selfCheck } from '../src/standards/audit';
import { buildContext } from '../src/standards/context';
import { runRules } from '../src/standards/runner';
import type { UIPage } from '../src/schema/types';
import type { Platform, StandardViolation } from '../src/standards/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const UPDATE = argv.includes('--update');
const BASELINE = path.join(root, 'docs', 'standards-baseline.json');
const REPORT = path.join(root, 'docs', 'standards-report.md');

const PLATFORMS: Platform[] = ['h5', 'mini'];

/** 真实产物：19 页 demo +（若存在）6 页零食商城工程 */
function loadProducts(): { name: string; pages: UIPage[] }[] {
  const out: { name: string; pages: UIPage[] }[] = [];
  try {
    out.push({ name: 'demo-19', pages: allDemoPages() });
  } catch (err) {
    console.warn(`⚠ demo 语料加载失败：${String(err)}`);
  }
  const mall = path.join(root, '.tmp', 'mall', 'project.json');
  if (fs.existsSync(mall)) {
    try {
      const project = parseProjectOnly(fs.readFileSync(mall, 'utf8'));
      out.push({ name: 'mall-6', pages: project.pages });
    } catch (err) {
      console.warn(`⚠ 商城工程解析失败：${String(err)}`);
    }
  } else {
    console.log('· 跳过 mall-6（.tmp/mall/project.json 不存在）');
  }
  return out;
}

interface RuleStat {
  hits: number;
  pages: number;
  samples: { path: string; product: string; page: string; platform: Platform; message: string }[];
}

const problems: string[] = [];
const lines: string[] = [];

/* ---------------- S1 规则表自检 ---------------- */
const s1 = selfCheck(RULES);
lines.push('## S1 规则表自检', '');
if (s1.length) {
  problems.push(...s1.map((p) => `S1 · ${p}`));
  lines.push(...s1.map((p) => `- ❌ ${p}`));
} else {
  lines.push(`- ✅ ${RULES.length} 条规则，每条都有 pass/fail fixture`);
}

/* ---------------- S2 fixture 全跑 ---------------- */
const s2 = fixtureReport(RULES);
const s2bad = s2.filter((r) => !r.ok);
lines.push('', '## S2 fixture（T1 正例 / T2 反例）', '');
lines.push(`- 共 ${s2.length} 个 fixture 运行（正例 ${s2.filter((r) => r.kind === 'pass').length} / 反例 ${s2.filter((r) => r.kind === 'fail').length}）`);
if (s2bad.length) {
  problems.push(...s2bad.map((r) => `S2 · ${r.ruleId} · ${r.fixture} · ${r.note}`));
  lines.push(...s2bad.map((r) => `- ❌ ${r.ruleId} · ${r.fixture} · ${r.note}`));
} else {
  lines.push('- ✅ 全部通过');
}

/* ---------------- S3 变异测试 ---------------- */
const s3 = mutationReport(RULES);
const s3bad = s3.filter((r) => !r.ok);
lines.push('', '## S3 变异测试（空实现下反例必须变红）', '');
lines.push(`- 共 ${s3.length} 次变异`);
if (s3bad.length) {
  problems.push(...s3bad.map((r) => `S3 · ${r.ruleId} · ${r.fixture} · ${r.note}`));
  lines.push(...s3bad.map((r) => `- ❌ ${r.ruleId} · ${r.fixture} · ${r.note}`));
} else {
  lines.push('- ✅ 全部变红（断言确实依赖实现）');
}

/* ---------------- S4 真产物 ---------------- */
const products = loadProducts();
const stats = new Map<string, RuleStat>();
const skipped = new Map<string, number>();
const nodesByPlatform: Record<string, number> = {};
let nodeCount = 0;

for (const product of products) {
  const pageNames = product.pages.map((p) => p.name);
  for (const page of product.pages) {
    let css = '';
    try {
      css = scssFromPage(compilePage(page));
    } catch {
      // 编译失败不算规范问题（那是别的门禁的事），D5 规则会自动跳过
    }
    for (const platform of PLATFORMS) {
      const ctx = buildContext(page, { platform, site: { pageNames, sitewide: true }, css });
      nodeCount += ctx.nodes.length;
      nodesByPlatform[platform] = (nodesByPlatform[platform] ?? 0) + ctx.nodes.length;
      const res = runRules(ctx, RULES);
      for (const id of res.skipped) skipped.set(id, (skipped.get(id) ?? 0) + 1);
      for (const v of res.violations) {
        const s = stats.get(v.ruleId) ?? { hits: 0, pages: 0, samples: [] };
        s.hits += 1;
        s.pages += 1;
        if (s.samples.length < 3) {
          s.samples.push({ path: v.path, product: product.name, page: page.name, platform, message: v.message });
        }
        stats.set(v.ruleId, s);
      }
    }
  }
}

const totalPages = products.reduce((n, p) => n + p.pages.length, 0);
lines.push('', '## S4 真产物命中率', '');
lines.push(`- 产物：${products.map((p) => `${p.name}(${p.pages.length} 页)`).join(' + ')}，共 ${totalPages} 页 × ${PLATFORMS.length} 端，节点 ${nodeCount} 个`);
lines.push('', '| 域 | 规则 | 命中 | 每千节点 | 命中/页 | 判定 |', '|---|---|---|---|---|---|');

/**
 * 分母必须是**该规则真正跑过的节点**：D6 只在小程序端跑，用全量节点当分母会把它的
 * 命中率稀释一半，看起来「健康」其实已经很吵。同一条纪律：分母缩水/膨胀都会骗人。
 */
function denomOf(rulePlatforms: string[]): number {
  const ps = PLATFORMS.filter((p) => rulePlatforms.includes('all') || rulePlatforms.includes(p));
  return ps.reduce((n, p) => n + (nodesByPlatform[p] ?? 0), 0);
}

const rate = (hits: number, denom: number): string => (denom ? ((hits / denom) * 1000).toFixed(2) : '0.00');

/** §4.4 的判定表换算成「每页命中数」：单页超过 10 条说明模型一轮改不完 */
function verdict(hits: number): string {
  if (hits === 0) return '0%（查是否真跑过）';
  const perPage = hits / Math.max(1, totalPages * PLATFORMS.length);
  if (perPage <= 2) return '健康';
  if (perPage <= 10) return '偏严';
  return '过严或产物真差';
}

for (const [domain, rules] of Object.entries(rulesByDomain())) {
  for (const rule of rules) {
    const st = stats.get(rule.id);
    const hits = st?.hits ?? 0;
    const denom = denomOf(rule.platform);
    const perPage = (hits / Math.max(1, totalPages * PLATFORMS.length)).toFixed(2);
    lines.push(`| ${domain} | ${rule.id} | ${hits} | ${rate(hits, denom)} | ${perPage} | ${verdict(hits)} |`);
  }
}

const zeroHits = RULES.filter((r) => !stats.get(r.id) && !skipped.get(r.id));
if (zeroHits.length) {
  lines.push('', `- ⚠ 0 命中且未被跳过的规则：${zeroHits.map((r) => r.id).join(', ')}`);
  lines.push(
    '  - **0 命中 ≠ 没跑**：每条规则都在 S2 用 fail fixture 命中过、且在 S3 空实现下变红过。' +
      '这两条是「规则活着」的机器证明；0 命中只说明真产物里没有这一类问题（§4.4 的第一种成因已排除）。',
  );
}
if (skipped.size) {
  lines.push(`- 端跳过统计：${[...skipped.entries()].map(([id, n]) => `${id}×${n}`).join(', ')}`);
}

/* ---------------- baseline 比对 ---------------- */
interface Baseline {
  version: 1;
  pages: number;
  nodes: number;
  rules: Record<string, number>;
}
const current: Baseline = {
  version: 1,
  pages: totalPages,
  nodes: nodeCount,
  rules: Object.fromEntries(RULES.map((r) => [r.id, stats.get(r.id)?.hits ?? 0])),
};

lines.push('', '## baseline diff', '');
if (!fs.existsSync(BASELINE)) {
  fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n', 'utf8');
  lines.push(`- 首次运行，已写入 \`docs/standards-baseline.json\``);
} else {
  const prev = JSON.parse(fs.readFileSync(BASELINE, 'utf8')) as Baseline;
  const deltas: string[] = [];
  for (const [id, n] of Object.entries(current.rules)) {
    const before = prev.rules?.[id];
    if (before === undefined) {
      deltas.push(`- 🆕 ${id}：新规则，命中 ${n}`);
      continue;
    }
    if (before === n) continue;
    const sign = n > before ? '↑' : '↓';
    deltas.push(`- ${sign} ${id}：${before} → ${n}`);
    // 回归判据：从「0 命中」变成「有命中」= 出现了一类新问题，必须显式确认
    if (before === 0 && n > 0 && !UPDATE) problems.push(`S4 · ${id}：基线为 0，现在 ${n} 条（确认后跑 --update）`);
  }
  lines.push(...(deltas.length ? deltas : ['- 无变化']));
  if (UPDATE) {
    fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n', 'utf8');
    lines.push('- 已用 `--update` 覆盖 baseline');
  }
}

/* ---------------- 样例（人读） ---------------- */
lines.push('', '## 命中样例（每条规则最多 3 条）', '');
for (const rule of RULES) {
  const st = stats.get(rule.id);
  if (!st?.samples.length) continue;
  lines.push(`### ${rule.id}（${rule.domain} · ${rule.source}）`, '');
  for (const s of st.samples) {
    lines.push(`- \`${s.product}/${s.page}\` · ${s.platform} · \`${s.path}\` — ${s.message}`);
  }
  lines.push('');
}

const header = [
  '# 前端规范门禁报告',
  '',
  `> 生成于 ${new Date().toISOString()} · \`npm run standards:check\``,
  `> 规则 ${RULES.length} 条 / 8 域（D8 是结构本身）`,
  '',
  problems.length ? `**结论：未通过（${problems.length} 项）**` : '**结论：通过**',
  '',
];
fs.writeFileSync(REPORT, [...header, ...lines].join('\n') + '\n', 'utf8');

/* ---------------- 输出 ---------------- */
for (const l of lines) console.log(l);
console.log(`\n报告：${path.relative(root, REPORT)}`);

if (problems.length) {
  console.error(`\n✗ ${problems.length} 项未通过：`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\n✓ S1~S4 全部通过');
