/**
 * M7 · few-shot 语料抽取（W2）
 *
 * 把 19 个 demo 页（`src/demo/pages.ts`）归一化成 AI 契约子集，作为提示词的稳定前缀语料。
 * 归一化不是"随便裁剪"，而是三条明确规则（plan §0 自研领地：库→token 的映射规则）：
 *
 *  1. **只保留契约能表达的东西**：SECTION/SLICE/STAR/POLYGON/渐变填充/原型交互/组件引用全部丢弃；
 *  2. **颜色映射到风格包令牌**：按 RGB 距离就近映射到三包共有的语义令牌名（@color.xxx），
 *     让样例 100% 符合"只用包内令牌"的硬规则，同时不因换包而失效；
 *  3. **id 全部剥离**：样例只示范结构与尺度，不让模型学会引用不存在的 id。
 *  4. **布局/样式一律写成 `className`**（2026-10-26 新增）：实测只改契约文字、样例仍是手写
 *     `layout` 时，模型输出 className 使用率是 **0%**——它照抄样例，不读说明。所以样例必须
 *     本身就用 className 写。反向映射（`layoutToClassName`）表达不了的字段（lineHeight、
 *     effects、ABSOLUTE 的 x/y…）才保留为显式 `layout` / `style`，保证样例与产物逐字段等价。
 *
 * 用法：npx vite-node scripts/extract-fewshots.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allDemoPages } from '../src/demo/pages';
import { layoutToClassName, parseClassNames } from '../src/editor/ai/tailwind';
import type { LayoutSchema, StyleSchema } from '../src/schema/types';
import type { ContainerNode, UINode, UIPage } from '../src/schema/types';
import { isContainer } from '../src/schema/types';
import { PACKS } from '../src/tokens/packs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 三包共有的语义令牌（换包不失效） */
const SHARED_TOKENS = (() => {
  const [first, ...rest] = PACKS;
  return Object.keys(first.colors).filter((k) => rest.every((p) => p.colors[k]));
})();

/**
 * 映射候选：从共有令牌里剔掉"语义重复项"（card-foreground ≈ foreground 等），
 * 否则纯色距映射会产出 secondary-foreground 这类噪音令牌，反而教坏模型。
 */
const MAPPING_TOKENS = SHARED_TOKENS.filter(
  (k) => !['card-foreground', 'popover-foreground', 'accent-foreground', 'input', 'ring'].includes(k),
);

type RGB = [number, number, number];
const toRgb = (hex: string): RGB | null => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** 各包取首包的颜色做参照（令牌名跨包一致，值近似） */
const TOKEN_RGB: { name: string; rgb: RGB }[] = MAPPING_TOKENS.map((name) => ({
  name,
  rgb: toRgb(PACKS[0].colors[name])!,
})).filter((t) => t.rgb);

/** 就近映射：加权 RGB 距离（人眼对绿最敏感，权重按 Rec.601 近似） */
function nearestToken(color: string | undefined): string | undefined {
  if (!color) return undefined;
  const rgb = toRgb(color);
  if (!rgb) return undefined;
  let best = TOKEN_RGB[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const t of TOKEN_RGB) {
    const dr = rgb[0] - t.rgb[0];
    const dg = rgb[1] - t.rgb[1];
    const db = rgb[2] - t.rgb[2];
    const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return `@color.${best.name}`;
}

const AI_KINDS = new Set(['FRAME', 'TEXT', 'BUTTON', 'RECTANGLE', 'IMAGE', 'OVAL', 'LINE', 'VECTOR']);

/** Figma 自动生成的默认名，无信息量 */
const DEFAULT_NAME = /^(Text|Frame|Rectangle|Oval|Button|Image|Line|Vector) \d+$/;

interface AiNodeOut {
  kind: string;
  name?: string;
  text?: string;
  className?: string;
  layout?: Record<string, unknown>;
  style?: Record<string, unknown>;
  children?: AiNodeOut[];
}

function styleOf(node: UINode): Record<string, unknown> | undefined {
  const s = node.style;
  if (!s) return undefined;
  const out: Record<string, unknown> = {};
  const bg = s.background ?? (s.fills?.length === 1 && s.fills[0].type === 'SOLID' ? s.fills[0].color : undefined);
  const bgToken = nearestToken(bg);
  if (bgToken) out.background = bgToken;
  const fgToken = nearestToken(s.color);
  if (fgToken) out.color = fgToken;
  if (typeof s.borderRadius === 'number' && s.borderRadius > 0) out.borderRadius = s.borderRadius;
  if (s.border && s.border.width > 0) {
    out.border = { width: s.border.width, color: nearestToken(s.border.color) ?? '@color.border', style: s.border.style ?? 'solid' };
  }
  if (s.fontSize != null) out.fontSize = s.fontSize;
  if (s.fontWeight != null) out.fontWeight = s.fontWeight;
  // 行高只在合理区间内保留（demo 里有 fontSize 26 继承 22 行高的历史数据，照抄会教坏模型）
  if (s.lineHeight != null && s.fontSize != null && s.lineHeight >= s.fontSize * 1.05 && s.lineHeight <= s.fontSize * 2.2) {
    out.lineHeight = s.lineHeight;
  }
  if (s.letterSpacing) out.letterSpacing = s.letterSpacing;
  if (s.textAlign && s.textAlign !== 'left') out.textAlign = s.textAlign;
  if (s.opacity != null && s.opacity < 1) out.opacity = s.opacity;
  const shadow = s.effects?.find((e) => e.kind === 'DROP_SHADOW');
  if (shadow) {
    out.effects = [
      {
        kind: 'DROP_SHADOW',
        x: shadow.x ?? 0,
        y: shadow.y ?? 0,
        blur: shadow.blur ?? 0,
        spread: shadow.spread ?? 0,
        color: nearestToken(shadow.color) ?? '@color.border',
      },
    ];
  }
  return Object.keys(out).length ? out : undefined;
}

function layoutOf(node: UINode, parentMode?: LayoutSchema['mode']): Partial<LayoutSchema> {
  const l = node.layout;
  const out: Partial<LayoutSchema> = {
    mode: l.mode,
    widthMode: l.widthMode,
    heightMode: l.heightMode,
  };
  // width/height 只在 FIXED 下有意义；FILL/HUG 时引擎会忽略它，
  // 写出来会和 `w-full` 自相矛盾（实测旧语料里就有 `w-full` + `width:120` 并存）
  if (l.width != null && l.widthMode !== 'FILL' && l.widthMode !== 'HUG') out.width = Math.round(l.width);
  if (l.height != null && l.heightMode !== 'FILL' && l.heightMode !== 'HUG') out.height = Math.round(l.height);
  if (l.padding && l.padding.some((p) => p > 0)) out.padding = l.padding;
  if (l.gap) out.gap = l.gap;
  if (l.align && l.align !== 'START') out.align = l.align;
  if (l.justify && l.justify !== 'START') out.justify = l.justify;
  /**
   * x/y 是否有效取决于**父级**是否 ABSOLUTE（`layout.ts` 只在 ABSOLUTE 父级里按 x/y 摆放），
   * 与自身 mode 无关。按自身 mode 判断会丢掉「流式子项 + ABSOLUTE 父级」的坐标——
   * 这正是海报页 5 个子项坐标全丢、样例退化成「ABSOLUTE 却没有坐标」的原因。
   */
  if (l.mode === 'ABSOLUTE' || parentMode === 'ABSOLUTE') {
    if (l.x != null) out.x = Math.round(l.x);
    if (l.y != null) out.y = Math.round(l.y);
  }
  // 未定义的键不留空壳，否则 JSON 里会漏出 undefined 键
  for (const k of Object.keys(out) as (keyof LayoutSchema)[]) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

/** 这几种节点的 widthMode/heightMode 缺省就是 HUG（见 `factory.defaultLayout`） */
const HUG_BY_DEFAULT = new Set(['TEXT', 'FRAME', 'BUTTON']);

/**
 * 教学用最小化：把**对产物无影响**的字段剔掉。
 *
 * 样例会被模型当模板抄，所以不能出现噪声字段——`h-auto` 挂在每个 TEXT 上、
 * 叶子节点带 `gap`、`font-normal` 挂在每个正文上，模型都会照抄。剔掉不改变产物
 * （缺省值与显式值等价），只让样例更像人写的 Tailwind。
 */
function minimize(layout: Partial<LayoutSchema>, hasChildren: boolean, kind: string): Partial<LayoutSchema> {
  const out: Partial<LayoutSchema> = { ...layout };
  if (!hasChildren) {
    // 没有子项时方向/对齐/间距全部无效
    delete out.mode;
    delete out.align;
    delete out.justify;
    delete out.gap;
  }
  // FIXED 却没给尺寸值时，引擎实际按 HUG 算（`childSize` 的 else 分支）→ 归一成 HUG，
  // 否则样例里会出现 `"widthMode":"FIXED"` 这种 class 表达不了、也没信息量的残渣
  if (out.widthMode === 'FIXED' && out.width == null) out.widthMode = 'HUG';
  if (out.heightMode === 'FIXED' && out.height == null) out.heightMode = 'HUG';
  if (HUG_BY_DEFAULT.has(kind)) {
    if (out.widthMode === 'HUG') delete out.widthMode;
    if (out.heightMode === 'HUG') delete out.heightMode;
  }
  return out;
}

/** style 侧的同类最小化：400 就是 CSS 缺省字重，写 `font-normal` 等于没说 */
function minimizeStyle(style: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...style };
  if (out.fontWeight === 400) delete out.fontWeight;
  return out;
}

/** target 里有、但反向映射没还原出来的字段 → 必须原样保留（样例与产物逐字段等价） */
function residual(target: Record<string, unknown>, back: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(target)) {
    if (v === undefined) continue;
    if (JSON.stringify(v) !== JSON.stringify(back[k])) out[k] = v;
  }
  return out;
}

/** layout + style → { className, 残余 layout, 残余 style }：能写进 class 的都写进 class */
function toSpecFields(
  layout: Partial<LayoutSchema>,
  style: Record<string, unknown>,
): { className?: string; layout?: Record<string, unknown>; style?: Record<string, unknown> } {
  const className = layoutToClassName(layout, style as Partial<StyleSchema>);
  const back = parseClassNames(className);
  const restLayout = residual(layout as Record<string, unknown>, back.layout as Record<string, unknown>);
  const restStyle = residual(style, back.style as Record<string, unknown>);
  const out: { className?: string; layout?: Record<string, unknown>; style?: Record<string, unknown> } = {};
  if (className) out.className = className;
  if (Object.keys(restLayout).length) out.layout = restLayout;
  if (Object.keys(restStyle).length) out.style = restStyle;
  return out;
}

function convert(node: UINode, parentMode?: LayoutSchema['mode']): AiNodeOut | null {
  if (!AI_KINDS.has(node.type)) return null;
  const out: AiNodeOut = { kind: node.type };
  if (node.name && !DEFAULT_NAME.test(node.name)) out.name = node.name;
  if ((node.type === 'TEXT' || node.type === 'BUTTON') && 'text' in node && node.text) out.text = node.text;
  if (node.type === 'IMAGE') out.src = '';
  if (node.type === 'VECTOR') {
    // 矢量必须带路径，否则契约语义检查会拒（VECTOR 必须给 icon 或 vectorD）
    const d = node.vector?.d;
    if (!d) return null;
    out.vectorD = d;
  }

  // 先算子项：minimize 需要知道「有没有子项」，子项坐标需要知道父级 mode
  const kids =
    isContainer(node) && node.type !== 'RECTANGLE'
      ? (node as ContainerNode).children
          .map((c) => convert(c, node.layout.mode))
          .filter((n): n is AiNodeOut => !!n)
      : [];

  const fields = toSpecFields(
    minimize(layoutOf(node, parentMode), kids.length > 0, node.type),
    minimizeStyle(styleOf(node) ?? {}),
  );
  if (fields.className) out.className = fields.className;
  if (fields.layout) out.layout = fields.layout;
  if (fields.style) out.style = fields.style;
  if (kids.length) out.children = kids;
  return out;
}

function pageToSpec(page: UIPage): AiNodeOut {
  // 注意：PAGE 不在 AI_KINDS 里（模型不生成 PAGE），故直接取 root 的子项，
  // 用 root 的布局/样式拼出"页面内容根"——这正是契约里 AiPageDraft.root 的语义。
  const rootMode = page.root.layout.mode;
  const kids = (page.root as ContainerNode).children
    .map((c) => convert(c, rootMode))
    .filter((n): n is AiNodeOut => !!n);
  const rl = page.root.layout;
  // 页面内容根在契约里恒为「宽铺满」，高度由视口接管（`draftToPage` 强制 FIXED）
  const rootLayout: Partial<LayoutSchema> = { mode: rootMode, widthMode: 'FILL' };
  if (rl.padding && rl.padding.some((p) => p > 0)) rootLayout.padding = rl.padding;
  if (rl.gap) rootLayout.gap = rl.gap;
  if (rl.align && rl.align !== 'START') rootLayout.align = rl.align;
  if (rl.justify && rl.justify !== 'START') rootLayout.justify = rl.justify;

  const rootFields = toSpecFields(rootLayout, {});
  const root: AiNodeOut = { kind: 'FRAME', name: '页面内容' };
  if (rootFields.className) root.className = rootFields.className;
  if (rootFields.layout) root.layout = rootFields.layout;
  if (kids.length) root.children = kids;

  return {
    kind: 'page',
    name: page.name,
    width: page.viewport.width,
    height: page.viewport.height,
    // 页面底色固定用 background 令牌（语义正确，且暗色包自动变暗底）
    background: '@color.background',
    root,
  };
}

/** 页面名 → 检索标签（中文分词太重，用页面名 + 关键词表） */
const TAG_RULES: { tag: string; words: string[] }[] = [
  { tag: '登录', words: ['登录'] },
  { tag: '注册', words: ['注册'] },
  { tag: '商品', words: ['商品', '详情', '列表'] },
  { tag: '订单', words: ['订单'] },
  { tag: '个人中心', words: ['个人'] },
  { tag: '设置', words: ['设置'] },
  { tag: '仪表盘', words: ['dashboard', '仪表'] },
  { tag: '表单', words: ['表单'] },
  { tag: '卡片', words: ['card', '卡片'] },
  { tag: '标签页', words: ['tab'] },
  { tag: '海报', words: ['海报', '绝对定位'] },
  { tag: '长文本', words: ['长文本'] },
  { tag: '图片', words: ['图片'] },
  { tag: '嵌套', words: ['嵌套'] },
  { tag: '样片', words: ['样片'] },
];

const pages = allDemoPages();
const entries = pages.map((page, i) => {
  const tags = TAG_RULES.filter((r) => r.words.some((w) => page.name.toLowerCase().includes(w.toLowerCase()))).map((r) => r.tag);
  const spec = pageToSpec(page);
  return {
    id: String(i + 1).padStart(2, '0') + '-' + page.name.replace(/^\d+\s*/, ''),
    tags: tags.length ? tags : [page.name],
    spec: JSON.stringify(spec),
  };
});

const outFile = path.join(root, 'src/editor/ai/fewshots.json');
fs.writeFileSync(outFile, `${JSON.stringify(entries, null, 0)}\n`, 'utf8');

const totalKB = (fs.statSync(outFile).size / 1024).toFixed(1);
const sizes = entries.map((e) => e.spec.length);
console.log(`✓ few-shot ${entries.length} 条 → ${path.relative(root, outFile)}（${totalKB} KB）`);
console.log(`  spec 长度：min ${Math.min(...sizes)} / max ${Math.max(...sizes)} / avg ${Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length)} 字符`);
console.log(`  共有令牌 ${SHARED_TOKENS.length} 个：${SHARED_TOKENS.join(' ')}`);

/**
 * 自检：样例里 className 的覆盖率必须接近 100%。
 * 这是本次改动的**唯一目的**——模型照抄样例，样例不用 className，模型就不会用。
 */
let nodes = 0;
let withClass = 0;
let withLayout = 0;
const walk = (n: AiNodeOut): void => {
  nodes += 1;
  if (n.className) withClass += 1;
  if (n.layout) withLayout += 1;
  n.children?.forEach(walk);
};
entries.forEach((e) => walk(JSON.parse(e.spec).root as AiNodeOut));
const pct = ((withClass / nodes) * 100).toFixed(1);
console.log(`  节点 ${nodes} 个：带 className ${withClass}（${pct}%）/ 仍需显式 layout ${withLayout} 个`);
if (withClass / nodes < 0.9) {
  console.error(`✗ className 覆盖率过低（${pct}%）：样例是模型的模板，覆盖不够就等于没改`);
  process.exitCode = 1;
}
