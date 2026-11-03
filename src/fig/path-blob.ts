/**
 * SVG path `d` → **Figma 的 `Path.commandsBlob` 二进制**。
 *
 * 为什么需要：AST 的 VECTOR 节点只存 `vector.d`（SVG path 字符串），而 `.fig` 里矢量的
 * 渲染几何是 `NodeChange.fillGeometry[].commandsBlob` —— 一个 blob 索引，指向紧凑编码的
 * 命令流。不写它，Figma 里图标就是**空框**（本项目长期遗留的那个坑）。
 *
 * 编码格式（从真实 Figma 文件反推，`gold-preview.fig` / `variable-override-precedence.fig`）：
 *
 * ```
 * 0x00                        Close       （无参数）
 * 0x01  x:f32  y:f32          MoveTo
 * 0x02  x:f32  y:f32          LineTo
 * 0x04  c1x c1y c2x c2y x y   CubicTo     （6 个 f32）
 * ```
 *
 * 反证：一个 40×40 圆角矩形的 blob 恰好 46 字节 =
 * `01 (0,0) / 02 (40,0) / 02 (40,40) / 02 (0,40) / 02 (0,0) / 00`，逐字节对上。
 * 真实文件里出现过的命令码只有 `0/1/2/4`，没有 quad（`Q` 一律升阶成 cubic）。
 *
 * 坐标口径：**节点本地系**（0..size）。SVG 图标按 `viewBox`（通常 24×24）绘制，
 * 所以调用方要传 `scale = size / viewBox` 把路径缩到盒子尺寸。
 */

/** Figma path 命令（`type` 就是命令码） */
export interface FigmaPathCommand {
  type: 0 | 1 | 2 | 4;
  /** 按 type 决定的坐标个数：Close 0 / Move·Line 2 / Cubic 6 */
  pts: number[];
}

/** 解析后的路径：命令流 + 是否 evenodd 填充 */
export interface FigmaPath {
  commands: FigmaPathCommand[];
  evenOdd: boolean;
}

/* =============================================================
 * 1. 分词：`d` → 命令 + 参数（处理隐式重复与省略分隔符）
 * ============================================================= */

const ARG_COUNT: Record<string, number> = {
  M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0,
};

interface RawCommand {
  cmd: string;
  args: number[];
}

/** SVG 数字：`-1.5` / `.5` / `1e-3`；`1-2` 这种省略分隔符也认 */
const NUMBER_RE = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/y;

function readNumber(d: string, pos: number): { value: number; next: number } | null {
  NUMBER_RE.lastIndex = pos;
  const m = NUMBER_RE.exec(d);
  if (!m) return null;
  return { value: Number(m[0]), next: NUMBER_RE.lastIndex };
}

/** 跳过空白与逗号 */
function skipSep(d: string, pos: number): number {
  let i = pos;
  while (i < d.length && (d[i] === ' ' || d[i] === '\t' || d[i] === '\n' || d[i] === '\r' || d[i] === ',')) i++;
  return i;
}

/**
 * 分词。一条命令字母后可以跟多组参数（隐式重复），例如 `M0 0 10 10` 等价于 `M0 0 L10 10`。
 * `M` 的后续组按 `L` 处理（SVG 规范），这里直接在分词阶段就改写成 `L`。
 */
export function tokenizeSvgPath(d: string): RawCommand[] {
  const out: RawCommand[] = [];
  let i = 0;
  while (i < d.length) {
    i = skipSep(d, i);
    if (i >= d.length) break;
    const ch = d[i];
    if (!/[A-Za-z]/.test(ch)) {
      // 裸数字（上一条命令的隐式重复，但上一条已收尾）：跳过，避免死循环
      i++;
      continue;
    }
    const upper = ch.toUpperCase();
    if (!(upper in ARG_COUNT)) {
      i++;
      continue;
    }
    i++;
    const count = ARG_COUNT[upper];
    if (count === 0) {
      out.push({ cmd: upper, args: [] });
      continue;
    }
    let group = 0;
    while (true) {
      const args: number[] = [];
      let p = skipSep(d, i);
      let ok = true;
      for (let k = 0; k < count; k++) {
        const n = readNumber(d, p);
        if (!n) {
          ok = false;
          break;
        }
        args.push(n.value);
        p = skipSep(d, n.next);
      }
      if (!ok || args.length < count) break;
      i = p;
      /**
       * M 之后的多组坐标是 L —— 但**大小写必须跟着原始命令走**：
       * `m` 的后续组是相对 `l`，不是绝对 `L`。早先这里统一用大写，于是 `l12-2`
       * 被当成绝对坐标 (12,-2)，图标整体塌到左上角。
       */
      const keep = ch === ch.toUpperCase() ? upper : ch.toLowerCase();
      out.push({ cmd: group > 0 && upper === 'M' ? (ch === 'm' ? 'l' : 'L') : keep, args });
      group++;
      // 下一组必须紧接数字，否则结束
      const save = skipSep(d, i);
      if (!readNumber(d, save)) {
        i = save;
        break;
      }
    }
  }
  return out;
}

/* =============================================================
 * 2. 弧 → 三次贝塞尔（SVG 规范 F.6.5）
 * ============================================================= */

type Cubic = [number, number, number, number, number, number];

function arcToCubics(
  x1: number, y1: number,
  rxIn: number, ryIn: number, phiDeg: number,
  largeArc: number, sweep: number,
  x2: number, y2: number,
): Cubic[] {
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]]; // 退化：当直线
  if (x1 === x2 && y1 === y2) return []; // 起止重合：不画

  const phi = (phiDeg * Math.PI) / 180;
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);

  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cosP * dx2 + sinP * dy2;
  const y1p = -sinP * dx2 + cosP * dy2;

  // 半径太小则按规范放大
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }

  const sign = largeArc === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = sign * Math.sqrt(Math.max(0, den === 0 ? 0 : num / den));
  const cxp = (coef * (rx * y1p)) / ry;
  const cyp = (coef * -(ry * x1p)) / rx;
  const cx = cosP * cxp - sinP * cyp + (x1 + x2) / 2;
  const cy = sinP * cxp + cosP * cyp + (y1 + y2) / 2;

  const angle = (ux: number, uy: number, vx: number, vy: number): number => {
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.min(1, Math.max(-1, len === 0 ? 0 : (ux * vx + uy * vy) / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;
  const theta1 = angle(1, 0, ux, uy);
  let dTheta = angle(ux, uy, vx, vy);
  if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI;
  if (sweep && dTheta < 0) dTheta += 2 * Math.PI;

  const segs = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const delta = dTheta / segs;
  const k = (4 / 3) * Math.tan(delta / 4);

  const map = (px: number, py: number): [number, number] => [
    cx + rx * cosP * px - ry * sinP * py,
    cy + rx * sinP * px + ry * cosP * py,
  ];

  const out: Cubic[] = [];
  let t = theta1;
  for (let i = 0; i < segs; i++) {
    const t2 = t + delta;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    const cosT2 = Math.cos(t2);
    const sinT2 = Math.sin(t2);
    const c1 = map(cosT - k * sinT, sinT + k * cosT);
    const c2 = map(cosT2 + k * sinT2, sinT2 - k * cosT2);
    const end = map(cosT2, sinT2);
    out.push([c1[0], c1[1], c2[0], c2[1], end[0], end[1]]);
    t = t2;
  }
  return out;
}

/** 二次 → 三次升阶：c1 = p0 + 2/3(q−p0)，c2 = p1 + 2/3(q−p1) */
function quadToCubic(x0: number, y0: number, qx: number, qy: number, x: number, y: number): Cubic {
  return [
    x0 + (2 / 3) * (qx - x0),
    y0 + (2 / 3) * (qy - y0),
    x + (2 / 3) * (qx - x),
    y + (2 / 3) * (qy - y),
    x,
    y,
  ];
}

/* =============================================================
 * 3. 转换：分词结果 → Figma 命令流
 * ============================================================= */

/**
 * SVG path `d` → Figma 命令流。
 *
 * 不认识的命令跳过而不抛错：图标是外部素材，宁可少画一笔也不要让整页导出失败。
 * 返回 `null` = 这条 d 没有可画的几何（空串 / 只有 Move）。
 */
export function parseSvgPath(d: string, scaleX = 1, scaleY = 1): FigmaPath | null {
  if (!d || !d.trim()) return null;
  const raws = tokenizeSvgPath(d);
  const commands: FigmaPathCommand[] = [];

  const sx = (v: number): number => v * scaleX;
  const sy = (v: number): number => v * scaleY;

  let cur = { x: 0, y: 0 };
  let startPt = { x: 0, y: 0 };
  let lastCubic: { x: number; y: number } | null = null;
  let lastQuad: { x: number; y: number } | null = null;

  for (const { cmd, args } of raws) {
    const rel = cmd !== cmd.toUpperCase();
    const upper = cmd.toUpperCase();
    if (upper === 'M') {
      const x = rel ? cur.x + args[0] : args[0];
      const y = rel ? cur.y + args[1] : args[1];
      commands.push({ type: 1, pts: [sx(x), sy(y)] });
      cur = { x, y };
      startPt = { x, y };
      lastCubic = lastQuad = null;
    } else if (upper === 'L') {
      const x = rel ? cur.x + args[0] : args[0];
      const y = rel ? cur.y + args[1] : args[1];
      commands.push({ type: 2, pts: [sx(x), sy(y)] });
      cur = { x, y };
      lastCubic = lastQuad = null;
    } else if (upper === 'H') {
      const x = rel ? cur.x + args[0] : args[0];
      commands.push({ type: 2, pts: [sx(x), sy(cur.y)] });
      cur = { x, y: cur.y };
      lastCubic = lastQuad = null;
    } else if (upper === 'V') {
      const y = rel ? cur.y + args[0] : args[0];
      commands.push({ type: 2, pts: [sx(cur.x), sy(y)] });
      cur = { x: cur.x, y };
      lastCubic = lastQuad = null;
    } else if (upper === 'C') {
      const x1 = rel ? cur.x + args[0] : args[0];
      const y1 = rel ? cur.y + args[1] : args[1];
      const x2 = rel ? cur.x + args[2] : args[2];
      const y2 = rel ? cur.y + args[3] : args[3];
      const x = rel ? cur.x + args[4] : args[4];
      const y = rel ? cur.y + args[5] : args[5];
      commands.push({ type: 4, pts: [sx(x1), sy(y1), sx(x2), sy(y2), sx(x), sy(y)] });
      lastCubic = { x: x2, y: y2 };
      lastQuad = null;
      cur = { x, y };
    } else if (upper === 'S') {
      const x1 = lastCubic ? 2 * cur.x - lastCubic.x : cur.x;
      const y1 = lastCubic ? 2 * cur.y - lastCubic.y : cur.y;
      const x2 = rel ? cur.x + args[0] : args[0];
      const y2 = rel ? cur.y + args[1] : args[1];
      const x = rel ? cur.x + args[2] : args[2];
      const y = rel ? cur.y + args[3] : args[3];
      commands.push({ type: 4, pts: [sx(x1), sy(y1), sx(x2), sy(y2), sx(x), sy(y)] });
      lastCubic = { x: x2, y: y2 };
      lastQuad = null;
      cur = { x, y };
    } else if (upper === 'Q') {
      const qx = rel ? cur.x + args[0] : args[0];
      const qy = rel ? cur.y + args[1] : args[1];
      const x = rel ? cur.x + args[2] : args[2];
      const y = rel ? cur.y + args[3] : args[3];
      const c = quadToCubic(cur.x, cur.y, qx, qy, x, y);
      commands.push({ type: 4, pts: [sx(c[0]), sy(c[1]), sx(c[2]), sy(c[3]), sx(c[4]), sy(c[5])] });
      lastQuad = { x: qx, y: qy };
      lastCubic = null;
      cur = { x, y };
    } else if (upper === 'T') {
      const prevQ: { x: number; y: number } | null = lastQuad;
      const qx: number = prevQ ? 2 * cur.x - prevQ.x : cur.x;
      const qy: number = prevQ ? 2 * cur.y - prevQ.y : cur.y;
      const x = rel ? cur.x + args[0] : args[0];
      const y = rel ? cur.y + args[1] : args[1];
      const c = quadToCubic(cur.x, cur.y, qx, qy, x, y);
      commands.push({ type: 4, pts: [sx(c[0]), sy(c[1]), sx(c[2]), sy(c[3]), sx(c[4]), sy(c[5])] });
      lastQuad = { x: qx, y: qy };
      lastCubic = null;
      cur = { x, y };
    } else if (upper === 'A') {
      const x = rel ? cur.x + args[5] : args[5];
      const y = rel ? cur.y + args[6] : args[6];
      for (const c of arcToCubics(cur.x, cur.y, args[0], args[1], args[2], args[3] ? 1 : 0, args[4] ? 1 : 0, x, y)) {
        commands.push({ type: 4, pts: [sx(c[0]), sy(c[1]), sx(c[2]), sy(c[3]), sx(c[4]), sy(c[5])] });
      }
      lastCubic = lastQuad = null;
      cur = { x, y };
    } else if (upper === 'Z') {
      /**
       * 闭合前把「回到起点」写成显式 LineTo，再 Close。
       *
       * 真实 Figma 文件就是这么存的（矩形是 `M / L / L / L / L(回到起点) / Close`，
       * 46 字节逐字节对得上）。只写 Close 几何等价，但少一条线段会让
       * Figma 侧的「编辑矢量节点」看到的顶点数不同 —— 对齐真实形态没有代价。
       */
      if (Math.abs(cur.x - startPt.x) > 1e-6 || Math.abs(cur.y - startPt.y) > 1e-6) {
        commands.push({ type: 2, pts: [sx(startPt.x), sy(startPt.y)] });
      }
      commands.push({ type: 0, pts: [] });
      cur = { ...startPt };
      lastCubic = lastQuad = null;
    }
  }

  if (!commands.some((c) => c.type === 2 || c.type === 4)) return null;
  return { commands, evenOdd: false };
}

/* =============================================================
 * 4. 编码
 * ============================================================= */

/** 命令流 → Figma `Path.commandsBlob` 字节（小端 f32） */
export function encodeFigmaPath(commands: FigmaPathCommand[]): Uint8Array {
  let size = 0;
  for (const c of commands) size += 1 + c.pts.length * 4;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  let off = 0;
  for (const c of commands) {
    out[off++] = c.type;
    for (const v of c.pts) {
      view.setFloat32(off, v, true);
      off += 4;
    }
  }
  return out;
}

/** 便捷封装：SVG path `d` → blob 字节（缩放 + 编码） */
export function svgPathToBlob(d: string, scaleX = 1, scaleY = 1): Uint8Array | null {
  const parsed = parseSvgPath(d, scaleX, scaleY);
  if (!parsed) return null;
  return encodeFigmaPath(parsed.commands);
}

/**
 * 矩形 / 圆角矩形 / frame 的填充几何（节点本地系，`0..w × 0..h`）。
 *
 * **圆角不进几何**：真实文件反证 —— `slots.fig` 里 208×40 的 `ROUNDED_RECTANGLE`，
 * 它的 `fillGeometry` blob 恰好 46 字节、命令流是 `M0,0 L208,0 L208,40 L0,40 L0,0 Z`，
 * **一条圆弧都没有**。圆角由节点上的 `cornerRadius` 字段单独表达，Figma 渲染时自己倒角。
 * 所以这里四种矩形共用一个矩形命令流，不需要 cubic。
 *
 * 为什么要给矩形也写几何：真实文件的 FRAME / RECTANGLE / ROUNDED_RECTANGLE
 * **100% 都带 `fillGeometry`**。早先只有 VECTOR 写了这段，结果 `.fig` 里两百多个
 * 形状只有十几个有几何 —— Figma 打开后整屏空白，而自家编辑器不受影响（它读 AST）。
 *
 * 长度固定 46 字节：`01 (0,0) / 02 (w,0) / 02 (w,h) / 02 (0,h) / 02 (0,0) / 00`
 * —— 5 条命令 ×9 字节 + 1 字节 Close，与真实文件逐字节一致（含 Z 前那条回起点的 LineTo）。
 */
export function rectBlob(w: number, h: number): Uint8Array {
  return encodeFigmaPath([
    { type: 1, pts: [0, 0] },
    { type: 2, pts: [w, 0] },
    { type: 2, pts: [w, h] },
    { type: 2, pts: [0, h] },
    { type: 2, pts: [0, 0] },
    { type: 0, pts: [] },
  ]);
}

/**
 * 椭圆的填充几何：4 段三次贝塞尔（标准 `k = 0.5522847498` 圆近似）。
 *
 * **没有真实样本可对**：手上的 `slots.fig` / `variable-override-precedence.fig` 里
 * 一个 `ELLIPSE` 都没有，所以这条是按通用贝塞尔圆近似写的，不像 `rectBlob` 那样
 * 有逐字节反证。写它是因为不写的话 Figma 里所有圆形（头像、圆点、进度环）
 * 都是空框 —— 空着一定错，近似至少能渲染。
 */
export function ellipseBlob(w: number, h: number): Uint8Array {
  const rx = w / 2;
  const ry = h / 2;
  const cx = rx;
  const cy = ry;
  const kx = rx * 0.5522847498;
  const ky = ry * 0.5522847498;
  return encodeFigmaPath([
    { type: 1, pts: [cx, 0] },
    { type: 4, pts: [cx + kx, 0, w, cy - ky, w, cy] },
    { type: 4, pts: [w, cy + ky, cx + kx, h, cx, h] },
    { type: 4, pts: [cx - kx, h, 0, cy + ky, 0, cy] },
    { type: 4, pts: [0, cy - ky, cx - kx, 0, cx, 0] },
    { type: 0, pts: [] },
  ]);
}

/* =============================================================
 * 5. 反向：blob → SVG path `d`（导入侧用）
 * ============================================================= */

/** 坐标保留 3 位小数：f32 反解出来是 `12.000000119`，直接拼进 d 会让往返比对永远不等 */
const fmt = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

/**
 * Figma `Path.commandsBlob` 字节 → SVG path `d`。
 *
 * 用于导入：`.fig` 里 VECTOR 的几何在 `fillGeometry`，AST 要的是 `vector.d`。
 * 遇到不认识的命令码就停止（返回已解出的部分）—— 宁可少画，不要产出乱码路径。
 */
export function figmaBlobToSvgPath(bytes: Uint8Array): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const parts: string[] = [];
  let off = 0;
  while (off < bytes.length) {
    const code = bytes[off];
    if (code === 0) {
      parts.push('Z');
      off += 1;
    } else if (code === 1 || code === 2) {
      if (off + 9 > bytes.length) break;
      const x = view.getFloat32(off + 1, true);
      const y = view.getFloat32(off + 5, true);
      parts.push(`${code === 1 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`);
      off += 9;
    } else if (code === 4) {
      if (off + 25 > bytes.length) break;
      const v: number[] = [];
      for (let i = 0; i < 6; i++) v.push(view.getFloat32(off + 1 + i * 4, true));
      parts.push(`C${fmt(v[0])} ${fmt(v[1])} ${fmt(v[2])} ${fmt(v[3])} ${fmt(v[4])} ${fmt(v[5])}`);
      off += 25;
    } else {
      break; // 未知命令码：停止，不猜
    }
  }
  return parts.join('');
}
