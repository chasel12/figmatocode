/**
 * FR-21 钢笔核心（Wave2 主线内联实现）：画布点集 → SVG path d。
 * 纯函数、无 Konva/React 依赖，供画布预览与收笔出节点共用；单测 tests/fr21-pen.test.ts 锁定。
 */

/** 钢笔草稿点：锚点绝对坐标（page 坐标）+ 出锚手柄偏移（对称贝塞尔；缺省=直线段） */
export interface PenDraftPoint {
  x: number;
  y: number;
  /** 手柄偏移 dx（锚点 → 控制点）；缺省 0 */
  hx?: number;
  /** 手柄偏移 dy；缺省 0 */
  hy?: number;
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * 点集 → path d。
 * - 0 点：''；1 点：'M x y'（占位单点）；
 * - 全直线段：M + L…；任一段含手柄：该段用 C（前控制点=上一点手柄镜像，后控制点=当前点手柄反向）；
 * - closed：追加 Z（Figma 钢笔闭合语义：末点到首点再一段）。
 */
export function pointsToPathD(points: PenDraftPoint[], closed: boolean): string {
  if (!points.length) return '';
  const first = points[0];
  let d = `M ${r2(first.x)} ${r2(first.y)}`;
  if (points.length === 1) return closed ? `${d} Z` : d;

  const seg = (a: PenDraftPoint, b: PenDraftPoint): void => {
    const aHas = !!(a.hx || a.hy);
    const bHas = !!(b.hx || b.hy);
    if (!aHas && !bHas) {
      d += ` L ${r2(b.x)} ${r2(b.y)}`;
      return;
    }
    // 出锚手柄：a 的 (hx,hy) 为离开 a 的控制方向；b 的手柄反向指向控制点（对称贝塞尔近似，Figma 编辑器后续可独立手柄）
    const c1x = a.x + (a.hx ?? 0);
    const c1y = a.y + (a.hy ?? 0);
    const c2x = b.x - (b.hx ?? 0);
    const c2y = b.y - (b.hy ?? 0);
    d += ` C ${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(b.x)} ${r2(b.y)}`;
  };

  for (let i = 1; i < points.length; i += 1) seg(points[i - 1], points[i]);
  if (closed && points.length > 2) {
    seg(points[points.length - 1], first);
    d += ' Z';
  }
  return d;
}

/** 草稿包围盒（含手柄外扩 8px 余量），供收笔时定 layout x/y/width/height */
export function draftBounds(points: PenDraftPoint[]): { x: number; y: number; width: number; height: number } {
  const M = 8;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    x0 = Math.min(x0, p.x + (p.hx ?? 0) - M, p.x - (p.hx ?? 0) - M);
    y0 = Math.min(y0, p.y + (p.hy ?? 0) - M, p.y - (p.hy ?? 0) - M);
    x1 = Math.max(x1, p.x + (p.hx ?? 0) + M, p.x - (p.hx ?? 0) + M);
    y1 = Math.max(y1, p.y + (p.hy ?? 0) + M, p.y - (p.hy ?? 0) + M);
  }
  if (!points.length) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: x0, y: y0, width: Math.max(x1 - x0, 1), height: Math.max(y1 - y0, 1) };
}

/** 绝对坐标点集 → 节点本地坐标（相对 bounds 左上角），出码 d 与画布共享同一形状 */
export function toLocalPoints(points: PenDraftPoint[], ox: number, oy: number): PenDraftPoint[] {
  return points.map((p) => ({ x: r2(p.x - ox), y: r2(p.y - oy), hx: p.hx, hy: p.hy }));
}
