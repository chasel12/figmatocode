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

/* ---------- P1-04：已提交路径的锚点二次编辑（d ⇄ 点集往返） ---------- */

/** d → 点集解析结果 */
export interface ParsedPath {
  points: PenDraftPoint[];
  closed: boolean;
  /** 解析是否完整（遇到不支持的指令 → false，调用方应放弃编辑而非改坏路径） */
  ok: boolean;
  /** 多子路径结构（仅 >1 子路径时给出——单路径保持无此键，消费面 toEqual 契约不变）。
   *  布尔结果（形状 Union 等）d 含多段 M…Z；重建必须按子路径分段，否则连环毁形。 */
  subpaths?: { start: number; closed: boolean }[];
}

const num = (s: string): number => Number(s);

/**
 * SVG path d → 可编辑点集（**仅支持本工具产出的子集**：M/L/C/Z）。
 *
 * 口径：本编译器产出的 d 全部由 `pointsToPathD` 生成，只用 M/L/C/Z 四种指令，
 * 故解析器只需覆盖该子集；遇到 Q/A/S/T 等外来指令立即返回 `ok:false`，
 * 调用方据此**禁用锚点编辑**（宁可不给编辑，也不要把路径改坏）。
 *
 * 控制点→手柄换算（`pointsToPathD` 的逆）：
 *   段 a→b 的 C 写成 `C c1 c2 b`，其中 c1 = a + a.h、c2 = b - b.h。
 *   故 a.h = c1 - a、b.h = b - c2。首段缺 c1 时按 a 点自身近似。
 */
export function parsePathD(d: string): ParsedPath {
  const out: PenDraftPoint[] = [];
  let closed = false;
  const subs: { start: number; closed: boolean }[] = [];
  if (!d || !d.trim()) return { points: out, closed, ok: true };

  const toks = d.trim().match(/[MLCZmlcz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  let i = 0;
  let cur: PenDraftPoint | null = null;

  const need = (n: number): number[] | null => {
    const vals: number[] = [];
    for (let k = 0; k < n; k += 1) {
      if (i >= toks.length) return null;
      const v = num(toks[i]);
      if (!Number.isFinite(v)) return null;
      vals.push(v);
      i += 1;
    }
    return vals;
  };

  while (i < toks.length) {
    const cmd = toks[i];
    if (!/^[MLCZmlcz]$/.test(cmd)) return { points: out, closed, ok: false };
    i += 1;
    const upper = cmd.toUpperCase();

    if (upper === 'Z') {
      closed = true;
      if (subs.length) subs[subs.length - 1].closed = true;
      continue;
    }
    if (upper === 'M') {
      const v = need(2);
      if (!v) return { points: out, closed, ok: false };
      cur = { x: r2(v[0]), y: r2(v[1]) };
      subs.push({ start: out.length, closed: false });
      out.push(cur);
      continue;
    }
    if (upper === 'L') {
      const v = need(2);
      if (!v) return { points: out, closed, ok: false };
      cur = { x: r2(v[0]), y: r2(v[1]) };
      out.push(cur);
      continue;
    }
    // C：c1 c2 b —— 反推两端手柄
    const v = need(6);
    if (!v) return { points: out, closed, ok: false };
    const [c1x, c1y, c2x, c2y, bx, by] = v;
    if (cur) {
      const hx = r2(c1x - cur.x);
      const hy = r2(c1y - cur.y);
      if (hx !== 0 || hy !== 0) {
        cur.hx = hx;
        cur.hy = hy;
      }
    }
    const next: PenDraftPoint = { x: r2(bx), y: r2(by) };
    const hx2 = r2(bx - c2x);
    const hy2 = r2(by - c2y);
    if (hx2 !== 0 || hy2 !== 0) {
      next.hx = hx2;
      next.hy = hy2;
    }
    cur = next;
    out.push(next);
  }

  // 多子路径（布尔结果等）：逐段做闭合归一（pointsToPathD 对闭合段显式写末→首段再 Z，
  // 全局首末去重对多段无效——sub1 首 ≠ subN 末），子路径信息随结果返回，重建按段处理。
  // 单路径行为与 toEqual 契约保持原样。
  if (subs.length > 1) {
    const ddPoints: PenDraftPoint[] = [];
    const ddSubs: { start: number; closed: boolean }[] = [];
    for (let s = 0; s < subs.length; s += 1) {
      const start = subs[s].start;
      const end = s + 1 < subs.length ? subs[s + 1].start : out.length;
      let seg = out.slice(start, end);
      if (subs[s].closed && seg.length > 1) {
        const f = seg[0];
        const l = seg[seg.length - 1];
        if (Math.abs(f.x - l.x) < 1e-6 && Math.abs(f.y - l.y) < 1e-6) seg = seg.slice(0, -1);
      }
      ddSubs.push({ start: ddPoints.length, closed: subs[s].closed });
      ddPoints.push(...seg);
    }
    return { points: ddPoints, closed, ok: true, subpaths: ddSubs };
  }

  // 收尾归一：`pointsToPathD(closed)` 会**显式写出末→首段再追加 Z**，
  // 故闭合路径解析出的末锚点与首锚点重合。此处删掉该冗余锚点，
  // 否则再次序列化会多加一段（往返不闭合）。
  if (closed && out.length > 1) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.abs(first.x - last.x) < 1e-6 && Math.abs(first.y - last.y) < 1e-6) out.pop();
  }

  return { points: out, closed, ok: true };
}

/** 点集 → 节点本地 d + 包围盒（锚点编辑后重算几何用；与 commitPen 同口径）。
 *  subpaths 给出且 >1 段时按子路径分段重建（布尔结果编辑毁形缺陷的正解）；缺省单路径行为不变。 */
export function rebuildFromPoints(
  points: PenDraftPoint[],
  closed: boolean,
  subpaths?: { start: number; closed: boolean }[],
): { d: string; bounds: { x: number; y: number; width: number; height: number } } {
  if (!points.length) return { d: '', bounds: { x: 0, y: 0, width: 0, height: 0 } };
  const b = draftBounds(points);
  const local = toLocalPoints(points, b.x, b.y);
  if (subpaths && subpaths.length > 1) {
    const parts: string[] = [];
    for (let s = 0; s < subpaths.length; s += 1) {
      const start = subpaths[s].start;
      const end = s + 1 < subpaths.length ? subpaths[s + 1].start : local.length;
      let seg = local.slice(start, end);
      const sc = subpaths[s].closed;
      if (sc && seg.length > 1) {
        const f = seg[0];
        const l = seg[seg.length - 1];
        if (Math.abs(f.x - l.x) < 1e-6 && Math.abs(f.y - l.y) < 1e-6) seg = seg.slice(0, -1);
      }
      const dseg = pointsToPathD(seg, sc);
      if (dseg) parts.push(dseg);
    }
    return { d: parts.join(' '), bounds: b };
  }
  return { d: pointsToPathD(local, closed), bounds: b };
}

/** 该 d 是否可编辑（全 M/L/C/Z 子集） */
export function isEditablePathD(d: string): boolean {
  return parsePathD(d).ok;
}
