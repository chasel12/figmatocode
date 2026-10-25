/**
 * FR-76 `.fig` 导入 —— Figma 颜色 / 填充 / 描边 / 效果 → AST 样式。
 *
 * 口径说明：
 * - Figma 的 `Color` 是 0..1 的 sRGB 分量，AST 用 `#rrggbb` 字符串；alpha 走各自的 opacity 字段。
 * - Figma 的渐变方向藏在 2×3 `transform` 里（把单位方形映射到渐变轴），
 *   这里只还原**角度**，半径/焦点按 Figma 默认（0.5）取值 —— 与 AST 的表达力对齐。
 * - 多层填充：AST 支持 `style.fills[]`，第一层另存 `style.background` 供画布快速取色。
 */
import type { Effect, FillLayer, FillStop, StyleSchema } from '../schema/types';

export interface FigColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface FigMatrix {
  m00?: number;
  m01?: number;
  m02?: number;
  m10?: number;
  m11?: number;
  m12?: number;
}

export interface FigPaint {
  type?: string;
  color?: FigColor;
  opacity?: number;
  visible?: boolean;
  blendMode?: string;
  stops?: { color?: FigColor; position?: number }[];
  transform?: FigMatrix;
  image?: { hash?: unknown; dataBlob?: number; name?: string };
  scaleMode?: string;
}

export interface FigEffect {
  type?: string;
  visible?: boolean;
  color?: FigColor;
  offset?: { x?: number; y?: number };
  radius?: number;
  spread?: number;
  showShadowBehindNode?: boolean;
  blendMode?: string;
}

const clamp255 = (v: number): number => Math.max(0, Math.min(255, Math.round(v * 255)));

/** Figma Color(0..1) → `#rrggbb`（小写，AST 既有口径） */
export function colorToHex(color: FigColor | undefined, fallback = '#000000'): string {
  if (!color) return fallback;
  const to = (v: number | undefined): string => clamp255(typeof v === 'number' ? v : 0).toString(16).padStart(2, '0');
  return `#${to(color.r)}${to(color.g)}${to(color.b)}`;
}

/** `#rrggbb` → Figma Color(0..1)，alpha 单独给 */
export function hexToColor(hex: string, alpha = 1): FigColor {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 0, g: 0, b: 0, a: alpha };
  const n = Number.parseInt(m[1], 16);
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
    a: alpha,
  };
}

/**
 * CSS 颜色字符串 → Figma Color。
 *
 * AST 的 `Effect.color` 允许任意 CSS 颜色串（历史数据里常见 `rgba(0,0,0,0.08)`），
 * 而 Figma 只吃 0..1 分量，所以要把 `rgb()/rgba()` 也解出来，否则阴影会变成不透明黑。
 */
export function cssColorToFigColor(input: string | undefined, fallback = '#000000'): FigColor {
  const text = (input ?? '').trim();
  if (text.toLowerCase() === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  const fn = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (fn) {
    const parts = fn[1].split(/[,/]/).map((p) => p.trim());
    const num = (v: string | undefined): number => (v === undefined ? 0 : Number.parseFloat(v));
    const scale = (v: string | undefined): number => {
      if (v !== undefined && v.endsWith('%')) return num(v) / 100;
      return num(v) / 255;
    };
    return { r: scale(parts[0]), g: scale(parts[1]), b: scale(parts[2]), a: parts[3] === undefined ? 1 : num(parts[3]) };
  }
  const hexAlpha = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(text);
  if (hexAlpha && hexAlpha[2]) {
    const base = hexToColor(`#${hexAlpha[1]}`, 1);
    return { ...base, a: Number.parseInt(hexAlpha[2], 16) / 255 };
  }
  return hexToColor(text || fallback, 1);
}

/** Figma Color → CSS 颜色串（alpha<1 出 rgba，否则出 #rrggbb；与 cssColorToFigColor 互逆） */
export function figColorToCss(color: FigColor | undefined): string {
  if (!color) return '#000000';
  const a = color.a ?? 1;
  if (a <= 0) return 'transparent';
  const hex = colorToHex(color);
  if (a >= 1) return hex;
  const round = (v: number): string => String(Number(v.toFixed(4)));
  return `rgba(${clamp255(color.r)},${clamp255(color.g)},${clamp255(color.b)},${round(a)})`;
}

/** 渐变 transform → 角度（度，0=向右，顺时针）。Figma 的轴是矩阵第一列。 */
export function gradientAngle(transform: FigMatrix | undefined): number {
  const m00 = transform?.m00 ?? 1;
  const m10 = transform?.m10 ?? 0;
  const deg = (Math.atan2(m10, m00) * 180) / Math.PI;
  return Math.round(((deg % 360) + 360) % 360);
}

const GRADIENT_TYPES = new Set(['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND']);

/** 单层 Figma paint → AST FillLayer（不支持的 paint 返回 null） */
export function paintToFill(paint: FigPaint): FillLayer | null {
  const type = paint.type ?? 'SOLID';
  if (type === 'SOLID') {
    return {
      type: 'SOLID',
      // 允许 'transparent' / rgba() 这类 CSS 颜色串（旧数据与半透明色都在用）
      color: figColorToCss(paint.color),
      // 只有真的带透明度才写 opacity，否则会多出一个「1 vs undefined」的必然差异
      ...(typeof paint.opacity === 'number' && paint.opacity < 1 ? { opacity: paint.opacity } : {}),
      // visible 默认 true，只有隐藏才写
      ...(paint.visible === false ? { visible: false } : {}),
    };
  }
  if (GRADIENT_TYPES.has(type)) {
    const stops: FillStop[] = (paint.stops ?? []).map((s) => ({
      position: s.position ?? 0,
      color: colorToHex(s.color),
      // 只有真的带透明度才写 opacity，否则会多出一个「1 vs undefined」的必然差异
      ...(typeof s.color?.a === 'number' && s.color.a < 1 ? { opacity: s.color.a } : {}),
    }));
    return {
      type: type as FillLayer['type'],
      angle: gradientAngle(paint.transform),
      stops,
      ...(typeof paint.opacity === 'number' && paint.opacity < 1 ? { opacity: paint.opacity } : {}),
      ...(paint.visible === false ? { visible: false } : {}),
    };
  }
  // IMAGE / VIDEO / PATTERN / NOISE 不落 fills，由调用方单独处理（图片走 ImageNode）
  return null;
}

/** 填充层数组 → 样式片段（首层进 background，全量进 fills） */
export function fillsToStyle(paints: FigPaint[] | undefined): Partial<StyleSchema> {
  const visible = (paints ?? []).filter((p) => p.visible !== false);
  if (visible.length === 0) return {};
  const fills = visible.map(paintToFill).filter((f): f is FillLayer => Boolean(f));
  if (fills.length === 0) return {};
  const first = fills[0];
  // 单层纯色就是 background（AST 的旧口径）；写成 fills 会让编译器改出 background-image 渐变，
  // 与 background-color 不是同一条 CSS —— 所以只有多层/带透明度时才落 fills
  if (fills.length === 1 && first.type === 'SOLID' && (first.opacity ?? 1) >= 1 && first.color) {
    return { background: first.color };
  }
  const out: Partial<StyleSchema> = { fills };
  if (first.type === 'SOLID' && first.color) out.background = first.color;
  return out;
}

/**
 * 描边 paint 数组 → AST border（取首层）。
 * B1：首层是渐变时落 `border.fill`，`color` 取首停靠色作为降级回退
 * （CSS 四边独立 / CENTER / OUTSIDE / 虚线、以及 Konva 的旧路径都只用 color）。
 */
export function strokesToStyle(
  paints: FigPaint[] | undefined,
  weight: number | undefined,
  align: string | undefined,
  dashPattern: number[] | undefined,
  join?: string,
  cap?: string,
): Partial<StyleSchema> {
  // 取首层**可转换**的可见 paint：IMAGE/PATTERN 这类 AST 描边表达不了的跳过，继续找下一层
  // （不能直接取首个可见 paint —— 首层是 IMAGE 时会把后面的 SOLID 一起丢掉）
  let fill: FillLayer | null = null;
  let first: FigPaint | undefined;
  for (const p of paints ?? []) {
    if (p.visible === false) continue;
    const f = paintToFill(p);
    if (f) {
      fill = f;
      first = p;
      break;
    }
  }
  const width = weight ?? 0;
  if (!fill || !first || width <= 0) return {};
  const fallbackColor =
    fill.type === 'SOLID'
      ? (fill.color ?? colorToHex(first.color))
      : (fill.stops?.[0]?.color ?? colorToHex(first.color));
  return {
    border: {
      width,
      color: fallbackColor,
      ...(fill.type !== 'SOLID' ? { fill } : {}),
      style: dashPattern && dashPattern.length > 0 ? 'dashed' : 'solid',
      // AST 的缺省对齐是 INSIDE，所以只有 CENTER/OUTSIDE 需要显式写
      ...(align === 'CENTER' || align === 'OUTSIDE' ? { align } : {}),
      ...(join && join !== 'MITER' ? { join: join as 'ROUND' | 'BEVEL' } : {}),
      ...(cap && cap !== 'NONE' ? { cap: cap as 'ROUND' | 'SQUARE' } : {}),
      ...(dashPattern && dashPattern.length > 0 ? { dash: [dashPattern[0], dashPattern[1] ?? dashPattern[0]] as [number, number] } : {}),
    },
  };
}

/** Figma EffectType → AST EffectKind（两边命名不完全一致，必须显式映射） */
const EFFECT_IN: Record<string, Effect['kind']> = {
  DROP_SHADOW: 'DROP_SHADOW',
  INNER_SHADOW: 'INNER_SHADOW',
  FOREGROUND_BLUR: 'LAYER_BLUR',
  BACKGROUND_BLUR: 'BACKGROUND_BLUR',
  NOISE: 'NOISE',
  GRAIN: 'NOISE',
  GLASS: 'GLASS',
  REPEAT: 'TEXTURE',
};

/** AST EffectKind → Figma EffectType（EFFECT_IN 的逆；PROGRESSIVE_BLUR 落到前景模糊） */
const EFFECT_OUT: Record<string, string> = {
  DROP_SHADOW: 'DROP_SHADOW',
  INNER_SHADOW: 'INNER_SHADOW',
  LAYER_BLUR: 'FOREGROUND_BLUR',
  PROGRESSIVE_BLUR: 'FOREGROUND_BLUR',
  BACKGROUND_BLUR: 'BACKGROUND_BLUR',
  NOISE: 'NOISE',
  TEXTURE: 'REPEAT',
  GLASS: 'GLASS',
};

export function effectsToStyle(effects: FigEffect[] | undefined): Effect[] {
  const out: Effect[] = [];
  for (const e of effects ?? []) {
    if (e.visible === false) continue;
    const kind = EFFECT_IN[e.type ?? ''];
    if (!kind) continue;
    const item: Effect = { kind };
    if (kind === 'DROP_SHADOW' || kind === 'INNER_SHADOW') {
      item.x = e.offset?.x ?? 0;
      item.y = e.offset?.y ?? 0;
      item.blur = e.radius ?? 0;
      item.spread = e.spread ?? 0;
      // 半透明阴影必须还原成 rgba()：编译器只读 color，不读 opacity
      item.color = figColorToCss(e.color);
    } else {
      item.radius = e.radius ?? 0;
    }
    out.push(item);
  }
  return out;
}

/** AST 填充 → Figma paint 数组（导出用） */
/**
 * AST FillLayer → Figma paint（填充与描边共用：`border.fill` 走同一条转换）。
 * `fallbackBg` 供 SOLID 层缺 color 时兜底。
 */
export function fillToPaint(f: FillLayer, fallbackBg?: string): FigPaint {
  if (f.type === 'SOLID') {
    return {
      type: 'SOLID',
      color: cssColorToFigColor(f.color ?? fallbackBg, '#ffffff'),
      opacity: f.opacity ?? 1,
      visible: true,
      blendMode: 'NORMAL',
    };
  }
  return {
    type: f.type,
    opacity: f.opacity ?? 1,
    visible: true,
    blendMode: 'NORMAL',
    stops: (f.stops ?? []).map((s) => ({
      color: hexToColor(s.color, s.opacity ?? 1),
      position: s.position,
    })),
    transform: angleToTransform(f.angle ?? 0),
  };
}

export function styleToPaints(style: StyleSchema | undefined): FigPaint[] {
  if (!style) return [];
  if (style.fills && style.fills.length > 0) {
    return style.fills.filter((f) => f.visible !== false).map((f) => fillToPaint(f, style.background));
  }
  if (style.background) {
    return [{ type: 'SOLID', color: cssColorToFigColor(style.background, '#ffffff'), opacity: 1, visible: true, blendMode: 'NORMAL' }];
  }
  return [];
}

/** 角度 → 渐变 transform（与 gradientAngle 互逆） */
export function angleToTransform(angle: number): FigMatrix {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { m00: cos, m01: -sin, m02: 0, m10: sin, m11: cos, m12: 0 };
}

/** AST 效果 → Figma effects */
export function styleToEffects(style: StyleSchema | undefined): FigEffect[] {
  return (style?.effects ?? []).map((e) => {
    if (e.kind === 'DROP_SHADOW' || e.kind === 'INNER_SHADOW') {
      // color 允许是 rgba() 串（旧数据），统一解析成 0..1 分量再写
      const parsed = cssColorToFigColor(e.color, '#000000');
      const color = typeof e.opacity === 'number' && e.opacity < 1 ? { ...parsed, a: e.opacity } : parsed;
      return {
        type: EFFECT_OUT[e.kind] ?? 'DROP_SHADOW',
        visible: true,
        color,
        offset: { x: e.x ?? 0, y: e.y ?? 0 },
        radius: e.blur ?? 0,
        spread: e.spread ?? 0,
        blendMode: 'NORMAL',
      } satisfies FigEffect;
    }
    return { type: EFFECT_OUT[e.kind] ?? 'FOREGROUND_BLUR', visible: true, radius: e.radius ?? 0 } satisfies FigEffect;
  });
}
