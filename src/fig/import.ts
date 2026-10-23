/**
 * FR-76 `.fig` 导入 —— Figma 文件 → AST 页面。
 *
 * 分层（计划 §3 的口径：先视觉层）：
 *   ✅ 矩形 / 圆角矩形 / 椭圆 / 文本 / 图片填充 / Frame / auto layout / 填充·描边·效果·圆角·透明度
 *   ✅ 页面（Figma CANVAS → UIPage）、兄弟顺序（parentIndex.position 字典序）
 *   ⏭ 组件实例展开为普通 Frame（保留名字 + `figSymbol` 备注）、矢量几何（命令 blob 需额外解码器）
 *   ⏭ Variables / Prototype / 样式 token
 *
 * 坐标系：Figma 的 `transform.m02/m12` 是**页面绝对坐标**，AST 的 `layout.x/y` 是**父内相对坐标**。
 * 自动布局容器的子项按 stack 规则排列，不写 x/y（写了也会被布局覆盖）。
 */
import { unzipSync } from 'fflate';
import type { ButtonNode, ContainerNode, ImageNode, LayoutMode, LayoutSchema, NodeKind, StyleSchema, UINode, UIPage } from '../schema/types';
import { createNode, createPage, resetIdSeq } from '../schema/factory';
import { BUTTON_LABEL, DEFAULT_FONT_FAMILY, PLACEHOLDER_IMAGE_HASH } from './export';
import {
  effectsToStyle,
  figColorToCss,
  fillsToStyle,
  strokesToStyle,
  type FigEffect,
  type FigMatrix,
  type FigPaint,
} from './paint';

/** `.fig` 里 canvas.fig 之外还需要的条目（缩略图/元信息当前不用，保留类型以便扩展） */
export interface FigArchive {
  canvas: Uint8Array;
  meta?: Record<string, unknown>;
  images: Record<string, Uint8Array>;
}

/** 只声明用到的字段；其余原样保留在 raw 上便于排查 */
export interface FigNode {
  guid?: { sessionID?: number; localID?: number };
  phase?: string;
  parentIndex?: { guid?: { sessionID?: number; localID?: number }; position?: string };
  type?: string;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  blendMode?: string;
  size?: { x?: number; y?: number };
  transform?: FigMatrix;
  cornerRadius?: number;
  rectangleTopLeftCornerRadius?: number;
  rectangleTopRightCornerRadius?: number;
  rectangleBottomLeftCornerRadius?: number;
  rectangleBottomRightCornerRadius?: number;
  fillPaints?: FigPaint[];
  strokePaints?: FigPaint[];
  strokeWeight?: number;
  strokeAlign?: string;
  strokeJoin?: string;
  strokeCap?: string;
  dashPattern?: number[];
  effects?: FigEffect[];
  clipsContent?: boolean;
  stackMode?: string;
  stackSpacing?: number;
  stackCounterSpacing?: number;
  stackPadding?: number;
  stackVerticalPadding?: number;
  stackHorizontalPadding?: number;
  stackPaddingRight?: number;
  stackPaddingBottom?: number;
  stackPrimaryAlignItems?: string;
  stackCounterAlignItems?: string;
  stackPrimarySizing?: string;
  stackCounterSizing?: string;
  stackWrap?: string;
  stackChildPrimaryGrow?: number;
  stackChildAlignSelf?: string;
  minSize?: { value?: { x?: number; y?: number } };
  maxSize?: { value?: { x?: number; y?: number } };
  fontSize?: number;
  fontName?: { family?: string; style?: string };
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  textAutoResize?: string;
  lineHeight?: { value?: number; units?: string };
  letterSpacing?: { value?: number; units?: string };
  textCase?: string;
  textDecoration?: string;
  textData?: { characters?: string };
  count?: number;
  starInnerScale?: number;
  arcData?: { startingAngle?: number; endingAngle?: number; innerRadius?: number };
  [k: string]: unknown;
}

export interface FigImportStats {
  /** canvas.fig 解出的原始节点数 */
  rawNodes: number;
  /** 落进 AST 的节点数 */
  imported: number;
  pages: number;
  byType: Record<string, number>;
}

export interface FigImportResult {
  pages: UIPage[];
  stats: FigImportStats;
  warnings: string[];
  /** 页面级缩略图（meta.json 里的 render_coordinates，供画布初值参考） */
  meta?: Record<string, unknown>;
}

const SUPPORTED_CONTAINERS = new Set(['FRAME', 'SYMBOL', 'INSTANCE', 'GROUP', 'SECTION']);

const SIMPLE_KIND: Record<string, NodeKind> = {
  RECTANGLE: 'RECTANGLE',
  ROUNDED_RECTANGLE: 'RECTANGLE',
  ELLIPSE: 'OVAL',
  LINE: 'LINE',
  REGULAR_POLYGON: 'POLYGON',
  STAR: 'STAR',
  TEXT: 'TEXT',
  SLICE: 'SLICE',
  VECTOR: 'VECTOR',
  BOOLEAN_OPERATION: 'VECTOR',
  LINE_VECTOR: 'VECTOR',
};

/** Figma 字体 style 名 → 字重（AST 用数字） */
const FONT_WEIGHTS: Record<string, number> = {
  thin: 100,
  extralight: 200,
  'ultra light': 200,
  light: 300,
  regular: 400,
  normal: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  'semi bold': 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  'extra bold': 800,
  black: 900,
  heavy: 900,
};

function fontWeightOf(style: string | undefined): number {
  if (!style) return 400;
  const key = style.toLowerCase().replace(/[_-]/g, ' ').trim();
  if (FONT_WEIGHTS[key] !== undefined) return FONT_WEIGHTS[key];
  // 形如 "Bold Italic"：取第一个命中的词
  for (const word of key.split(/\s+/)) {
    if (FONT_WEIGHTS[word] !== undefined) return FONT_WEIGHTS[word];
  }
  return 400;
}

const guidKey = (g: { sessionID?: number; localID?: number } | undefined): string =>
  g && typeof g.sessionID === 'number' && typeof g.localID === 'number' ? `${g.sessionID}:${g.localID}` : '';

/** 解 `.fig` 归档（zip → canvas.fig / meta.json / images） */
export function openFigArchive(bytes: Uint8Array): FigArchive {
  const entries = unzipSync(bytes);
  const canvas = entries['canvas.fig'];
  if (!canvas) throw new Error('.fig 缺少 canvas.fig（不是 Figma 导出的文件？）');
  const metaEntry = entries['meta.json'];
  const images: Record<string, Uint8Array> = {};
  for (const [name, data] of Object.entries(entries)) {
    if (name.startsWith('images/') && name.length > 'images/'.length) {
      images[name.slice('images/'.length)] = data;
    }
  }
  return {
    canvas,
    ...(metaEntry ? { meta: JSON.parse(new TextDecoder().decode(metaEntry)) as Record<string, unknown> } : {}),
    images,
  };
}

function bytesToDataUrl(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b = bytes;
  // 按 magic 判断 MIME：SVG 是文本（以 '<' 开头），不能当 png 写，否则浏览器不认
  const head =
    b[0] === 0x89 && b[1] === 0x50
      ? 'image/png'
      : b[0] === 0xff && b[1] === 0xd8
        ? 'image/jpeg'
        : b[0] === 0x47 && b[1] === 0x49
          ? 'image/gif'
          : b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57
            ? 'image/webp'
            : b[0] === 0x3c || (b[0] === 0xef && b[1] === 0xbb)
              ? 'image/svg+xml'
              : 'image/png';
  return `data:${head};base64,${btoa(binary)}`;
}

/**
 * `Image.hash` 归一成字符串键。
 *
 * schema 里它是 `byte[]`（Figma 的 sha1 原始字节），而 zip 里的图片文件名是十六进制串，
 * 所以解码后要转成 hex 才能查 `images/`。
 */
function hashKey(hash: unknown): string | undefined {
  if (typeof hash === 'string') return hash;
  if (hash instanceof Uint8Array) return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
  if (Array.isArray(hash)) return hash.map((b) => Number(b).toString(16).padStart(2, '0')).join('');
  return undefined;
}

/** 图片填充的 hash → 归档里的 images/<hash> → dataURL */
function imageSrcOf(paints: FigPaint[] | undefined, images: Record<string, Uint8Array>): string | undefined {
  for (const p of paints ?? []) {
    if (p.visible === false || p.type !== 'IMAGE') continue;
    const hash = hashKey(p.image?.hash);
    // 空图占位不是真实图片，不能当 src
    if (hash === PLACEHOLDER_IMAGE_HASH) continue;
    if (hash && images[hash]) return bytesToDataUrl(images[hash]);
  }
  return undefined;
}

const SIZING: Record<string, 'FIXED' | 'HUG' | 'FILL'> = {
  FIXED: 'FIXED',
  RESIZE_TO_FIT: 'HUG',
  // 「自动尺寸」= FIXED 但没有数值（AST 里就是不出 width 声明），不是 HUG
  RESIZE_TO_FIT_WITH_IMPLICIT_SIZE: 'FIXED',
  FILL: 'FILL',
};

const ALIGN: Record<string, 'START' | 'CENTER' | 'END' | 'STRETCH' | 'BASELINE'> = {
  MIN: 'START',
  CENTER: 'CENTER',
  MAX: 'END',
  STRETCH: 'STRETCH',
  BASELINE: 'BASELINE',
  AUTO: 'START',
};

const JUSTIFY: Record<string, 'START' | 'CENTER' | 'END' | 'SPACE_BETWEEN'> = {
  MIN: 'START',
  CENTER: 'CENTER',
  MAX: 'END',
  SPACE_BETWEEN: 'SPACE_BETWEEN',
  AUTO: 'START',
};

/** 布局字段：尺寸 / 自动布局 / padding / gap / 裁剪 / 约束 */
function layoutOf(node: FigNode, kind: NodeKind, relative: { x: number; y: number }): LayoutSchema {
  const base = createNode(kind, { id: 'tmp' }).layout;
  const w = node.size?.x ?? 0;
  const h = node.size?.y ?? 0;
  const stack = node.stackMode && node.stackMode !== 'NONE' ? node.stackMode : null;
  // 主轴 = 排列方向：HORIZONTAL 时主轴是宽度，VERTICAL 时主轴是高度
  const vertical = stack === 'VERTICAL';

  const padding: [number, number, number, number] = [
    node.stackVerticalPadding ?? node.stackPadding ?? 0,
    node.stackPaddingRight ?? node.stackHorizontalPadding ?? node.stackPadding ?? 0,
    node.stackPaddingBottom ?? node.stackVerticalPadding ?? node.stackPadding ?? 0,
    node.stackHorizontalPadding ?? node.stackPadding ?? 0,
  ];

  return {
    ...base,
    /**
     * 模式判定：
     * - 容器：Figma 的 stackMode 就是它的布局模式，NONE → ABSOLUTE（绝对定位容器）；
     * - 叶子：Figma 没有「叶子自身布局模式」的概念，不能写 ABSOLUTE —— 编译器把
     *   `child.layout.mode === 'ABSOLUTE'` 当成「这个子项要绝对定位」（见 compile.ts:224），
     *   给叶子写 ABSOLUTE 会让所有文字/矩形突然变成 position:absolute。
     *   所以叶子回落到工厂默认值（TEXT=VERTICAL、BUTTON=HORIZONTAL），与 AST 约定一致。
     */
    mode: (stack === 'HORIZONTAL'
      ? 'HORIZONTAL'
      : stack === 'VERTICAL'
        ? 'VERTICAL'
        : kind === 'FRAME' || kind === 'SECTION' || kind === 'PAGE'
          ? 'ABSOLUTE'
          : base.mode) as LayoutMode,
    widthMode: SIZING[(vertical ? node.stackCounterSizing : node.stackPrimarySizing) ?? ''] ?? 'FIXED',
    heightMode: SIZING[(vertical ? node.stackPrimarySizing : node.stackCounterSizing) ?? ''] ?? 'FIXED',
    // 自动尺寸的轴不落数值（`.fig` 里的尺寸只是缓存，AST 里「不写」才是语义）
    width: (vertical ? node.stackCounterSizing : node.stackPrimarySizing) === 'RESIZE_TO_FIT_WITH_IMPLICIT_SIZE' ? undefined : w,
    height: (vertical ? node.stackPrimarySizing : node.stackCounterSizing) === 'RESIZE_TO_FIT_WITH_IMPLICIT_SIZE' ? undefined : h,
    x: relative.x,
    y: relative.y,
    padding,
    gap: node.stackSpacing ?? 0,
    gapCross: node.stackCounterSpacing,
    align: ALIGN[node.stackCounterAlignItems ?? ''] ?? 'START',
    justify: JUSTIFY[node.stackPrimaryAlignItems ?? ''] ?? 'START',
    // stackChildPrimaryGrow 只作为「主轴 FILL」的标记使用（见 build 包装器），
    // 不再重复写进 flexGrow —— 否则 CSS 会多出一条 flex-grow
    wrap: node.stackWrap === 'WRAP' ? ('WRAP' as const) : undefined,
    minWidth: node.minSize?.value?.x,
    minHeight: node.minSize?.value?.y,
    maxWidth: node.maxSize?.value?.x,
    maxHeight: node.maxSize?.value?.y,
    clipContent: node.clipsContent === true ? true : undefined,
  };
}

function styleOf(node: FigNode): StyleSchema {
  const corner = node.cornerRadius;
  const perCorner =
    node.rectangleTopLeftCornerRadius !== undefined
      ? ([
          node.rectangleTopLeftCornerRadius,
          node.rectangleTopRightCornerRadius ?? node.rectangleTopLeftCornerRadius,
          node.rectangleBottomRightCornerRadius ?? node.rectangleTopLeftCornerRadius,
          node.rectangleBottomLeftCornerRadius ?? node.rectangleTopLeftCornerRadius,
        ] as [number, number, number, number])
      : undefined;

  // TEXT 的 fillPaints 是文字颜色，不是盒子填充；不能落进 fills/background
  const isText = node.type === 'TEXT';
  const style: StyleSchema = {
    ...(isText ? {} : fillsToStyle(node.fillPaints)),
    ...strokesToStyle(node.strokePaints, node.strokeWeight, node.strokeAlign, node.dashPattern, node.strokeJoin, node.strokeCap),
  };
  if (typeof corner === 'number' && corner > 0) style.borderRadius = corner;
  else if (perCorner && perCorner.some((v) => v > 0)) style.borderRadius = perCorner;
  if (typeof node.opacity === 'number' && node.opacity < 1) style.opacity = node.opacity;
  const effects = effectsToStyle(node.effects);
  if (effects.length > 0) style.effects = effects;

  if (node.type === 'TEXT') {
    const textPaint = node.fillPaints?.find((p) => p.visible !== false);
    style.color = textPaint ? figColorToCss(textPaint.color) : '#111111';
    style.fontSize = node.fontSize ?? 16;
    style.fontWeight = fontWeightOf(node.fontName?.style);
    // 导出侧把「未指定字体族」写成 Figma 默认族，读回来要还原成 undefined（否则编译期
    // 会从 `FONT_STACK` 变成 `Inter`，CSS 就不一致了）
    const family = node.fontName?.family;
    if (family && family !== DEFAULT_FONT_FAMILY) style.fontFamily = family;
    const lh = node.lineHeight;
    if (lh && typeof lh.value === 'number') {
      // 只有百分比才写 lineHeightMode；像素是默认值，写出来会多一个「必然差异」
      if (lh.units === 'PERCENT') style.lineHeightMode = 'PERCENT';
      style.lineHeight = lh.value;
    }
    const ls = node.letterSpacing;
    if (ls && typeof ls.value === 'number') {
      style.letterSpacing = ls.value;
      if (ls.units === 'PERCENT') style.letterSpacingMode = 'PERCENT';
    }
    const align = node.textAlignHorizontal;
    if (align === 'CENTER') style.textAlign = 'center';
    else if (align === 'RIGHT') style.textAlign = 'right';
    else if (align === 'JUSTIFIED') style.textAlign = 'justify';
    else style.textAlign = 'left';
    const valign = node.textAlignVertical;
    if (valign === 'CENTER') style.textAlignVertical = 'CENTER';
    else if (valign === 'BOTTOM') style.textAlignVertical = 'BOTTOM';
    if (node.textDecoration === 'UNDERLINE') style.textDecoration = 'UNDERLINE';
    if (node.textDecoration === 'STRIKETHROUGH') style.textDecoration = 'STRIKETHROUGH';
    if (node.textCase === 'UPPER') style.textCase = 'UPPER';
    if (node.textCase === 'LOWER') style.textCase = 'LOWER';
    if (node.textCase === 'TITLE') style.textCase = 'TITLE';
    // textWrap 默认 true，只有「不换行」（WIDTH_AND_HEIGHT）才需要显式写 false
    if (node.textAutoResize === 'WIDTH_AND_HEIGHT') style.textWrap = false;
  }
  return style;
}

/** 文字类样式字段（BUTTON 的文案样式要从 TEXT 子节点上取，不能整包搬） */
const TEXT_STYLE_KEYS = [
  'color',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'lineHeight',
  'lineHeightMode',
  'letterSpacing',
  'letterSpacingMode',
  'textAlign',
  'textAlignVertical',
  'textDecoration',
  'textCase',
  'textWrap',
] as const;

function textStyleOf(style: StyleSchema): Partial<StyleSchema> {
  const out: Record<string, unknown> = {};
  for (const key of TEXT_STYLE_KEYS) {
    const value = (style as Record<string, unknown>)[key];
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<StyleSchema>;
}

function shapeExtras(node: FigNode, kind: NodeKind): Record<string, unknown> {
  if (kind === 'POLYGON' || kind === 'STAR') {
    const out: Record<string, unknown> = { pointCount: node.count ?? (kind === 'STAR' ? 5 : 3) };
    if (kind === 'STAR') out.innerRadius = node.starInnerScale ?? 0.38;
    return out;
  }
  return {};
}

/** 导入选项：`maxNodes` 防止超大文件把画布拖死（默认 5000，超出截断并告警） */
export interface FigImportOptions {
  maxNodes?: number;
  /** 是否把图片填充转成 IMAGE 节点（默认 true） */
  images?: boolean;
}

export interface FigDecoded {
  nodeChanges: FigNode[];
  blobs: Uint8Array[];
}

/**
 * 主入口：`.fig` 字节 → AST 页面。
 *
 * @param bytes `.fig` 文件内容
 * @param decode 注入解码器（`@open-pencil/kiwi` 的 `decodeFigKiwiCanvas`），
 *               以便主包不把 600KB 的 kiwi 运行时打进首屏
 */
export function importFig(
  bytes: Uint8Array,
  decode: (canvas: Uint8Array) => FigDecoded,
  options: FigImportOptions = {},
): FigImportResult {
  const maxNodes = options.maxNodes ?? 5000;
  const withImages = options.images !== false;
  const archive = openFigArchive(bytes);
  const { nodeChanges, blobs } = decode(archive.canvas);

  const warnings: string[] = [];
  const byType: Record<string, number> = {};
  const childrenOf = new Map<string, FigNode[]>();
  const nodeByKey = new Map<string, FigNode>();
  for (const n of nodeChanges) {
    const key = guidKey(n.guid);
    if (!key) continue;
    nodeByKey.set(key, n);
    byType[n.type ?? 'UNKNOWN'] = (byType[n.type ?? 'UNKNOWN'] ?? 0) + 1;
    const parent = guidKey(n.parentIndex?.guid);
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent)!.push(n);
  }
  // 兄弟顺序：parentIndex.position 是 Figma 的 fractional index（base62），码点序即视觉序。
  // 不能用 localeCompare —— ICU 给标点的权重与码点顺序不一致，会把顺序排乱。
  for (const list of childrenOf.values()) {
    list.sort((a, b) => {
      const pa = a.parentIndex?.position ?? '';
      const pb = b.parentIndex?.position ?? '';
      return pa < pb ? -1 : pa > pb ? 1 : 0;
    });
  }

  // 图片 blob：fillPaints.image.dataBlob → blobs[]
  const imageByBlob = new Map<number, string>();
  for (const n of nodeChanges) {
    for (const p of n.fillPaints ?? []) {
      const idx = p.image?.dataBlob;
      if (p.type === 'IMAGE' && typeof idx === 'number' && blobs[idx] && !imageByBlob.has(idx)) {
        imageByBlob.set(idx, bytesToDataUrl(blobs[idx]));
      }
    }
  }

  let counter = 0;
  resetIdSeq(0);
  const nextFigId = (): string => {
    counter += 1;
    return `fig-${counter}`;
  };

  const importedTypes: Record<string, number> = {};

  const buildRaw = (fig: FigNode, parentAbs: { x: number; y: number }, parentMode: 'HORIZONTAL' | 'VERTICAL' | 'ABSOLUTE'): UINode | null => {
    const type = fig.type ?? '';
    const abs = {
      x: fig.transform?.m02 ?? 0,
      y: fig.transform?.m12 ?? 0,
    };
    const relative = { x: abs.x - parentAbs.x, y: abs.y - parentAbs.y };
    const kids = (childrenOf.get(guidKey(fig.guid)) ?? []).filter((k) => k.phase !== 'REMOVED');

    // 图片填充 → IMAGE 节点（AST 有独立图片语义，比「矩形 + 背景图」可编辑）
    const imgSrc = withImages ? imageSrcOf(fig.fillPaints, archive.images) : undefined;
    const imgFromBlob = withImages
      ? (fig.fillPaints ?? [])
          .filter((p) => hashKey(p.image?.hash) !== PLACEHOLDER_IMAGE_HASH)
          .map((p) => (typeof p.image?.dataBlob === 'number' ? imageByBlob.get(p.image.dataBlob) : undefined))
          .find((v): v is string => Boolean(v))
      : undefined;
    const src = imgSrc ?? imgFromBlob;
    // 空图占位（导出侧写的 1×1 透明图 + 哨兵 hash）：还原成「没有 src 的 IMAGE」
    const isImagePlaceholder = (fig.fillPaints ?? []).some(
      (p) => p.type === 'IMAGE' && hashKey(p.image?.hash) === PLACEHOLDER_IMAGE_HASH,
    );

    if (type === 'TEXT') {
      const kind: NodeKind = 'TEXT';
      const node = createNode(kind, { id: nextFigId(), name: fig.name ?? '文本' });
      node.layout = layoutOf(fig, kind, relative);
      node.style = styleOf(fig);
      if (fig.visible === false) node.visible = false;
      if (fig.locked) node.locked = true;
      (node as { text: string }).text = fig.textData?.characters ?? '';
      importedTypes.TEXT = (importedTypes.TEXT ?? 0) + 1;
      return node;
    }

    if (src || isImagePlaceholder) {
      const node = createNode('IMAGE', { id: nextFigId(), name: fig.name ?? '图片' }) as ImageNode;
      node.layout = layoutOf(fig, 'IMAGE', relative);
      node.style = styleOf(fig);
      if (src) node.src = src;
      if (fig.visible === false) node.visible = false;
      if (fig.locked) node.locked = true;
      importedTypes.IMAGE = (importedTypes.IMAGE ?? 0) + 1;
      return node;
    }

    // BUTTON 还原：导出侧把按钮拆成「FRAME + 唯一 TEXT 子节点（名为 Label）」，
    // 这里凭同一约定合回单节点，保证 AST 语义与编译出的 CSS 都回到原样
    if (type === 'FRAME' && kids.length === 1 && kids[0].type === 'TEXT' && kids[0].name === BUTTON_LABEL) {
      const label = kids[0];
      const node = createNode('BUTTON', { id: nextFigId(), name: fig.name ?? '按钮' }) as ButtonNode;
      node.layout = layoutOf(fig, 'BUTTON', relative);
      node.style = { ...styleOf(fig), ...textStyleOf(styleOf(label)) };
      // 导出时把「按钮 flex 居中」翻译成了 label 的 textAlignVertical，这里不能当成原始样式搬回去
      if (node.layout.align === 'CENTER' && node.style.textAlignVertical === 'CENTER') delete node.style.textAlignVertical;
      node.text = label.textData?.characters ?? '';
      if (fig.visible === false) node.visible = false;
      if (fig.locked) node.locked = true;
      importedTypes.BUTTON = (importedTypes.BUTTON ?? 0) + 1;
      return node;
    }

    if (SUPPORTED_CONTAINERS.has(type)) {
      const kind: NodeKind = type === 'SECTION' ? 'SECTION' : 'FRAME';
      const node = createNode(kind, { id: nextFigId(), name: fig.name ?? 'Frame' }) as ContainerNode;
      node.layout = layoutOf(fig, kind, relative);
      node.style = styleOf(fig);
      if (fig.visible === false) node.visible = false;
      if (fig.locked) node.locked = true;
      const auto = node.layout.mode !== 'ABSOLUTE';
      const pad = node.layout.padding ?? [0, 0, 0, 0];
      const box = {
        mode: node.layout.mode,
        contentW: Math.max(0, (fig.size?.x ?? 0) - pad[1] - pad[3]),
        contentH: Math.max(0, (fig.size?.y ?? 0) - pad[0] - pad[2]),
      };
      const pairs = kids
        .map((k) => ({ fig: k, node: build(k, abs, box) }))
        .filter((p): p is { fig: FigNode; node: UINode } => Boolean(p.node));
      // 交叉轴拉伸有两种来源：父容器 align=STRETCH（所有子项都拉伸）与子项自身 FILL。
      // 前者在 Figma 里只能写成子项的 stackChildAlignSelf，所以这里按「拉伸但没被判成 FILL」
      // 反推父容器的 align —— 只有它才说明「拉伸来自父容器」。
      const crossKey = box.mode === 'HORIZONTAL' ? 'heightMode' : 'widthMode';
      if (
        box.mode !== 'ABSOLUTE' &&
        pairs.some((p) => p.fig.stackChildAlignSelf === 'STRETCH' && p.node.layout[crossKey] !== 'FILL')
      ) {
        node.layout.align = 'STRETCH';
      }
      node.children = pairs.map(({ node: c }) => {
        // 自动布局容器里位置由布局决定，清掉相对坐标避免与 gap/padding 打架
        if (auto) {
          delete c.layout.x;
          delete c.layout.y;
        }
        return c;
      });
      importedTypes[kind] = (importedTypes[kind] ?? 0) + 1;
      return node;
    }

    const kind = SIMPLE_KIND[type];
    if (!kind) {
      warnings.push(`跳过不支持的节点类型 ${type}（${fig.name ?? ''}）`);
      return null;
    }
    const node = createNode(kind, { id: nextFigId(), name: fig.name ?? type });
    node.layout = layoutOf(fig, kind, relative);
    node.style = { ...styleOf(fig), ...(shapeExtras(fig, kind) as Partial<StyleSchema>) };
    if (fig.visible === false) node.visible = false;
    if (fig.locked) node.locked = true;
    if (kind === 'VECTOR') {
      // 矢量几何在 Figma 里是命令 blob，需要额外解码器；这里保留空 path 占位
      node.vector = { d: 'M 0 0', width: node.layout.width, height: node.layout.height };
    }
    importedTypes[kind] = (importedTypes[kind] ?? 0) + 1;
    return node;
  };

  /**
   * FILL 还原。
   *
   * Figma 的 StackSize 没有 FILL：主轴填充写成 `stackChildPrimaryGrow`，交叉轴填充写成子项的
   * `stackChildAlignSelf = STRETCH`（父容器的 stackCounterAlignItems 没有 STRETCH 枚举）。
   * 导出侧按这个约定写，这里按同一约定把 `widthMode/heightMode` 还原成 FILL —— 否则
   * 往返后 FILL 会退化成「等于父宽的 FIXED」，主轴上的 flex 语义就丢了。
   */
  const build = (
    fig: FigNode,
    parentAbs: { x: number; y: number },
    parent: { mode: 'HORIZONTAL' | 'VERTICAL' | 'ABSOLUTE'; contentW: number; contentH: number },
  ): UINode | null => {
    const node = buildRaw(fig, parentAbs, parent.mode);
    if (!node) return node;
    if (parent.mode === 'ABSOLUTE') {
      // 绝对布局下导出侧固定用「STRETCH = 宽 FILL / grow = 高 FILL」，没有父容器 align 的歧义
      if (fig.stackChildAlignSelf === 'STRETCH') node.layout.widthMode = 'FILL';
      if ((fig.stackChildPrimaryGrow ?? 0) > 0) node.layout.heightMode = 'FILL';
      return node;
    }
    const horizontal = parent.mode === 'HORIZONTAL';
    const primaryKey = horizontal ? 'widthMode' : 'heightMode';
    const crossKey = horizontal ? 'heightMode' : 'widthMode';
    // 主轴 FILL：Figma 的 stackChildPrimaryGrow（弹性拉伸）
    if ((fig.stackChildPrimaryGrow ?? 0) > 0) node.layout[primaryKey] = 'FILL';
    // 交叉轴 FILL：Figma 只能写成子项 stackChildAlignSelf=STRETCH。
    // 但「父容器 align=STRETCH」也会让子项带上同一个标记，靠**尺寸是否正好等于父内容盒**区分：
    // 导出时交叉轴 FILL 会被换算成父内容盒尺寸，而 align=STRETCH 的子项保留自身尺寸。
    if (fig.stackChildAlignSelf === 'STRETCH') {
      const crossSize = horizontal ? (fig.size?.y ?? 0) : (fig.size?.x ?? 0);
      const content = horizontal ? parent.contentH : parent.contentW;
      if (content > 0 && Math.abs(crossSize - content) < 0.5) node.layout[crossKey] = 'FILL';
    }
    return node;
  };

  const documentNode = nodeChanges.find((n) => n.type === 'DOCUMENT');
  const canvases = documentNode
    ? (childrenOf.get(guidKey(documentNode.guid)) ?? []).filter((n) => n.type === 'CANVAS')
    : nodeChanges.filter((n) => n.type === 'CANVAS');

  const pages: UIPage[] = [];
  let total = 0;
  for (const canvas of canvases) {
    const name = canvas.name ?? `Page ${pages.length + 1}`;
    if (name === 'Internal Only Canvas') continue; // Figma 内部画布，不是用户页面
    const kids = (childrenOf.get(guidKey(canvas.guid)) ?? []).filter((k) => k.phase !== 'REMOVED');
    if (kids.length === 0) continue;
    const page = createPage(name, 375, 812);
    page.root.name = name;
    // 页面尺寸取子节点包围盒（Figma canvas 本身没有尺寸）
    let maxX = 375;
    let maxY = 812;
    const origin = { x: 0, y: 0 };
    const children: UINode[] = [];
    for (const kid of kids) {
      if (total >= maxNodes) {
        warnings.push(`节点数超过上限 ${maxNodes}，后续节点已截断`);
        break;
      }
      // 页面根容器在 `.fig` 里是 CANVAS，子项的相对坐标直接挂在画布上；
      // 但 FILL 语义要按页面根布局（VERTICAL/HORIZONTAL）判断，不能当 ABSOLUTE
      const built = build(kid, origin, { mode: page.root.layout.mode, contentW: page.viewport.width, contentH: page.viewport.height });
      if (!built) continue;
      total += 1;
      children.push(built);
      maxX = Math.max(maxX, (kid.transform?.m02 ?? 0) + (kid.size?.x ?? 0));
      maxY = Math.max(maxY, (kid.transform?.m12 ?? 0) + (kid.size?.y ?? 0));
    }
    if (children.length === 0) continue;
    page.root.children = children;
    page.root.layout.width = Math.round(maxX);
    page.root.layout.height = Math.round(maxY);
    page.viewport = { width: Math.round(maxX), height: Math.round(maxY) };
    pages.push(page);
  }

  if (pages.length === 0) throw new Error('.fig 里没有可导入的页面（只有内部画布或空画布）');

  return {
    pages,
    stats: {
      rawNodes: nodeChanges.length,
      imported: total,
      pages: pages.length,
      byType: importedTypes,
    },
    warnings,
    ...(archive.meta ? { meta: archive.meta } : {}),
  };
}

/** 便捷导出：给单页场景（多数调用方只要第一页） */
export function firstPageOf(result: FigImportResult): UIPage {
  const page = result.pages[0];
  if (!page) throw new Error('导入结果没有页面');
  return page;
}

/** 供 UI 展示：图片填充里的 dataURL 列表（避免外部再遍历一次） */
export function collectImageSources(page: UIPage): string[] {
  const out: string[] = [];
  const visit = (n: UINode): void => {
    if (n.type === 'IMAGE' && n.src) out.push(n.src);
    if ('children' in n) for (const c of n.children) visit(c);
  };
  visit(page.root);
  return out;
}
