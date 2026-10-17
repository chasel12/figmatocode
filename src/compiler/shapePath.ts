/**
 * P1-05/P1-14 形状→路径单一事实源：编辑器布尔自动矢量化的几何来源，
 * 与出码侧「圆/多边形切 SVG 通道」共用同一 d（编辑器/出码/reference 三端一致）。
 *
 * 口径：
 * - 产出 d 限本工具 path 子集（M/L/C/Z，与 penCore 解析器口径一致），保证布尔结果可再编辑；
 * - 椭圆为四段三次贝塞尔（kappa 标准近似）；多边形/星形与 shapes.ts 单位点集同源；
 * - RECTANGLE 按直角路径化（圆角矩形路径化=报备项，不在 v1 范围）；
 * - OVAL 带弧参数（arcData 非整圆/有内径）时不可路径化（该形态出码走 conic-gradient 通道）。
 */
import type { BorderSchema, StyleSchema, UINode } from '../schema/types';
import { arcSpec, polygonUnitPoints, starUnitPoints } from './shapes';

const r2 = (n: number): string => String(Math.round(n * 100) / 100);
/** 圆四段贝塞尔近似的 kappa 常数 */
const KAPPA = 0.5522847498307936;

/** OVAL 是否处于「弧形态」（非整圆或缺内径；与 compile.ts arcShaped 判据同源） */
export function ovalHasArc(node: UINode): boolean {
  const a = node.style?.arcData;
  if (!a) return false;
  const s = arcSpec(a.startingAngle, a.endingAngle);
  return s.sweep < 360 || (a.innerRadius ?? 0) > 0;
}

/** 椭圆（w×h）→ 四段三次贝塞尔闭合路径（本地坐标；顺/逆时针与画布无关，仅填充用） */
export function ellipsePathD(w: number, h: number): string {
  const rx = w / 2;
  const ry = h / 2;
  const cx = rx;
  const cy = ry;
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return (
    `M ${r2(cx + rx)} ${r2(cy)} ` +
    `C ${r2(cx + rx)} ${r2(cy + ky)} ${r2(cx + kx)} ${r2(cy + ry)} ${r2(cx)} ${r2(cy + ry)} ` +
    `C ${r2(cx - kx)} ${r2(cy + ry)} ${r2(cx - rx)} ${r2(cy + ky)} ${r2(cx - rx)} ${r2(cy)} ` +
    `C ${r2(cx - rx)} ${r2(cy - ky)} ${r2(cx - kx)} ${r2(cy - ry)} ${r2(cx)} ${r2(cy - ry)} ` +
    `C ${r2(cx + kx)} ${r2(cy - ry)} ${r2(cx + rx)} ${r2(cy - ky)} ${r2(cx + rx)} ${r2(cy)} Z`
  );
}

/** 直角矩形（w×h）→ 本地路径 */
export function rectPathD(w: number, h: number): string {
  return `M 0 0 L ${r2(w)} 0 L ${r2(w)} ${r2(h)} L 0 ${r2(h)} Z`;
}

function unitPointsPathD(pts: [number, number][], w: number, h: number): string {
  const scaled = pts.map(([x, y]) => `${r2((x / 100) * w)} ${r2((y / 100) * h)}`);
  if (!scaled.length) return '';
  return `M ${scaled[0]} ${scaled.slice(1).map((p) => `L ${p}`).join(' ')} Z`;
}

/** 正多边形（percent 单位点集按 w×h 缩放）→ 本地路径 */
export function polygonPathD(count: number, w: number, h: number): string {
  return unitPointsPathD(polygonUnitPoints(count), w, h);
}

/** 星形（percent 单位点集按 w×h 缩放）→ 本地路径 */
export function starPathD(count: number, inner: number, w: number, h: number): string {
  return unitPointsPathD(starUnitPoints(count, inner), w, h);
}

/** 水平线段 → 本地路径（LINE 视角高=0） */
export function linePathD(w: number): string {
  return `M 0 0 L ${r2(w)} 0`;
}

export interface ShapePath {
  d: string;
  width: number;
  height: number;
}

/** 节点 → 本地矢量几何；不可转换（VECTOR/容器/文本/弧 OVAL/零尺寸）→ null */
export function shapePathData(node: UINode): ShapePath | null {
  const w = node.layout.width ?? 0;
  const h = node.layout.height ?? 0;
  if (!(w > 0)) return null;
  switch (node.type) {
    case 'RECTANGLE':
      if (!(h > 0)) return null;
      return { d: rectPathD(w, h), width: w, height: h };
    case 'OVAL':
      if (!(h > 0) || ovalHasArc(node)) return null;
      return { d: ellipsePathD(w, h), width: w, height: h };
    case 'POLYGON':
      if (!(h > 0)) return null;
      return { d: polygonPathD(node.style?.pointCount ?? 3, w, h), width: w, height: h };
    case 'STAR':
      if (!(h > 0)) return null;
      return { d: starPathD(node.style?.pointCount ?? 5, node.style?.innerRadius ?? 0.38, w, h), width: w, height: h };
    case 'LINE':
      return { d: linePathD(w), width: w, height: h };
    default:
      return null;
  }
}

/** P1-14：出码切 SVG 通道的节点集合（OVAL 无弧参数 / POLYGON / STAR） */
export function isShapeSvgNode(node: UINode): boolean {
  if (node.type === 'POLYGON' || node.type === 'STAR') return true;
  if (node.type !== 'OVAL') return false;
  return !ovalHasArc(node);
}

/** 布尔自动矢量化可参与集：VECTOR（含 d）+ 可路径化图形 */
export function isBooleanConvertible(node: UINode): boolean {
  if (node.type === 'VECTOR') return !!node.vector?.d?.trim();
  return !!shapePathData(node);
}

/**
 * path d 平移（限 M/L/C/Z 子集——本工具全部产出的口径）。
 * 布尔参集 flatten 到统一坐标系用；解析异常时原样返回（宁可不移，不改坏路径）。
 */
export function translatePathD(d: string, dx: number, dy: number): string {
  if ((!dx && !dy) || !d.trim()) return d;
  const toks = d.trim().match(/[MLCZmlcz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const out: string[] = [];
  let i = 0;
  let bad = false;
  const readNums = (n: number): number[] => {
    const v: number[] = [];
    for (let k = 0; k < n; k += 1) {
      if (i >= toks.length) {
        bad = true;
        return v;
      }
      const x = Number(toks[i]);
      if (!Number.isFinite(x)) {
        bad = true;
        return v;
      }
      v.push(x);
      i += 1;
    }
    return v;
  };
  while (i < toks.length && !bad) {
    const cmd = toks[i];
    i += 1;
    const upper = cmd.toUpperCase();
    if (upper === 'Z') {
      out.push('Z');
      continue;
    }
    if (upper === 'M' || upper === 'L') {
      const v = readNums(2);
      if (v.length < 2) break;
      out.push(`${upper} ${r2(v[0] + dx)} ${r2(v[1] + dy)}`);
      continue;
    }
    if (upper === 'C') {
      const v = readNums(6);
      if (v.length < 6) break;
      out.push(
        `C ${r2(v[0] + dx)} ${r2(v[1] + dy)} ${r2(v[2] + dx)} ${r2(v[3] + dy)} ${r2(v[4] + dx)} ${r2(v[5] + dy)}`,
      );
      continue;
    }
    bad = true;
  }
  return bad ? d : out.join(' ');
}

/** 首可见填充色（SOLID 首层色 / 渐变首色 / 背景纯色）；无 → undefined */
export function shapeFillOf(style: StyleSchema | undefined): string | undefined {
  const f0 = (style?.fills ?? []).find((x) => x.visible !== false);
  if (f0) {
    if (f0.type === 'SOLID') return f0.color ?? undefined;
    return f0.stops?.[0]?.color ?? f0.color ?? undefined;
  }
  const bg = style?.background;
  if (bg && !/gradient\(/.test(bg)) return bg;
  return undefined;
}

/** 单宽描边归一（SVG stroke 无分边语义；width 缺省时取 widths 首个有效宽）；无有效宽 → undefined */
export function shapeStrokeOf(border: BorderSchema | undefined): BorderSchema | undefined {
  if (!border) return undefined;
  const w0 = border.width ?? border.widths?.find((w) => w > 0) ?? 0;
  if (!(w0 > 0)) return undefined;
  return border.width === w0 ? border : { ...border, width: w0 };
}
