/**
 * FR-27/28 样式与 Design Tokens 出码。
 *
 * 与 `compile.ts` 的填充/文本出码口径**对齐但独立实现**——刻意不 import compile.ts
 * （compile 依赖 layout/measure，tokens 反向依赖会成环）；两处口径变更需同步。
 *
 * FR-28 产物：`:root { --uic-paint-1: ...; }` 形式的 tokens.css。
 */
import type { FillLayer, StyleToken } from '../schema/types';

/** 与 compile.ts 同口径的两位小数（避免浮点噪声进 CSS 变量） */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** 与 compile.ts `withAlpha` 同口径：hex/rgb 支持，其他原样返回 */
export function withAlpha(color: string, alpha: number): string {
  if (alpha >= 1) return color;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const h = hex[1];
    const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16);
    const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16);
    const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${round2(alpha)})`;
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(color);
  if (rgb) {
    const base = rgb[4] != null ? parseFloat(rgb[4]) : 1;
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${round2(base * alpha)})`;
  }
  return color;
}

/** FR-17 渐变停靠点出码（与 compile.ts stopsCss 同口径） */
function stopsCss(f: FillLayer): string {
  const layerAlpha = f.opacity ?? 1;
  const stops =
    f.stops && f.stops.length
      ? f.stops
      : [
          { position: 0, color: '#000000' },
          { position: 1, color: '#FFFFFF' },
        ];
  return stops.map((s) => `${withAlpha(s.color, (s.opacity ?? 1) * layerAlpha)} ${round2(s.position * 100)}%`).join(', ');
}

/** FR-17 单层 fill→background-image 片段（与 compile.ts fillLayerCss 同口径） */
export function fillLayerCss(f: FillLayer): string {
  if (f.type === 'SOLID') {
    const c = withAlpha(f.color ?? '#000000', f.opacity ?? 1);
    return `linear-gradient(${c}, ${c})`;
  }
  const stops = stopsCss(f);
  const angle = ((((f.angle ?? 0) + 90) % 360) + 360) % 360;
  switch (f.type) {
    case 'GRADIENT_LINEAR':
      return `linear-gradient(${angle}deg, ${stops})`;
    case 'GRADIENT_RADIAL':
      return `radial-gradient(circle at 50% 50%, ${stops})`;
    case 'GRADIENT_ANGULAR':
      return `conic-gradient(from ${angle}deg, ${stops})`;
    case 'GRADIENT_DIAMOND':
      return `linear-gradient(${angle}deg, ${stops})`;
    default:
      return `linear-gradient(${stops}, ${stops})`;
  }
}

/**
 * FR-27：token.style（Partial<StyleSchema>）→ CSS 声明表。
 * PAINT 取 fills/background 表达；TEXT 取排版字段（复合变量逐项展开）。
 */
export function tokenDecls(token: StyleToken, varName: string): Record<string, string> {
  const s = token.style;
  const out: Record<string, string> = {};
  if (token.kind === 'PAINT') {
    const fills = (s.fills ?? []).filter((f) => f.visible !== false);
    if (fills.length) out[varName] = fills.map(fillLayerCss).join(', ');
    else if (s.background) out[varName] = s.background;
    return out;
  }
  // TEXT：复合变量逐项（--uic-text-1-font-size 形态）
  if (s.fontSize != null) out[`${varName}-font-size`] = `${round2(s.fontSize)}px`;
  if (s.fontWeight != null) out[`${varName}-font-weight`] = String(s.fontWeight);
  if (s.fontFamily) out[`${varName}-font-family`] = s.fontFamily;
  if (s.color) out[`${varName}-color`] = s.color;
  if (s.lineHeight != null) out[`${varName}-line-height`] = `${round2(s.lineHeight)}px`;
  if (s.letterSpacing != null) out[`${varName}-letter-spacing`] = `${round2(s.letterSpacing)}px`;
  if (s.textAlign) out[`${varName}-text-align`] = s.textAlign;
  return out;
}

/** token 默认变量名（未显式给 cssVar 时按 kind+序号派生） */
export function defaultVarName(token: StyleToken, index: number): string {
  const prefix = token.kind === 'PAINT' ? '--uic-paint' : '--uic-text';
  return `${prefix}-${index + 1}`;
}

/**
 * FR-28：样式表 → tokens.css。
 * 空表/全缺省 → 产出 `:root {}`（结构断言可预期，不产空行噪声）。
 */
export function tokensToCss(tokens: StyleToken[]): string {
  const decls: string[] = [];
  tokens.forEach((t, i) => {
    const varName = t.cssVar ?? defaultVarName(t, i);
    const map = tokenDecls(t, varName);
    for (const [k, v] of Object.entries(map)) decls.push(`  ${k}: ${v};`);
  });
  if (!decls.length) return ':root {}';
  return `:root {\n${decls.join('\n')}\n}`;
}
