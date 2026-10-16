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

/** FR-19 效果列表 → CSS 声明（box-shadow 多层 / filter / backdrop-filter），供 EFFECT 样式复用 */
function effectDecls(effects: import('../schema/types').Effect[]): Record<string, string> {
  const out: Record<string, string> = {};
  const shadows: string[] = [];
  const filters: string[] = [];
  const backdrop: string[] = [];
  for (const e of effects.filter((x) => x.visible !== false)) {
    if (e.kind === 'DROP_SHADOW') {
      shadows.push(`${e.x ?? 0}px ${e.y ?? 4}px ${e.blur ?? 4}px ${e.spread ?? 0}px ${e.color ?? 'rgba(0,0,0,0.2)'}`);
    } else if (e.kind === 'INNER_SHADOW') {
      shadows.push(`inset ${e.x ?? 0}px ${e.y ?? 4}px ${e.blur ?? 4}px ${e.spread ?? 0}px ${e.color ?? 'rgba(0,0,0,0.2)'}`);
    } else if (e.kind === 'LAYER_BLUR') {
      filters.push(`blur(${e.radius ?? 4}px)`);
    } else if (e.kind === 'BACKGROUND_BLUR') {
      backdrop.push(`blur(${e.radius ?? 4}px)`);
    }
  }
  if (shadows.length) out['box-shadow'] = shadows.join(', ');
  if (filters.length) out.filter = filters.join(' ');
  if (backdrop.length) out['backdrop-filter'] = backdrop.join(' ');
  return out;
}

/** FR-34 Layout grids → CSS（Columns/Rows 走 repeating-linear-gradient 占位；GRID 走 background-size 网格） */
function gridCss(g: import('../schema/types').LayoutGridSchema): string | null {
  const color = g.color ?? 'rgba(255, 0, 0, 0.1)';
  const gutter = g.gutter ?? 0;
  if (g.pattern === 'GRID') return null; // GRID 型需两条轴叠加，交由调用方合成（见下）
  const size = `${gutter}px`;
  return `repeating-linear-gradient(to ${g.pattern === 'COLUMNS' ? 'right' : 'bottom'}, ${color} 0 1px, transparent 1px ${size})`;
}

/**
 * FR-27：token.style（Partial<StyleSchema>）→ CSS 声明表。
 * PAINT 取 fills/background；TEXT 取排版字段；EFFECT 取 effects；GRID 取 grids（FR-27 四类全集）。
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

  if (token.kind === 'EFFECT') {
    // 效果为复合声明（box-shadow/filter 非单值），无法塞进单一变量 →
    // 以多变量表达：--uic-effect-1-box-shadow / -filter / -backdrop-filter
    const decls = effectDecls(s.effects ?? []);
    for (const [k, v] of Object.entries(decls)) out[`${varName}-${k}`] = v;
    return out;
  }

  if (token.kind === 'GRID') {
    // 网格同样为复合表达：--uic-grid-1-columns / -rows / -size
    const grids = token.grids ?? s.layoutGrids ?? [];
    if (!grids.length) return out;
    const cols = grids.find((g) => g.pattern === 'COLUMNS');
    const rows = grids.find((g) => g.pattern === 'ROWS');
    const grid = grids.find((g) => g.pattern === 'GRID');
    if (cols) {
      const c = gridCss(cols);
      if (c) out[`${varName}-columns`] = c;
    }
    if (rows) {
      const r = gridCss(rows);
      if (r) out[`${varName}-rows`] = r;
    }
    if (grid) out[`${varName}-size`] = `${grid.sectionSize ?? 8}px`;
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
  const prefix =
    token.kind === 'PAINT'
      ? '--uic-paint'
      : token.kind === 'TEXT'
        ? '--uic-text'
        : token.kind === 'EFFECT'
          ? '--uic-effect'
          : '--uic-grid';
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
