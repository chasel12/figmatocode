/** FR-2 智能吸附：纯函数，页面坐标系。单测覆盖，Canvas 只做接线。 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 对齐参考线（页面坐标）。axis=x 为竖线（左右对齐），axis=y 为横线（上下对齐）。 */
export interface GuideLine {
  axis: 'x' | 'y';
  /** x 轴竖线的横坐标 / y 轴纵线的纵坐标 */
  pos: number;
  /** 线段覆盖范围（另一轴的起止），用于绘制 */
  from: number;
  to: number;
  /** 与被拖元素的间距提示（正交方向上的空隙），无法计算时省略 */
  gap?: number;
}

export interface SnapResult {
  /** 建议的位移修正量（加到目标位置上） */
  dx: number;
  dy: number;
  guides: GuideLine[];
}

interface Edge {
  value: number;
  /** 该边所属矩形（用于画线范围与间距） */
  rect: Rect;
  kind: 'start' | 'center' | 'end';
}

function edges(rect: Rect, axis: 'x' | 'y'): Edge[] {
  if (axis === 'x') {
    return [
      { value: rect.x, rect, kind: 'start' },
      { value: rect.x + rect.width / 2, rect, kind: 'center' },
      { value: rect.x + rect.width, rect, kind: 'end' },
    ];
  }
  return [
    { value: rect.y, rect, kind: 'start' },
    { value: rect.y + rect.height / 2, rect, kind: 'center' },
    { value: rect.y + rect.height, rect, kind: 'end' },
  ];
}

/** 正交方向上的空隙（两矩形不重叠时的最小距离），重叠返回 null。 */
function orthogonalGap(moving: Rect, ref: Rect, axis: 'x' | 'y'): number | null {
  if (axis === 'x') {
    const gapTop = ref.y - (moving.y + moving.height);
    const gapBottom = moving.y - (ref.y + ref.height);
    if (gapTop > 0) return gapTop;
    if (gapBottom > 0) return gapBottom;
    return null;
  }
  const gapLeft = ref.x - (moving.x + moving.width);
  const gapRight = moving.x - (ref.x + ref.width);
  if (gapLeft > 0) return gapLeft;
  if (gapRight > 0) return gapRight;
  return null;
}

interface AxisSnap {
  delta: number;
  guide: GuideLine | null;
}

function snapAxis(
  moving: Rect,
  refs: Rect[],
  threshold: number,
  axis: 'x' | 'y',
): AxisSnap | null {
  let best: { diff: number; edge: Edge; ref: Edge } | null = null;
  const movingEdges = edges(moving, axis);
  for (const ref of refs) {
    for (const re of edges(ref, axis)) {
      for (const me of movingEdges) {
        const diff = Math.abs(me.value - re.value);
        if (diff <= threshold && (!best || diff < best.diff)) {
          best = { diff, edge: me, ref: re };
        }
      }
    }
  }
  if (!best) return null;
  const delta = best.ref.value - best.edge.value;
  // 参考线画在被吸附边（对齐后重合），范围覆盖两矩形正交跨度
  const guideAxis = axis;
  const pos = best.ref.value;
  const a = moving;
  const b = best.ref.rect;
  let from: number;
  let to: number;
  let gap: number | undefined;
  if (guideAxis === 'x') {
    from = Math.min(a.y, b.y);
    to = Math.max(a.y + a.height, b.y + b.height);
    const g = orthogonalGap(a, b, 'x');
    gap = g == null ? undefined : g;
  } else {
    from = Math.min(a.x, b.x);
    to = Math.max(a.x + a.width, b.x + b.width);
    const g = orthogonalGap(a, b, 'y');
    gap = g == null ? undefined : g;
  }
  return { delta, guide: { axis: guideAxis, pos, from, to, ...(gap != null ? { gap } : {}) } };
}

/**
 * 计算吸附修正与参考线。
 * @param moving  目标（被拖元素）建议位置的页面矩形
 * @param refs    参考矩形集（兄弟节点、父容器内容区等）
 * @param threshold 吸附阈值（页面坐标，调用方用 视口px/scale 换算）
 */
export function computeSnap(moving: Rect, refs: Rect[], threshold: number): SnapResult {
  const guides: GuideLine[] = [];
  const sx = snapAxis(moving, refs, threshold, 'x');
  const sy = snapAxis(moving, refs, threshold, 'y');
  if (sx) {
    guides.push(sx.guide!);
  }
  if (sy) {
    guides.push(sy.guide!);
  }
  return { dx: sx ? sx.delta : 0, dy: sy ? sy.delta : 0, guides };
}
