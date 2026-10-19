/** FR-16 形状几何 helper：画布（px）与出码（%）共用同一套角度口径，保证两端一致 */

const TAU = Math.PI * 2;

/** 对称点集归一化到 [0,100]²：极点（顶角/边中点）触外接框四边——与 Figma「拖画即贴合选框」口径一致 */
function normalizeToBox(pts: [number, number][]): [number, number][] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const sx = maxX - minX > 0 ? 100 / (maxX - minX) : 1;
  const sy = maxY - minY > 0 ? 100 / (maxY - minY) : 1;
  return pts.map(([x, y]) => [(x - minX) * sx, (y - minY) * sy]);
}

/** 正多边形点集（百分比 0-100）：顶点朝上、顺时针、归一化到外接框 */
export function polygonUnitPoints(count: number): [number, number][] {
  const n = Math.max(3, Math.round(count));
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * TAU) / n;
    pts.push([50 + 50 * Math.cos(a), 50 + 50 * Math.sin(a)]);
  }
  return normalizeToBox(pts);
}

/** 星形点集（百分比 0-100）：外点 50、内点 50*inner，交替、顶朝上、归一化到外接框 */
export function starUnitPoints(count: number, inner: number): [number, number][] {
  const n = Math.max(3, Math.min(60, Math.round(count)));
  const r = Math.max(0, Math.min(1, inner));
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const radius = i % 2 === 0 ? 50 : 50 * r;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push([50 + radius * Math.cos(a), 50 + radius * Math.sin(a)]);
  }
  return normalizeToBox(pts);
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
