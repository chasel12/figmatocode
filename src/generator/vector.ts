/**
 * FR-49 矢量出码：VECTOR 节点 → 内联 <svg>。
 *
 * 口径（docs/schema-decisions.md §四.1）：`vector.d` 直接进 SVG `<path>`，
 * CSS 侧 `clip-path: path()` 仅作回退注记——SVG 是矢量出码的唯一权威表达。
 * 确定性：同一 VectorData 两次序列化字节一致（单测锁定，无时间戳/随机 id）。
 */
import type { BorderSchema, VectorData } from '../schema/types';
import { escapeHtml } from './html';

/** path d 有效性：非空白即有效（占位 'M 0 0' 也算，由调用方按需跳过） */
export function hasVectorPath(data: VectorData | undefined): boolean {
  return !!data && !!data.d && data.d.trim().length > 0;
}

const num = (n: number): string => String(Math.round(n * 100) / 100);

/**
 * 描边属性串（FR-18 矢量侧字段：cap/join/miterLimit/dash）。
 * CSS 无 cap/join 语义，仅 SVG 能表达，故这些字段在矢量出码才真正生效。
 */
function strokeAttrs(border: BorderSchema | undefined, dash?: [number, number]): string {
  const parts: string[] = [];
  const cap =
    border?.cap === 'ROUND' ? 'round' : border?.cap === 'SQUARE' ? 'square' : border?.cap === 'NONE' ? 'butt' : null;
  const join =
    border?.join === 'ROUND' ? 'round' : border?.join === 'BEVEL' ? 'bevel' : border?.join === 'MITER' ? 'miter' : null;
  if (cap) parts.push(`stroke-linecap="${cap}"`);
  if (join) parts.push(`stroke-linejoin="${join}"`);
  if (border?.miterLimit != null) parts.push(`stroke-miterlimit="${num(border.miterLimit)}"`);
  // dash：border.dash 优先，其次 options.dash（FR-18 两处来源）
  const d = border?.dash ?? dash;
  if (d && (d[0] > 0 || d[1] > 0)) parts.push(`stroke-dasharray="${num(d[0])} ${num(d[1])}"`);
  return parts.join(' ');
}

export interface VectorSvgOptions {
  /** 填充色（缺省 none——纯描边路径是 Figma 钢笔默认） */
  fill?: string;
  border?: BorderSchema;
  /** 额外样式（dash 回退来源） */
  dash?: [number, number];
  /** 附加 class（出码时挂语义 class） */
  className?: string;
}

/**
 * VectorData → 内联 <svg> 串。
 * d 为空/空白 → 返回空串（占位节点不产物流，与 SLICE 跳过同口径）。
 * width/height 参数为渲染尺寸（缺省已在调用侧取 layout）。
 */
export function svgOfVector(
  data: VectorData | undefined,
  width: number,
  height: number,
  options: VectorSvgOptions = {},
): string {
  if (!hasVectorPath(data)) return '';
  const d = data as VectorData;
  const w = Math.max(d.width ?? width, 0);
  const h = Math.max(d.height ?? height, 0);
  const fillRule = d.fillRule === 'evenodd' ? 'evenodd' : 'nonzero';

  // 描边：有 border 才出 stroke 三件套；cap/join/dash 等矢量专有属性附后
  const hasStroke = !!options.border;
  const fill = options.fill ?? 'none';
  const strokeBits = hasStroke
    ? ` stroke="${escapeHtml(options.border!.color)}" stroke-width="${num(options.border!.width)}" ${strokeAttrs(options.border, options.dash)}`
    : '';

  const cls = options.className ? ` class="${escapeHtml(options.className)}"` : '';
  return (
    `<svg${cls} width="${num(w)}" height="${num(h)}" viewBox="0 0 ${num(w)} ${num(h)}" ` +
    `xmlns="http://www.w3.org/2000/svg" fill="${escapeHtml(fill)}" fill-rule="${fillRule}"${strokeBits}>` +
    `<path d="${escapeHtml(d.d)}" /></svg>`
  );
}

/**
 * FR-49 CSS 回退注记：`clip-path: path()`。
 * 仅当调用方需要纯 CSS 承载（无 SVG 能力）时使用；不写入默认出码路径。
 */
export function vectorClipPathFallback(data: VectorData | undefined): string | null {
  if (!hasVectorPath(data)) return null;
  return `path('${(data as VectorData).d}')`;
}
