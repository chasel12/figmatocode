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
import type { UINode, UIPage } from '../src/schema/types';

const ROOT = process.cwd();
const FIXTURES = join(ROOT, 'tests', 'fixtures', 'fig');
const OUT = join(ROOT, 'dist', 'fig');

/**
 * 已报备降级（对应计划 §10.4 偏差清单）。
 *
 * `.fig` 是 Figma 的格式，凡是 Figma 没有对应原语的 AST 能力，往返必然有损。
 * 这里逐页列出「已知且已接受」的降级：命中即计为降级而非失败，但必须打印原因，
 * 且**不允许**悄悄加条目 —— 新增一条就等于新增一项对外承诺的损失。
 */
const KNOWN_LOSS = new Map<string, string>([
  ['18-样片-参数矩阵', 'PROGRESSIVE_BLUR 无 Figma 原语，降级为 LAYER_BLUR'],
]);

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * 规范化：只比「结构与视觉属性」，抹掉三类必然差异。
 *
 * 1. **id / name**：往返后 id 重新分配，名字只影响图层列表，不影响渲染；
 * 2. **叶子节点的布局字段**：IMAGE/TEXT 等叶子在 AST 里可能残留 VERTICAL 之类的默认值，
 *    `.fig` 不写（叶子没有子项），读回来是 ABSOLUTE —— 语义等价；
 * 3. **缺省值**：AST 里 undefined 表示「按默认」，`.fig` 里一律是具体数值（0 / START / 空 padding）。
 */
function normalize(node: UINode): unknown {
  const isContainer = 'children' in node;
  const pad = node.layout.padding ?? [0, 0, 0, 0];
  const rawWm = node.layout.widthMode;
  const rawHm = node.layout.heightMode;
  const layout = {
    // 叶子与容器统一比真实模式：`.fig` 不存「叶子自身的布局模式」，导入侧回落到工厂默认值，
    // 与 AST 的约定一致（TEXT=VERTICAL / BUTTON=HORIZONTAL / 矩形=VERTICAL）
    mode: node.layout.mode,
    // Figma 的 StackSize 没有 FILL（填充由 grow/stretch 表达），归一成 FIXED
    widthMode: rawWm === 'FILL' ? 'FIXED' : rawWm,
    heightMode: rawHm === 'FILL' ? 'FIXED' : rawHm,
    // HUG / FILL 的尺寸由布局决定；TEXT 的尺寸由字体度量决定（`.fig` 里存的是估算值，
    // 真实尺寸要 Figma 自己算）。这两类都不比数值，只比模式 —— 数值由 CSS 关兜底。
    width: rawWm === 'FIXED' && node.type !== 'TEXT' ? (node.layout.width ?? 0) : 0,
    height: rawHm === 'FIXED' && node.type !== 'TEXT' ? (node.layout.height ?? 0) : 0,
    x: node.layout.x ?? 0,
    y: node.layout.y ?? 0,
    padding: pad,
    gap: node.layout.gap ?? 0,
    gapCross: node.layout.gapCross ?? 0,
    align: node.layout.align ?? 'START',
    justify: node.layout.justify ?? 'START',
    clipContent: node.layout.clipContent ?? false,
  };
  // 无 src 的 IMAGE 用 1×1 透明图 + 哨兵 hash 表达，能原样还原成 IMAGE，不再需要降级成 RECTANGLE
  const type = node.type;
  const base = {
    type,
    layout,
    style: normalizeStyle(node.style),
    visible: node.visible ?? true,
    locked: node.locked ?? false,
    ...(node.type === 'TEXT' ? { text: (node as { text: string }).text } : {}),
    ...(node.type === 'IMAGE' && (node as { src?: string }).src ? { hasSrc: true } : {}),
  };
  if (isContainer) {
    const kids = (node as { children: UINode[] }).children.map(normalize);
    // 空 children 与「没有 children」等价（.fig 的矩形读回来是容器，但可能一个子项都没有）
    return kids.length > 0 ? { ...base, children: kids } : base;
  }
  return base;
}

/**
 * 样式规范化：
 * - 颜色小写；
 * - 单层 SOLID `fills` 与 `background` 是同一件事的两种写法（AST 两者都允许），统一成只留 background；
 * - 数值 0 与缺省等价（圆角 0 / 描边宽 0 / 透明度 1 都不该出现在差异里）。
 */
function normalizeStyle(style: UINode['style']): Record<string, unknown> {
  const out = { ...(lowerHex(style ?? {}) as Record<string, unknown>) };
  const fills = out.fills as { type?: string; color?: string }[] | undefined;
  if (Array.isArray(fills)) {
    if (fills.length === 1 && fills[0].type === 'SOLID' && (fills[0].color ?? '').toLowerCase() === String(out.background ?? '').toLowerCase()) {
      delete out.fills;
    }
  }
  if (out.borderRadius === 0) delete out.borderRadius;
  if (out.opacity === 1) delete out.opacity;
  const border = out.border as { width?: number; style?: string; align?: string; dash?: number[] } | undefined;
  if (border && border.width === 0) {
    delete out.border;
  } else if (border) {
    // 实线 / INSIDE（AST 缺省对齐）/ 默认 dash 在两边都不写出来，比对前抹掉
    if (border.style === 'solid') delete border.style;
    if (border.align === 'INSIDE') delete border.align;
    if (Array.isArray(border.dash) && border.dash[0] === 4 && border.dash[1] === 4) delete border.dash;
  }
  return out;
}

/** 颜色统一小写（AST 里 "#FFFFFF" 与 "#ffffff" 是同一个颜色） */
function lowerHex<T>(value: T): T {
  if (typeof value === 'string') return (value.startsWith('#') ? value.toLowerCase() : value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => lowerHex(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = lowerHex(v);
    return out as unknown as T;
  }
  return value;
}

/**
 * 数值统一保留 4 位小数。
 *
 * `.fig` 的数值字段是 **float32**（kiwi 编码决定），0.42 读回来是 0.41999998688697815；
 * 这不是信息丢失，只是精度表示不同，比对前必须归一。
 */
function roundDeep<T>(value: T, digits: number): T {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return value;
    return Number(value.toFixed(digits)) as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => roundDeep(v, digits)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = roundDeep(v, digits);
    return out as unknown as T;
  }
  return value;
}

function deepEqual(a: unknown, b: unknown, path = ''): string | null {
  if (a === b) return null;
  if (typeof a !== typeof b) return `${path}: 类型不同 ${typeof a} vs ${typeof b}`;
  if (a === null || b === null || typeof a !== 'object') return `${path}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: 数组/对象不匹配`;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path}: 长度 ${a.length} ≠ ${b.length}`;
    for (let i = 0; i < a.length; i += 1) {
      const diff = deepEqual(a[i], b[i], `${path}[${i}]`);
      if (diff) return diff;
    }
    return null;
  }
  const ka = Object.keys(a as Record<string, unknown>);
  const kb = Object.keys(b as Record<string, unknown>);
  for (const k of new Set([...ka, ...kb])) {
    const va = (a as Record<string, unknown>)[k];
    const vb = (b as Record<string, unknown>)[k];
    if (va === undefined && vb === undefined) continue;
    const diff = deepEqual(va, vb, `${path}.${k}`);
    if (diff) return diff;
  }
  return null;
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
    // 只比子节点：`.fig` 的 CANVAS 没有「页面背景/页面尺寸」概念，
    // 页面根容器不在 .fig 里表达（Figma 的页面底色属于文档设置，不属于画布节点）
    const before = page.root.children.map((n) => roundDeep(normalize(n), 4));
    const after = reimported.pages[0].root.children.map((n) => roundDeep(normalize(n), 4));
    const diff = deepEqual(before, after, 'children');
    const ok = diff === null;
    const known = KNOWN_LOSS.get(page.name);
    structureOk = structureOk && (ok || Boolean(known));
    roundTripRows.push({ page: page.name, ok, knownLoss: known ?? null, nodes: exported.stats.nodes, bytes: exported.bytes.length, diff });
  }
  const rtOk = roundTripRows.filter((r) => r.ok).length;
  const rtLoss = roundTripRows.length - rtOk;
  console.log(
    `\n往返关  ${structureOk ? 'PASS' : 'FAIL'}  ${rtOk}/${roundTripRows.length} 页结构无损` +
      (rtLoss > 0 ? ` · ${rtLoss} 页已报备降级` : ''),
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
    `\nCSS 关  ${cssOk ? 'PASS' : 'FAIL'}  ${cssSame}/${cssRows.length} 页样式一致` + (cssLoss > 0 ? ` · ${cssLoss} 页已报备降级` : ''),
  );
  for (const r of cssRows.filter((r) => !r.same)) {
    console.log(`        ${r.knownLoss ? '⚠' : '✗'} ${r.page}: ${r.knownLoss ?? '样式不一致'}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    ok: importOk && structureOk && cssOk,
    import: { ok: importOk, rows: importRows },
    roundTrip: { ok: structureOk, rows: roundTripRows },
    css: { ok: cssOk, rows: cssRows },
  };
  writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\n${report.ok ? 'PASS' : 'FAIL'}  fig  (3 关) · 报告 → dist/fig/report.json`);
  if (!report.ok) process.exitCode = 1;
}

/**
 * CSS 比较口径：只比**声明体集合**，不比选择器。
 * 理由：类名由节点 id 生成，往返后 id 重新分配（fig-N），选择器必然不同；
 * 但「每个盒子长什么样」应当逐条一致。
 * 页面根容器那条规则剔除——`.fig` 不承载页面底色（见上）。
 */
function normalizeCss(css: string): string {
  const bodies = css.match(/\{[^}]*\}/g) ?? [];
  // 颜色大小写不影响渲染（AST 里 "#1677FF" 与 "#1677ff" 同色），比对前统一小写；
  // border-radius:0 与「不写圆角」等价（`.fig` 里圆角缺省就是 0，无法区分「显式 0」）
  const cleaned = bodies.map((b) =>
    b
      .replace(/\s+/g, '')
      .replace(/#[0-9a-fA-F]{3,8}/g, (m) => m.toLowerCase())
      .replace(/border-radius:0(px)?;?/g, '')
      // 0 带不带单位在 CSS 里等价（编译器对「无 x/y」与「x/y=0」会出两种写法）
      .replace(/0px(?=;|\}|$)/g, '0'),
  );
  if (cleaned.length > 0) cleaned.shift();
  return cleaned.sort().join('|');
}

function countNodes(node: UINode): number {
  let n = 1;
  if ('children' in node) for (const c of node.children) n += countNodes(c);
  return n;
}

void main();
