/**
 * AI 生成质量的**结构指标基线**（P0-2）。
 *
 * ## 为什么需要它
 *
 * 改提示词 / few-shot 之后，此前唯一的判断是「看对比图」——一次性实验，无法回归。
 * 这个脚本把指标固化成文件，之后每次改动都能看到「哪项涨了、哪项掉了」。
 *
 * ## 为什么基线取自语料而不是生成结果
 *
 * 生成有随机性，且需要 API key。语料（`fewshots.json` 的 19 条）是确定性的：
 * 它代表「模型被示范了什么」。改了 few-shot 就会反映在这里，而且能进 CI。
 *
 * 想给「真实生成结果」建基线，用 `probe-repeat.ts`（需要 key），它复用同一套指标。
 *
 * ## 用法
 *
 * ```bash
 * npx vite-node scripts/ai-baseline.ts           # 写基线
 * npx vite-node scripts/ai-baseline.ts --check   # 对比，退化则退出码 1
 * ```
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { auditPage, auditSpec, formatMetrics, HIGHER_IS_BETTER, type AiMetrics } from '../src/editor/ai/audit';
import { loadFewShots } from '../src/editor/ai/promptPack';
import { draftToPage } from '../src/editor/ai/specToPage';
import { PACKS } from '../src/tokens/packs';
import type { AiPageDraft } from '../src/editor/ai/types';

const ROOT = resolve(import.meta.dirname ?? '.', '..');
const BASELINE_PATH = resolve(ROOT, 'docs/ai-metrics-baseline.json');

interface Baseline {
  version: 1;
  /** 来源说明，防止有人拿不同口径的基线来比 */
  source: string;
  /** 各页指标（键 = fewshot id） */
  pages: Record<string, AiMetrics>;
  /** 19 条累加后的总量 */
  total: AiMetrics;
}

/** 把多份指标累加：计数相加，集合合并 */
function sumMetrics(list: AiMetrics[]): AiMetrics {
  const uniq = <T,>(fn: (m: AiMetrics) => T[]): T[] => [...new Set(list.flatMap(fn))];
  const add = (fn: (m: AiMetrics) => number): number => list.reduce((a, m) => a + fn(m), 0);
  const kinds: Record<string, number> = {};
  for (const m of list) for (const [k, v] of Object.entries(m.kinds)) kinds[k] = (kinds[k] ?? 0) + v;
  return {
    nodes: add((m) => m.nodes),
    kinds: Object.fromEntries(Object.entries(kinds).sort((a, b) => a[0].localeCompare(b[0]))),
    layoutFields: uniq((m) => m.layoutFields).sort(),
    styleFields: uniq((m) => m.styleFields).sort(),
    effectNodes: add((m) => m.effectNodes),
    effectCount: add((m) => m.effectCount),
    gradientCount: add((m) => m.gradientCount),
    fillsNodes: add((m) => m.fillsNodes),
    decorationNodes: add((m) => m.decorationNodes),
    decorationKinds: uniq((m) => m.decorationKinds).sort(),
    statesNodes: add((m) => m.statesNodes),
    gridNodes: add((m) => m.gridNodes),
    transformNodes: add((m) => m.transformNodes),
    radii: uniq((m) => m.radii).sort((a, b) => a - b),
    fontSizes: uniq((m) => m.fontSizes).sort((a, b) => a - b),
    fontWeights: uniq((m) => m.fontWeights).sort((a, b) => a - b),
    colors: uniq((m) => m.colors).sort(),
    borderNodes: add((m) => m.borderNodes),
    textChars: add((m) => m.textChars),
    repeatNodes: add((m) => m.repeatNodes),
  };
}

/** 参与对比的标量指标（集合类只报长度） */
const SCALARS: { key: keyof AiMetrics; label: string }[] = [
  { key: 'nodes', label: '节点数' },
  { key: 'effectNodes', label: '阴影节点' },
  { key: 'effectCount', label: '效果条目' },
  { key: 'gradientCount', label: '渐变条目' },
  { key: 'fillsNodes', label: '多层填充节点' },
  { key: 'decorationNodes', label: '装饰节点' },
  { key: 'statesNodes', label: '交互态节点' },
  { key: 'gridNodes', label: '网格容器' },
  { key: 'transformNodes', label: '变换节点' },
  { key: 'borderNodes', label: '描边节点' },
  { key: 'textChars', label: '文本字数' },
];

const SETS: { key: keyof AiMetrics; label: string }[] = [
  { key: 'styleFields', label: '样式字段' },
  { key: 'radii', label: '圆角档' },
  { key: 'fontSizes', label: '字号档' },
  { key: 'colors', label: '颜色数' },
];

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const shots = await loadFewShots();
  if (!shots.length) throw new Error('fewshots.json 为空或加载失败');

  const pages: Record<string, AiMetrics> = {};
  for (const s of shots) {
    const draft = JSON.parse(s.spec) as AiPageDraft;
    /**
     * 必须过一遍转换层再统计。
     *
     * few-shot 的 `spec` 是**模型视角的写法**——布局与样式几乎全在 `className` 里
     * （`flex items-center gap-3 px-4 rounded-xl`），`layout` / `style` 对象基本是空的。
     * 直接 `auditSpec` 会得出「样式字段 3 个、圆角档 0」这种毫无意义的数。
     * 走 `draftToPage` 才能看到 className 解析 + repeat 展开之后的真实结构。
     */
    const built = draftToPage(draft, { pack: PACKS[0] });
    const fromPage = auditPage(built.page);
    // repeat 的使用情况只有 spec 视角看得到（展开后就没了）
    pages[s.id] = { ...fromPage, repeatNodes: auditSpec(draft.root).repeatNodes };
  }
  const total = sumMetrics(Object.values(pages));
  const current: Baseline = {
    version: 1,
    source: `fewshots.json · ${shots.length} 条语料 · 展开 repeat 前`,
    pages,
    total,
  };

  if (!check) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
    console.log(`基线已写入 ${BASELINE_PATH}`);
    console.log(`  ${formatMetrics(total)}`);
    return;
  }

  if (!existsSync(BASELINE_PATH)) throw new Error(`基线不存在，先跑一次不带 --check 的：${BASELINE_PATH}`);
  const base = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
  if (base.version !== current.version) throw new Error('基线版本不符，请重新生成');

  const rows: { label: string; before: number; after: number; delta: number; bad: boolean }[] = [];
  for (const { key, label } of SCALARS) {
    const before = base.total[key] as number;
    const after = total[key] as number;
    const higherBetter = HIGHER_IS_BETTER.includes(key);
    const delta = after - before;
    // 退化 = 「越大越好」的指标掉了，或节点数暴涨（输出预算被格式吃掉）
    const bad = higherBetter ? delta < 0 : key === 'nodes' ? delta > before * 0.5 : false;
    rows.push({ label, before, after, delta, bad });
  }
  for (const { key, label } of SETS) {
    const before = (base.total[key] as unknown[]).length;
    const after = (total[key] as unknown[]).length;
    rows.push({ label, before, after, delta: after - before, bad: after < before });
  }

  const pad = (s: string, n: number): string => s + ' '.repeat(Math.max(0, n - [...s].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 2 : 1), 0)));
  console.log(`\n对比基线（${base.source}）`);
  console.log(`${pad('指标', 16)}${pad('基线', 10)}${pad('当前', 10)}变化`);
  console.log('-'.repeat(48));
  for (const r of rows) {
    const sign = r.delta > 0 ? '+' : '';
    const mark = r.delta === 0 ? '' : r.bad ? '  ✗ 退化' : '  ✓';
    console.log(`${pad(r.label, 16)}${pad(String(r.before), 10)}${pad(String(r.after), 10)}${sign}${r.delta}${mark}`);
  }

  const regressions = rows.filter((r) => r.bad);
  if (regressions.length) {
    console.error(`\n${regressions.length} 项退化：${regressions.map((r) => r.label).join('、')}`);
    console.error('若这是有意的取舍（例如为了美观压缩了节点数），用不带 --check 的方式更新基线并在提交信息里说明。');
    process.exitCode = 1;
  } else {
    console.log('\n无退化。');
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
