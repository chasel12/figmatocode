/**
 * FR-49 矢量出码：VECTOR 节点 → 内联 <svg>。
 *
 * 口径（docs/schema-decisions.md §四.1）：`vector.d` 直接进 SVG `<path>`，
 * CSS 侧 `clip-path: path()` 仅作回退注记——SVG 是矢量出码的唯一权威表达。
 * 确定性：同一 VectorData 两次序列化字节一致（单测锁定，无时间戳/随机 id）。
 */
import type { BorderSchema, VectorData, VectorNode } from '../schema/types';
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
  /**
   * **渲染尺寸**（缺省 = viewBox 尺寸，即 `data.width/height`）。
   *
   * 为什么要把两者分开：图标路径是按 24×24 坐标系画的，而界面里需要 14/16/22px。
   * 原来 `width`/`viewBox` 绑成同一个值，于是「缩小图标」会把 viewBox 一起缩到 14，
   * 24 坐标系的路径被裁掉一大半。分开之后 viewBox 恒等于路径坐标系，渲染尺寸由布局决定。
   */
  renderSize?: { width: number; height: number };
  /**
   * 描边宽度按缩放比例**反算**（`stroke-width = 声明值 / scale`），保持**视觉**粗细恒定。
   *
   * SVG 的 stroke 定义在 viewBox 坐标系里，会跟着缩放走：
   * 24→14 时 stroke 2 视觉变成 1.17（偏细），24→48 时视觉变成 4（又粗又糊）。
   * 反算后两头都回到 2px。这正是原来「锁死 24 防止放大变糊」想解决的问题——
   * 反算能同时解决「不能缩小」和「放大会糊」，比锁死更优。
   */
  strokeScale?: boolean;
}

/**
 * VectorData → 内联 <svg> 串。
 * d 为空/空白 → 返回空串（占位节点不产物流，与 SLICE 跳过同口径）。
 *
 * `width`/`height` 参数语义是「布局尺寸」；viewBox 取 `data.width/height`（路径坐标系），
 * 渲染尺寸取 `options.renderSize ?? data.width/height`。
 */
export function svgOfVector(
  data: VectorData | undefined,
  width: number,
  height: number,
  options: VectorSvgOptions = {},
): string {
  if (!hasVectorPath(data)) return '';
  const d = data as VectorData;
  /** viewBox：路径自身的坐标系 */
  const vbW = Math.max(d.width ?? width, 0);
  const vbH = Math.max(d.height ?? height, 0);
  /** 渲染尺寸：布局决定的盒子大小 */
  const outW = Math.max(options.renderSize?.width ?? vbW, 0);
  const outH = Math.max(options.renderSize?.height ?? vbH, 0);
  const scale = vbW > 0 && outW > 0 ? outW / vbW : 1;
  const fillRule = d.fillRule === 'evenodd' ? 'evenodd' : 'nonzero';

  // 描边：有 border 才出 stroke 三件套；cap/join/dash 等矢量专有属性附后
  const hasStroke = !!options.border;
  const fill = options.fill ?? 'none';
  /**
   * stroke 反算只在**有缩放**且调用方要求时生效；scale=1 时与原行为逐字节一致，
   * 所以默认路径（图标 24×24）零影响。
   */
  const strokeWidth =
    hasStroke && options.strokeScale && scale > 0 && scale !== 1
      ? options.border!.width / scale
      : (options.border?.width ?? 0);
  const strokeBits = hasStroke
    ? ` stroke="${escapeHtml(options.border!.color)}" stroke-width="${num(strokeWidth)}" ${strokeAttrs(options.border, options.dash)}`
    : '';

  const cls = options.className ? ` class="${escapeHtml(options.className)}"` : '';
  return (
    `<svg${cls} width="${num(outW)}" height="${num(outH)}" viewBox="0 0 ${num(vbW)} ${num(vbH)}" ` +
    `xmlns="http://www.w3.org/2000/svg" fill="${escapeHtml(fill)}" fill-rule="${fillRule}"${strokeBits}>` +
    `<path d="${escapeHtml(d.d)}" /></svg>`
  );
}

/**
 * 节点级矢量出码：**五端（html / prototype / reference / tsx-emitter / vue）必须都走这里**。
 *
 * 唯一职责是决定「渲染尺寸」：图标路径按 24×24 坐标系绘制，界面里却要 14/16/22px。
 * 抽成一个函数而不是各端各写一遍，是因为漏改一端就会出现
 * 「HTML 出 14px 图标、React 出 24px」的跨端不一致——而这种不一致很难在单端测试里发现。
 *
 * 只对**图标**（viewBox 恰为 24×24）启用缩放：编辑器里手绘的矢量 viewBox 可能是任意尺寸，
 * 改它的渲染尺寸会动到既有像素基线。
 */
export function svgOfNodeVector(node: VectorNode, cls?: string): string {
  const isIcon = node.vector?.width === 24 && node.vector?.height === 24;
  const w = node.layout.width;
  const h = node.layout.height;
  const scaled = isIcon && w != null && h != null && (w !== 24 || h !== 24);
  return svgOfVector(node.vector, w ?? 0, h ?? 0, {
    className: cls,
    border: node.style?.border,
    fill: node.style?.background,
    ...(scaled ? { renderSize: { width: w, height: h }, strokeScale: true } : {}),
  });
}

/**
 * FR-49 CSS 回退注记：`clip-path: path()`。
 * 仅当调用方需要纯 CSS 承载（无 SVG 能力）时使用；不写入默认出码路径。
 */
export function vectorClipPathFallback(data: VectorData | undefined): string | null {
  if (!hasVectorPath(data)) return null;
  return `path('${(data as VectorData).d}')`;
}
