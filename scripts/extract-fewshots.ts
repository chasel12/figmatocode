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
 *
 * 用法：npx vite-node scripts/extract-fewshots.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allDemoPages } from '../src/demo/pages';
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

interface AiNodeOut {
  kind: string;
  name?: string;
  text?: string;
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

function layoutOf(node: UINode): Record<string, unknown> | undefined {
  const l = node.layout;
  const out: Record<string, unknown> = {
    mode: l.mode,
    widthMode: l.widthMode,
    heightMode: l.heightMode,
  };
  if (l.width != null) out.width = Math.round(l.width);
  if (l.height != null) out.height = Math.round(l.height);
  if (l.padding && l.padding.some((p) => p > 0)) out.padding = l.padding;
  if (l.gap) out.gap = l.gap;
  if (l.align && l.align !== 'START') out.align = l.align;
  if (l.justify && l.justify !== 'START') out.justify = l.justify;
  if (l.mode === 'ABSOLUTE') {
    if (l.x != null) out.x = Math.round(l.x);
    if (l.y != null) out.y = Math.round(l.y);
  }
  return out;
}

function convert(node: UINode): AiNodeOut | null {
  if (!AI_KINDS.has(node.type)) return null;
  const out: AiNodeOut = { kind: node.type };
  if (node.name && !/^(Text|Frame|Rectangle|Oval|Button|Image|Line|Vector) \d+$/.test(node.name)) out.name = node.name;
  if ((node.type === 'TEXT' || node.type === 'BUTTON') && 'text' in node && node.text) out.text = node.text;
  if (node.type === 'IMAGE') out.src = '';
  if (node.type === 'VECTOR') {
    // 矢量必须带路径，否则契约语义检查会拒（VECTOR 必须给 icon 或 vectorD）
    const d = node.vector?.d;
    if (!d) return null;
    out.vectorD = d;
  }
  const layout = layoutOf(node);
  if (layout) out.layout = layout;
  const style = styleOf(node);
  if (style) out.style = style;
  if (isContainer(node) && node.type !== 'RECTANGLE') {
    const kids = (node as ContainerNode).children.map(convert).filter((n): n is AiNodeOut => !!n);
    if (kids.length) out.children = kids;
  }
  return out;
}

function pageToSpec(page: UIPage): AiNodeOut {
  // 注意：PAGE 不在 AI_KINDS 里（模型不生成 PAGE），故直接取 root 的子项，
  // 用 root 的布局/样式拼出"页面内容根"——这正是契约里 AiPageDraft.root 的语义。
  const kids = (page.root as ContainerNode).children.map(convert).filter((n): n is AiNodeOut => !!n);
  const rootLayout = layoutOf(page.root);
  // 页面内容根在契约里恒为「宽铺满、高包裹」，与 demo 的 FIXED 视口口径不同，需归一
  delete rootLayout?.width;
  delete rootLayout?.height;
  if (rootLayout) {
    rootLayout.widthMode = 'FILL';
    rootLayout.heightMode = 'HUG';
  }
  return {
    kind: 'page',
    name: page.name,
    width: page.viewport.width,
    height: page.viewport.height,
    // 页面底色固定用 background 令牌（语义正确，且暗色包自动变暗底）
    background: '@color.background',
    root: { kind: 'FRAME', name: '页面内容', layout: rootLayout, children: kids },
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
