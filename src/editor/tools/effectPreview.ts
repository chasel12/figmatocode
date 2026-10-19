/**
 * FR-19/34 画布效果实时预览映射（差异 #18/#19 修复，2026-10-19）。
 * 纯函数：style.effects/blendMode → Konva 侧可声明的预览属性描述，供 Canvas NodeView 消费。
 * 口径（与出码近似保持一致，其余维持「以导出为准」并在 checklist #18/#19 报备）：
 *  - blendMode：16 模式全部映射 canvas globalCompositeOperation（Konva 原生支持）；
 *  - LAYER_BLUR：radius；PROGRESSIVE_BLUR：起始/主半径均值（= compile.ts 同口径近似）；多个模糊取最大；
 *  - NOISE/TEXTURE：上层 pattern 覆盖贴片（粒径=radius、强度=density、双色）；
 *  - GLASS：半透明白覆盖（blur+saturate 链的画布轻量近似）；
 *  - DROP_SHADOW：既有 shadowProps 通道（本模块不重复）；
 *  - INNER_SHADOW/BACKGROUND_BLUR/cornerSmoothing/paragraphIndent：Konva 物理不可/成本过高，
 *    **维持导出为准口径**（#18/#19 已报备，非静默）。
 */
import type { BlendMode, Effect, StyleSchema } from '../../schema/types';

/** NORMAL 不输出；其余 = canvas 标准合成名 */
export const BLEND_TO_GCO: Partial<Record<BlendMode, string>> = {
  DARKEN: 'darken',
  MULTIPLY: 'multiply',
  COLOR_BURN: 'color-burn',
  LIGHTEN: 'lighten',
  SCREEN: 'screen',
  COLOR_DODGE: 'color-dodge',
  OVERLAY: 'overlay',
  SOFT_LIGHT: 'soft-light',
  HARD_LIGHT: 'hard-light',
  DIFFERENCE: 'difference',
  EXCLUSION: 'exclusion',
  HUE: 'hue',
  SATURATION: 'saturation',
  COLOR: 'color',
  LUMINOSITY: 'luminosity',
};

export type FxOverlayDesc =
  | { mode: 'pattern'; tileKey: string; cell: number; opacity: number; color: string; color2: string }
  | { mode: 'tint'; color: string; opacity: number };

export interface EffectPreview {
  /** globalCompositeOperation（undefined=NORMAL 不设置） */
  blend?: string;
  /** 组级缓存模糊半径（存在即需 filters=[Blur]+cached） */
  blurRadius?: number;
  /** 上层覆盖（噪声/纹理/玻璃），矩形族几何 */
  overlay?: FxOverlayDesc;
}

const visibleEffects = (style: StyleSchema): Effect[] => (style.effects ?? []).filter((e) => e.visible !== false);

/** 一个 style 的画布预览描述（顺序固定：blend → 最大模糊 → 首个噪声/纹理 → 首个玻璃） */
export function effectPreviewFor(style: StyleSchema): EffectPreview {
  const out: EffectPreview = {};
  const blend = style.blendMode ? BLEND_TO_GCO[style.blendMode] : undefined;
  if (blend) out.blend = blend;

  let blur: number | undefined;
  for (const e of visibleEffects(style)) {
    if (e.kind === 'LAYER_BLUR') {
      blur = Math.max(blur ?? 0, e.radius ?? 12);
    } else if (e.kind === 'PROGRESSIVE_BLUR') {
      const avg = ((e.radius ?? 12) + (e.startRadius ?? 0)) / 2; // 与 compile.ts 均值口径一致
      blur = Math.max(blur ?? 0, avg);
    }
  }
  if (blur && blur > 0) out.blurRadius = Math.round(blur * 10) / 10;

  for (const e of visibleEffects(style)) {
    if (e.kind === 'NOISE' || e.kind === 'TEXTURE') {
      out.overlay = {
        mode: 'pattern',
        tileKey: `${e.kind}|${e.color ?? '#000000'}|${e.color2 ?? ''}|${e.radius ?? 6}`,
        cell: Math.max(2, Math.min(64, e.radius ?? 6)),
        opacity: Math.max(0.05, Math.min(1, (e.density ?? 0.4) * (e.opacity ?? 1))),
        color: e.color ?? '#000000',
        color2: e.color2 ?? (e.kind === 'TEXTURE' ? '#ffffff' : 'rgba(255,255,255,0.35)'),
      };
      break;
    }
    if (e.kind === 'GLASS') {
      out.overlay = {
        mode: 'tint',
        color: e.color ?? '#ffffff',
        opacity: Math.min(0.6, (0.2 + (e.radius ?? 12) / 60) * (e.opacity ?? 1)),
      };
      break;
    }
  }
  return out;
}

/* ============ 浏览器侧贴片生成（带缓存；node 环境返回 null 不参与单测） ============ */
const tileCache = new Map<string, HTMLCanvasElement | null>();

/** 确定性 PRNG（mulberry32）——同参同图，保证「所见」可复现（审计轨像素比对的前提） */
function prng(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 噪声/纹理贴片（2×cell 像素格），双色调点；确定性种子=tileKey */
export function noiseTileCanvas(tileKey: string, cell: number, color: string, color2: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const hit = tileCache.get(tileKey);
  if (hit !== undefined) return hit;
  const size = Math.max(4, cell * 2);
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d');
  if (!g) { tileCache.set(tileKey, null); return null; }
  g.clearRect(0, 0, size, size);
  const rnd = prng(tileKey);
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      g.fillStyle = rnd() > 0.5 ? color : color2;
      g.fillRect(x, y, 2, 2);
    }
  }
  tileCache.set(tileKey, cv);
  return cv;
}
