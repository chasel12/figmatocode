/**
 * 手工 AST 对照（一次性实验脚本，不进产品代码）
 *
 * ## 为什么需要它
 *
 * `scripts/ai-ab.ts` 要调真实模型（需要 API key）。没有 key 时仍要做
 * 「AI 产出节点树 → 编译」vs「AI 直接写前端代码」的对照，就只能把**模型那一环固定**：
 * 同一个智能体写两份产物，唯一变量是**输出格式**。
 *
 *   A：手写 `AiPageDraft` JSON（受契约约束）→ 项目真实编译链路 → HTML
 *   B：手写单文件 HTML（无约束）
 *
 * 这比调外部模型**隔离得更干净**：外部模型两次调用自带随机性，而这里
 * 「模型能力」这个变量被完全固定，剩下的差异只可能来自格式约束本身。
 *
 * ## 局限（必须写进结论）
 *
 * 走的是 `draftToPage` → `compilePage` → `generateHtml` 真实链路，但**没经过**
 * `runPageGeneration`（提示词组装 / 自修 / 成本统计）。所以产物可信，
 * 「一次通过率 / 成本 / 耗时」这几项不可测——那需要 key。
 *
 * 用法：
 *   npx vite-node scripts/ab-manual-shot.ts -- --dir .tmp/ai-ab-ev-scooter --pack blackgreen
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { validateAiOutput } from '../src/editor/ai/contract';
import { draftToPage } from '../src/editor/ai/specToPage';
import { auditPage, formatMetrics } from '../src/editor/ai/audit';
import { compilePage } from '../src/compiler/compile';
import { generateHtml } from '../src/generator/html';
import { PACKS } from '../src/tokens/packs';
import { loadIcons } from '../src/assets/icons';
import type { AiPageDraft } from '../src/editor/ai/types';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const DIR = resolve(arg('dir', '.tmp/ai-ab-ev-scooter'));
const PACK_ID = arg('pack', 'blackgreen');
const VIEWPORT = { width: 375, height: 812 };

async function main(): Promise<void> {
  const pack = PACKS.find((p) => p.id === PACK_ID) ?? PACKS[0];
  console.log(`风格包 = ${pack.id}（primary=${pack.colors.primary}）`);
  console.log(`产物目录 = ${DIR}\n`);

  /* ---------------- A：契约草稿 → 编译 ---------------- */
  const draftPath = resolve(DIR, 'A-draft.json');
  if (!existsSync(draftPath)) throw new Error(`缺少 ${draftPath}`);
  const raw = JSON.parse(readFileSync(draftPath, 'utf8')) as AiPageDraft;

  const iconAssets = await loadIcons();
  const iconMap = Object.fromEntries(Object.entries(iconAssets.icons).map(([k, v]) => [k, v.d]));

  /**
   * 两段校验都要跑：`validateAiOutput` 只查 schema 与语义，
   * `draftToPage` 里的 `className` 解析是第二个违例来源（只跑前者是假绿）。
   */
  const check = validateAiOutput(raw, { expect: 'page', pack, icons: iconMap });
  console.log(`[A] schema 校验：${check.ok ? 'PASS' : 'FAIL'}，违例 ${check.violations.length} 条`);
  for (const v of check.violations.slice(0, 10)) console.log(`     · ${v.path} [${v.kind}] ${v.message}`);

  const built = draftToPage(raw, { pack, icons: iconMap });
  console.log(`[A] 转换层违例：${built.violations.length} 条`);
  for (const v of built.violations.slice(0, 10)) console.log(`     · ${v.path} [${v.kind}] ${v.message}`);

  const compiled = compilePage(built.page);
  const htmlA = generateHtml(built.page, compiled, { title: 'A · AST 生成' });
  writeFileSync(resolve(DIR, 'A-ui-generator.html'), htmlA, 'utf-8');

  const metrics = auditPage(built.page);
  console.log(`[A] ${formatMetrics(metrics)}`);
  console.log(`[A] HTML ${htmlA.length} 字符\n`);

  /* ---------------- 截图 ---------------- */
  const browser = await chromium.launch();
  const shots: Record<string, { fullHeight: number }> = {};
  const files: [string, string][] = [['A', 'A-ui-generator.html']];
  if (existsSync(resolve(DIR, 'B-direct-code.html'))) files.push(['B', 'B-direct-code.html']);

  for (const [key, file] of files) {
    const p = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    await p.goto(`file://${resolve(DIR, file)}`, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    await p.screenshot({ path: resolve(DIR, `shot-${key}-viewport.png`) });
    await p.screenshot({ path: resolve(DIR, `shot-${key}-full.png`), fullPage: true });
    const fullHeight = await p.evaluate(() => document.documentElement.scrollHeight);
    shots[key] = { fullHeight };
    console.log(`[${key}] 截图完成，整页高 ${fullHeight}px`);
    await p.close();
  }
  await browser.close();

  /* ---------------- 对照指标 ---------------- */
  const out: Record<string, unknown> = {
    pack: pack.id,
    viewport: VIEWPORT,
    a: {
      violations: built.violations.length,
      nodes: metrics.nodes,
      metrics,
      htmlBytes: htmlA.length,
      fullHeight: shots.A?.fullHeight ?? null,
      /** 3D 表达力：AST 的 TransformSchema 只有 2D 六字段 */
      capability3d: 'none',
      svgPathCount: (htmlA.match(/<path\b/gi) ?? []).length,
      hasPerspective: /perspective/i.test(htmlA),
    },
  };

  if (existsSync(resolve(DIR, 'B-direct-code.html'))) {
    const htmlB = readFileSync(resolve(DIR, 'B-direct-code.html'), 'utf8');
    out.b = {
      htmlBytes: htmlB.length,
      fullHeight: shots.B?.fullHeight ?? null,
      divCount: (htmlB.match(/<div\b/g) ?? []).length,
      hasPerspective: /perspective/i.test(htmlB),
      has3d: /perspective|rotate3d|rotate[XY]\s*\(|translateZ|matrix3d/i.test(htmlB),
      hasCanvas: /<canvas\b/i.test(htmlB),
      svgPathCount: (htmlB.match(/<path\b/gi) ?? []).length,
      hasGradient: /gradient\(/i.test(htmlB),
      hasShadow: /box-shadow/i.test(htmlB),
      hasPseudo: /:hover|::?before|::?after/i.test(htmlB),
      hasFilter: /filter\s*:/i.test(htmlB),
      hasKeyframes: /@keyframes/i.test(htmlB),
      colorLiterals: [...new Set(htmlB.match(/#[0-9a-f]{6}\b/gi) ?? [])].length,
    };
  }

  writeFileSync(resolve(DIR, 'report.json'), JSON.stringify(out, null, 2), 'utf-8');
  console.log(`\n报告：${resolve(DIR, 'report.json')}`);
}

void main().catch((err) => {
  console.error('\n[FATAL]', err instanceof Error ? `${err.name}: ${err.message}` : err);
  if (err instanceof Error && err.stack) console.error(err.stack.split('\n').slice(0, 10).join('\n'));
  process.exit(1);
});
