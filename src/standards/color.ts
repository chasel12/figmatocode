/**
 * 颜色计算（WCAG 2.2 对比度 + 近似色聚类）。
 *
 * 刻意**不引 culori**：这里只需要 sRGB 线性化、alpha 合成、CIE76 色差三件事，
 * 自写 60 行比拉一个通用色彩库更可控（也让本模块能在浏览器端被引用而不增包体）。
 * culori 仍在 `scripts/extract-tokens.mjs` 里做 oklch/color() 的解析——那是**一次性
 * 取色**，和这里「运行时判据」是两条路。
 */

export interface RGBA {
  r: number; // 0-255
  g: number;
  b: number;
  a: number; // 0-1
}

/** 命名色只收「产物里真会出现」的少数几个；其余返回 null（= 不可判定，调用方跳过） */
const NAMED: Record<string, [number, number, number]> = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  silver: [192, 192, 192],
  transparent: [0, 0, 0],
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(hh / 60) % 6;
  const rgb: [number, number, number] =
    seg === 0 ? [c, x, 0] : seg === 1 ? [x, c, 0] : seg === 2 ? [0, c, x] : seg === 3 ? [0, x, c] : seg === 4 ? [x, 0, c] : [c, 0, x];
  return [Math.round((rgb[0] + m) * 255), Math.round((rgb[1] + m) * 255), Math.round((rgb[2] + m) * 255)];
}

/** 任意 CSS 色 → RGBA；解析失败返回 null（**不猜**，调用方跳过而不是当成黑色） */
export function parseColor(input: string | undefined | null): RGBA | null {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  if (!s || s === 'currentcolor' || s === 'inherit' || s === 'none' || s.startsWith('var(')) return null;

  if (s.startsWith('#')) {
    const h = s.slice(1);
    const hex = (i: number): number => parseInt(h.slice(i, i + 2), 16);
    if (h.length === 3 || h.length === 4) {
      const [r, g, b] = [h[0], h[1], h[2]].map((c) => parseInt(c + c, 16));
      return { r, g, b, a: h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1 };
    }
    if (h.length === 6 || h.length === 8) {
      return { r: hex(0), g: hex(2), b: hex(4), a: h.length === 8 ? hex(6) / 255 : 1 };
    }
    return null;
  }

  const rgbM = /^rgba?\(([^)]+)\)$/.exec(s);
  if (rgbM) {
    const parts = rgbM[1].split(/[,/\s]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const num = (p: string): number => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p));
    const alpha = (p: string | undefined): number => (p == null ? 1 : p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p));
    return {
      r: clamp(num(parts[0]), 0, 255),
      g: clamp(num(parts[1]), 0, 255),
      b: clamp(num(parts[2]), 0, 255),
      a: clamp(alpha(parts[3]), 0, 1),
    };
  }

  const hslM = /^hsla?\(([^)]+)\)$/.exec(s);
  if (hslM) {
    const parts = hslM[1].split(/[,/\s]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const h = parseFloat(parts[0]);
    const sat = parseFloat(parts[1]) / 100;
    const li = parseFloat(parts[2]) / 100;
    const [r, g, b] = hslToRgb(h, clamp(sat, 0, 1), clamp(li, 0, 1));
    const alpha = parts[3] == null ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    return { r, g, b, a: clamp(alpha, 0, 1) };
  }

  const named = NAMED[s];
  if (named) return { r: named[0], g: named[1], b: named[2], a: s === 'transparent' ? 0 : 1 };
  return null;
}

/** 是否**不透明**（alpha ≥ 0.999）。只有不透明填充才能当「背景」参与对比度计算。 */
export function isOpaque(c: RGBA | null): boolean {
  return !!c && c.a >= 0.999;
}

/** fg 叠在 bg 上（alpha 合成），返回不透明结果 */
export function composite(fg: RGBA, bg: RGBA): RGBA {
  if (fg.a >= 0.999) return fg;
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

/** WCAG 相对亮度（sRGB 线性化后按 0.2126/0.7152/0.0722 加权） */
export function relativeLuminance(c: RGBA): number {
  const lin = (v: number): number => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/**
 * WCAG 对比度（1~21）。
 *
 * 任一参数为 null（不可判定）时返回 `null` —— 调用方必须跳过而不是当成 1:1 报违例。
 * 这条纪律来自本项目的老坑：**「查不出」不等于「不合规」**。
 */
export function contrastRatio(a: string | RGBA | null, b: string | RGBA | null): number | null {
  const ca = typeof a === 'string' ? parseColor(a) : a;
  const cb = typeof b === 'string' ? parseColor(b) : b;
  if (!ca || !cb) return null;
  const bg = isOpaque(cb) ? cb : { ...cb, a: 1 };  const fg = ca.a >= 0.999 ? ca : composite(ca, bg);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/** sRGB → CIE Lab（D65），用于 ΔE 色差 */
function toLab(c: RGBA): [number, number, number] {
  const lin = (v: number): number => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [lin(c.r), lin(c.g), lin(c.b)];
  // sRGB → XYZ（D65）
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 色差（判「近似色」够用；ΔE<3 人眼基本分不出） */
export function deltaE(a: string | RGBA, b: string | RGBA): number | null {
  const ca = typeof a === 'string' ? parseColor(a) : a;
  const cb = typeof b === 'string' ? parseColor(b) : b;
  if (!ca || !cb) return null;
  const [l1, a1, b1] = toLab(ca);
  const [l2, a2, b2] = toLab(cb);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

/** 归一化色值为 `#rrggbb`（聚类键用；解析失败返回原串 trim 后的小写形式） */
export function normalizeHex(input: string): string {
  const c = parseColor(input);
  if (!c) return input.trim().toLowerCase();
  const h = (n: number): string => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}
