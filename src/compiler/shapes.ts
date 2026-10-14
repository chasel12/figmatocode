/** FR-16 形状几何 helper：画布（px）与出码（%）共用同一套角度口径，保证两端一致 */

const TAU = Math.PI * 2;

/** 正多边形点集（百分比 0-100）：顶点朝上、顺时针 */
export function polygonUnitPoints(count: number): [number, number][] {
  const n = Math.max(3, Math.round(count));
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * TAU) / n;
    pts.push([50 + 50 * Math.cos(a), 50 + 50 * Math.sin(a)]);
  }
  return pts;
}

/** 星形点集（百分比 0-100）：外点 50、内点 50*inner，交替、顶朝上 */
export function starUnitPoints(count: number, inner: number): [number, number][] {
  const n = Math.max(3, Math.min(60, Math.round(count)));
  const r = Math.max(0, Math.min(1, inner));
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const radius = i % 2 === 0 ? 50 : 50 * r;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push([50 + radius * Math.cos(a), 50 + radius * Math.sin(a)]);
  }
  return pts;
}

/** 单位点集 → clip-path polygon() 串（百分比） */
export function clipPathPolygon(pts: [number, number][]): string {
  return `polygon(${pts.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(', ')})`;
}

/** 单位点集 → 画布 px 点集（平铺 [x1,y1,x2,y2,...]） */
export function flattenPx(pts: [number, number][], w: number, h: number): number[] {
  const out: number[] = [];
  for (const [x, y] of pts) {
    out.push((x / 100) * w, (y / 100) * h);
  }
  return out;
}

export interface ArcSpec {
  /** 起始角 deg（0=右/东，顺时针） */
  start: number;
  /** 归一化后的扫角 deg（0,360] */
  sweep: number;
  /** 归一化起始角 [0,360) */
  from: number;
}

/** arcData → 归一化弧参数（end<start 跨 0 环绕；start==end 视为整圆 360） */
export function arcSpec(startingAngle: number, endingAngle: number): ArcSpec {
  let sweep = endingAngle - startingAngle;
  while (sweep <= 0) sweep += 360;
  const from = ((startingAngle % 360) + 360) % 360;
  return { start: from, sweep, from };
}
