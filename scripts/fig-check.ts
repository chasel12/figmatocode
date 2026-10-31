/**
 * FR-76/77 `.fig` 导入导出门禁。
 *
 *   vite-node scripts/fig-check.ts [--samples .tmp/fig-samples]
 *
 * 三件事：
 *   1. 导入关：真实 Figma 文件（tests/fixtures/fig/*.fig + 可选外部样本目录）能解出页面，
 *      节点类型/数量落在合理区间，不抛异常；
 *   2. 往返关：AST → .fig → AST，规范化后**深度相等**（结构无损）；
 *   3. 像素关：往返前后的页面分别编译成 HTML，用同一套 CSS 口径比对（像素 100% 才算无损）。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { importFig, type FigDecoded } from '../src/fig/import';
import { exportFig } from '../src/fig/export';
import { loadFigCodec } from '../src/fig/codec';
import { allDemoPages } from '../src/demo/pages';
import { compilePage } from '../src/compiler/compile';
import { scssFromPage } from '../src/compiler/css-model';
import { deepEqual, normalize, normalizeCss, roundDeep } from './fig-normalize';
import { createNode, createPage } from '../src/schema/factory';
import type { ComponentDef, ContainerNode, FlowDef, StyleToken, UINode, UIPage } from '../src/schema/types';

const ROOT = process.cwd();
const FIXTURES = join(ROOT, 'tests', 'fixtures', 'fig');
const OUT = join(ROOT, 'dist', 'fig');

/**
 * 已报备降级（对应计划 §10.4 偏差清单）。
 *
 * `.fig` 是 Figma 的格式，凡是 Figma 没有对应原语的 AST 能力，往返必然有损。
 * 这里逐页列出「已知且已接受」的降级：命中即计为降级而非失败，但必须打印原因，
 * 且**不允许**悄悄加条目 —— 新增一条就等于新增一项对外承诺的损失。
 *
 * **当前为空**（2026-10-27）：唯一一条 `PROGRESSIVE_BLUR → LAYER_BLUR` 已通过
 * `meta.json` 旁挂层（`ui_compiler_extras`）救回，19 页全部逐字段无损。
 * 空表本身就是一条断言：**任何新增的有损项都会立刻变红**，不会再被"已报备"吞掉。
 */
const KNOWN_LOSS = new Map<string, string>();

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
interface GateResult {
  ok: boolean;
  detail: Record<string, unknown>;
}

async function main(): Promise<void> {
  const codec = await loadFigCodec();
  const decode = (canvas: Uint8Array): FigDecoded => codec.decode(canvas);
  mkdirSync(OUT, { recursive: true });

  const sampleDirs = [FIXTURES];
  const extra = argValue('--samples');
  if (extra && existsSync(extra)) sampleDirs.push(join(ROOT, extra));

  /* ---------- 1. 导入关 ---------- */
  const importRows: Record<string, unknown>[] = [];
  let importOk = true;
  for (const dir of sampleDirs) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.fig'))) {
      const path = join(dir, file);
      const bytes = new Uint8Array(readFileSync(path));
      const started = Date.now();
      try {
        const result = importFig(bytes, decode, { maxNodes: 20000 });
        const nodes = result.pages.reduce((sum, p) => sum + countNodes(p.root), 0);
        const ok = result.pages.length > 0 && nodes > 0;
        importOk = importOk && ok;
        importRows.push({
          file,
          ok,
          ms: Date.now() - started,
          pages: result.pages.length,
          nodes,
          rawNodes: result.stats.rawNodes,
          types: result.stats.byType,
          warnings: result.warnings.length,
        });
      } catch (e) {
        importOk = false;
        importRows.push({ file, ok: false, error: (e as Error).message });
      }
    }
  }
  console.log(`导入关  ${importOk ? 'PASS' : 'FAIL'}  ${importRows.length} 个真实文件`);
  for (const r of importRows) {
    console.log(
      `        ${r.ok ? '✓' : '✗'} ${String(r.file).padEnd(34)} ${r.pages ?? '-'} 页 / ${r.nodes ?? '-'} 节点 / ${r.ms ?? '-'}ms${
        r.error ? ` · ${r.error}` : ''
      }`,
    );
  }

  /* ---------- 2. 往返关（结构） ---------- */
  const pages = allDemoPages();
  const roundTripRows: Record<string, unknown>[] = [];
  let structureOk = true;
  for (const page of pages) {
    const exported = await exportFig([page], codec.encode, { fileName: page.name, exportedAt: '2026-01-01T00:00:00.000Z' });
    const reimported = importFig(exported.bytes, decode);
    /**
     * 先比**页面级**三件事：视口尺寸、根容器尺寸、根布局模式。
     *
     * 这三项原先完全不比，于是「视口 1600 高、内容只到 812」的页面往返后被压成 812、
     * 百分比定位的子项整体位移 —— 子节点树逐字段相同，门禁却全绿。
     * 页面根容器不在 `.fig` 的节点树里，但它确实承载了设计意图，必须单独比。
     */
    const pageBefore = {
      viewport: `${page.viewport.width}x${page.viewport.height}`,
      root: `${page.root.layout.width ?? 0}x${page.root.layout.height ?? 0}`,
      mode: page.root.layout.mode,
    };
    const back = reimported.pages[0];
    const pageAfter = {
      viewport: `${back.viewport.width}x${back.viewport.height}`,
      root: `${back.root.layout.width ?? 0}x${back.root.layout.height ?? 0}`,
      mode: back.root.layout.mode,
    };
    const pageDiff =
      pageBefore.viewport !== pageAfter.viewport || pageBefore.root !== pageAfter.root || pageBefore.mode !== pageAfter.mode
        ? `页面: ${JSON.stringify(pageBefore)} ≠ ${JSON.stringify(pageAfter)}`
        : null;
    // 子节点树逐字段比
    const before = page.root.children.map((n) => roundDeep(normalize(n), 4));
    const after = back.root.children.map((n) => roundDeep(normalize(n), 4));
    const diff = pageDiff ?? deepEqual(before, after, 'children');
    const ok = diff === null;
    const known = KNOWN_LOSS.get(page.name);
    structureOk = structureOk && (ok || Boolean(known));
    roundTripRows.push({ page: page.name, ok, knownLoss: known ?? null, nodes: exported.stats.nodes, bytes: exported.bytes.length, diff });
  }
  const rtOk = roundTripRows.filter((r) => r.ok).length;
  const rtLoss = roundTripRows.length - rtOk;
  console.log(
    `\n往返关  ${structureOk ? 'PASS' : 'FAIL'}  ${rtOk}/${roundTripRows.length} 页结构无损` +
      (rtLoss > 0 ? ` · ${rtLoss} 页有损` : ''),
  );
  for (const r of roundTripRows.filter((r) => !r.ok)) {
    console.log(`        ${r.knownLoss ? '⚠' : '✗'} ${r.page}: ${r.knownLoss ? `${r.knownLoss} → ` : ''}${r.diff}`);
  }

  /* ---------- 3. 像素关（往返后 CSS 是否同构） ---------- */
  let cssOk = true;
  const cssRows: { page: string; same: boolean; knownLoss: string | null }[] = [];
  for (const page of pages) {
    const exported = await exportFig([page], codec.encode, { fileName: page.name, exportedAt: '2026-01-01T00:00:00.000Z' });
    const reimported = importFig(exported.bytes, decode);
    const before = scssFromPage(compilePage(page));
    const after = scssFromPage(compilePage(reimported.pages[0] as UIPage));
    const same = normalizeCss(before) === normalizeCss(after);
    const known = KNOWN_LOSS.get(page.name) ?? null;
    cssOk = cssOk && (same || Boolean(known));
    cssRows.push({ page: page.name, same, knownLoss: known });
  }
  const cssSame = cssRows.filter((r) => r.same).length;
  const cssLoss = cssRows.length - cssSame;
  console.log(
    `\nCSS 关  ${cssOk ? 'PASS' : 'FAIL'}  ${cssSame}/${cssRows.length} 页样式一致` + (cssLoss > 0 ? ` · ${cssLoss} 页有损` : ''),
  );
  for (const r of cssRows.filter((r) => !r.same)) {
    console.log(`        ${r.knownLoss ? '⚠' : '✗'} ${r.page}: ${r.knownLoss ?? '样式不一致'}`);
  }

  /* ---------- 4. 组件实例关（FR-25 / FR-27 / FR-39） ---------- */
  /**
   * 这一关补的是一个**已经存在很久的假绿**：
   * `fig-normalize` 里没有 `componentId` / `instanceOverrides`，19 页 demo 也没有组件实例，
   * 于是「另存为 `.fig` 再打开，组件实例变普通节点、组件表/样式表/流程全部清空」
   * 这件事在三关里一直是绿的。
   *
   * 现在导出侧把它们写进 `meta.json` 的 `ui_compiler_extras`（节点级 + 项目级），
   * 导入侧读回，本关逐项断言。
   */
  const componentRows: { item: string; ok: boolean; detail?: string }[] = [];
  let componentOk = true;
  {
    const page = createPage('组件实例页', 375, 812);
    const inst = createNode('FRAME') as ContainerNode;
    inst.name = '实例卡';
    Object.assign(inst.layout, { width: 200, height: 100, widthMode: 'FIXED' as const, heightMode: 'FIXED' as const });
    inst.componentId = 'comp-card';
    inst.instanceOverrides = [{ path: '0', value: { text: '覆盖后的标题' } }];
    const title = createNode('TEXT') as UINode;
    title.name = '标题';
    (title as { text: string }).text = '原始标题';
    inst.children = [title];
    page.root.children = [inst];

    const compRoot = createNode('FRAME') as ContainerNode;
    compRoot.name = 'Card';
    Object.assign(compRoot.layout, { width: 200, height: 100, widthMode: 'FIXED' as const, heightMode: 'FIXED' as const });
    const components: Record<string, ComponentDef> = {
      'comp-card': { id: 'comp-card', name: 'Card', root: compRoot },
    };
    const tokens: StyleToken[] = [{ id: 'tok-primary', name: '主色', kind: 'PAINT', style: { background: '#1677FF' } }];
    const flows: FlowDef[] = [{ id: 'flow-main', name: '主流程', startNodeId: inst.id }];

    const exported = await exportFig([page], codec.encode, {
      fileName: '组件实例页',
      exportedAt: '2026-01-01T00:00:00.000Z',
      components,
      tokens,
      flows,
    });
    const back = importFig(exported.bytes, decode);

    // ① 节点上的实例标记与覆盖
    const nodeDiff = deepEqual(
      roundDeep(normalize(page.root.children[0]), 4),
      roundDeep(normalize(back.pages[0].root.children[0]), 4),
      'instance',
    );
    componentRows.push({ item: '实例标记与覆盖', ok: nodeDiff === null, detail: nodeDiff ?? undefined });
    componentOk = componentOk && nodeDiff === null;

    // ② 项目级三张表
    const projectPairs: [string, unknown, unknown][] = [
      ['组件表', components, back.components],
      ['样式表', tokens, back.tokens],
      ['原型流程', flows, back.flows],
    ];
    for (const [item, before, after] of projectPairs) {
      const d = deepEqual(roundDeep(before, 4), roundDeep(after ?? null, 4), item);
      componentRows.push({ item, ok: d === null, detail: d ?? undefined });
      componentOk = componentOk && d === null;
    }
  }
  console.log(
    `\n组件实例关  ${componentOk ? 'PASS' : 'FAIL'}  ${componentRows.filter((r) => r.ok).length}/${componentRows.length} 项无损`,
  );
  for (const r of componentRows.filter((r) => !r.ok)) console.log(`        ✗ ${r.item}: ${r.detail}`);

  const report = {
    generatedAt: new Date().toISOString(),
    ok: importOk && structureOk && cssOk && componentOk,
    import: { ok: importOk, rows: importRows },
    roundTrip: { ok: structureOk, rows: roundTripRows },
    css: { ok: cssOk, rows: cssRows },
    component: { ok: componentOk, rows: componentRows },
  };
  writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\n${report.ok ? 'PASS' : 'FAIL'}  fig  (4 关) · 报告 → dist/fig/report.json`);
  if (!report.ok) process.exitCode = 1;
}

function countNodes(node: UINode): number {
  let n = 1;
  if ('children' in node) for (const c of node.children) n += countNodes(c);
  return n;
}

void main();
