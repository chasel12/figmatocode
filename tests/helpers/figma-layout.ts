/**
 * **Figma auto-layout 模拟器**（测试用独立检测器）。
 *
 * 为什么必须有它：uicompiler 的编辑器**根本不读 `.fig`**。它渲染内存里的 AST，
 * 坐标来自 `resolveLayout`（我们自己的 flex 实现）；而 Figma 打开 `.fig` 后看到
 * `stackMode` 就**用自己的 auto-layout 引擎重算**，完全忽略我们写的 `transform`。
 *
 * 所以「`.fig` 能打开」和「`.fig` 在 Figma 里排版正确」是两件事：前者靠往返测试
 * （我们自己 decode 一遍，怎么错都自洽），后者只能靠**按 Figma 的规则重算一遍再比对**。
 *
 * 这个模块按 Figma 的语义从 `.fig` 字段重新布局，返回「与写入坐标不一致」的节点。
 * 差异为 0 = 用户在 Figma 里看到的就是编辑器里看到的。
 *
 * 覆盖的 Figma 语义（每条都是踩过的坑）：
 *   - `stackPrimarySizing` 管**主轴**（HORIZONTAL 是宽、VERTICAL 是高），别搞反
 *   - `RESIZE_TO_FIT` / `RESIZE_TO_FIT_WITH_IMPLICIT_SIZE` 都是「按内容自适应」
 *   - `stackChildPrimaryGrow` 的子项基础尺寸**不计入**固定和，分配额就是最终值
 *   - `stackPositioning: 'ABSOLUTE'` 的子项不参与流、不计入父的 HUG 尺寸
 *   - `stackWrap: 'WRAP'` 要分行，行偏移从**交叉轴**起点累加
 *   - `stackChildAlignSelf: 'STRETCH'` 覆盖父的交叉轴对齐
 */

export interface FigNodeLike {
  guid: { sessionID: number; localID: number };
  type?: string;
  name?: string;
  size?: { x: number; y: number };
  transform?: { m02?: number; m12?: number };
  parentIndex?: { guid: { sessionID: number; localID: number }; position: string };
  stackMode?: string;
  stackSpacing?: number;
  stackCounterSpacing?: number;
  stackPrimarySizing?: string;
  stackCounterSizing?: string;
  stackPrimaryAlignItems?: string;
  stackCounterAlignItems?: string;
  stackChildAlignSelf?: string;
  stackChildPrimaryGrow?: number;
  stackPositioning?: string;
  stackVerticalPadding?: number;
  stackHorizontalPadding?: number;
  stackPaddingRight?: number;
  stackPaddingBottom?: number;
  stackWrap?: string;
  [k: string]: unknown;
}

export interface LayoutDiff {
  name: string;
  type: string;
  parent: string;
  /** 写入的绝对坐标 */
  wrote: { x: number; y: number };
  /** 按 Figma 规则重算的绝对坐标 */
  figma: { x: number; y: number };
  dx: number;
  dy: number;
  /** 写入的尺寸 */
  wroteSize: { w: number; h: number };
  /** 重算的尺寸 */
  figmaSize: { w: number; h: number };
}

export interface LayoutAudit {
  /** 位置偏差 > 0.5px 的节点（含被父级带偏的子孙） */
  moved: LayoutDiff[];
  /** 尺寸偏差 > 0.5px 的节点 */
  sized: LayoutDiff[];
  /** 参与比对的节点数 */
  total: number;
}

const key = (g: { sessionID: number; localID: number }) => `${g.sessionID}:${g.localID}`;
const isHug = (s?: string) => s === 'RESIZE_TO_FIT' || s === 'RESIZE_TO_FIT_WITH_IMPLICIT_SIZE';
const isStack = (n: FigNodeLike) => n.stackMode === 'HORIZONTAL' || n.stackMode === 'VERTICAL';

const padT = (n: FigNodeLike) => n.stackVerticalPadding ?? 0;
const padR = (n: FigNodeLike) => n.stackPaddingRight ?? n.stackHorizontalPadding ?? 0;
const padB = (n: FigNodeLike) => n.stackPaddingBottom ?? n.stackVerticalPadding ?? 0;
const padL = (n: FigNodeLike) => n.stackHorizontalPadding ?? 0;

export function auditLayout(nodeChanges: FigNodeLike[]): LayoutAudit {
  const byKey = new Map<string, FigNodeLike>();
  for (const n of nodeChanges) byKey.set(key(n.guid), n);

  const children = new Map<string, FigNodeLike[]>();
  for (const n of nodeChanges) {
    if (!n.parentIndex) continue;
    const pk = key(n.parentIndex.guid);
    if (!children.has(pk)) children.set(pk, []);
    children.get(pk)!.push(n);
  }
  // Figma 的 `parentIndex.position` 是 fractional index：ASCII 码点序即视觉序
  for (const list of children.values()) {
    list.sort((a, b) => {
      const pa = a.parentIndex!.position;
      const pb = b.parentIndex!.position;
      return pa < pb ? -1 : pa > pb ? 1 : 0;
    });
  }

  /** 按 Figma 规则重算尺寸 */
  const sizeOf = (n: FigNodeLike): { w: number; h: number } => {
    const kids = children.get(key(n.guid)) ?? [];
    const own = { w: n.size?.x ?? 0, h: n.size?.y ?? 0 };
    if (!isStack(n) || kids.length === 0) return own;
    const vertical = n.stackMode === 'VERTICAL';
    const gap = n.stackSpacing ?? 0;
    const flow = kids.filter((c) => c.stackPositioning !== 'ABSOLUTE');
    let primary = 0;
    let cross = 0;

    if (n.stackWrap === 'WRAP') {
      const avail = vertical ? own.h : own.w;
      const padCross = vertical ? padL(n) + padR(n) : padT(n) + padB(n);
      let lineP = 0;
      let lineC = 0;
      let totalC = 0;
      let lines = 0;
      for (const c of flow) {
        const s = sizeOf(c);
        const cp = vertical ? s.h : s.w;
        const cc = vertical ? s.w : s.h;
        const add = lineP === 0 ? cp : cp + gap;
        if (lineP > 0 && lineP + add > avail - padCross) {
          primary = Math.max(primary, lineP);
          totalC += lineC;
          lines += 1;
          lineP = cp;
          lineC = cc;
        } else {
          lineP += add;
          lineC = Math.max(lineC, cc);
        }
      }
      primary = Math.max(primary, lineP);
      totalC += lineC;
      lines += 1;
      cross = totalC + (n.stackCounterSpacing ?? gap) * Math.max(0, lines - 1);
    } else {
      flow.forEach((c, i) => {
        const s = sizeOf(c);
        primary += vertical ? s.h : s.w;
        cross = Math.max(cross, vertical ? s.w : s.h);
        if (i > 0) primary += gap;
      });
    }

    const padP = vertical ? padT(n) + padB(n) : padL(n) + padR(n);
    const padC = vertical ? padL(n) + padR(n) : padT(n) + padB(n);
    // primary 管主轴：HORIZONTAL 是宽，VERTICAL 是高
    const hugP = isHug(n.stackPrimarySizing);
    const hugC = isHug(n.stackCounterSizing);
    const w = vertical ? (hugC ? cross + padC : own.w) : hugP ? primary + padP : own.w;
    const h = vertical ? (hugP ? primary + padP : own.h) : hugC ? cross + padC : own.h;
    return { w, h };
  };

  const pos = new Map<string, { x: number; y: number }>();

  function place(c: FigNodeLike, x: number, y: number) {
    pos.set(key(c.guid), { x, y });
    layout(c, { x, y });
  }

  function layout(n: FigNodeLike, origin: { x: number; y: number }) {
    const kids = children.get(key(n.guid)) ?? [];
    if (!isStack(n) || kids.length === 0) {
      for (const c of kids) {
        const t = c.transform ?? {};
        place(c, origin.x + (t.m02 ?? 0), origin.y + (t.m12 ?? 0));
      }
      return;
    }
    const vertical = n.stackMode === 'VERTICAL';
    const gap = n.stackSpacing ?? 0;
    const self = sizeOf(n);
    const padP0 = vertical ? padT(n) : padL(n);
    const padC0 = vertical ? padL(n) : padT(n);
    const innerP = (vertical ? self.h : self.w) - (vertical ? padT(n) + padB(n) : padL(n) + padR(n));
    const innerC = (vertical ? self.w : self.h) - (vertical ? padL(n) + padR(n) : padT(n) + padB(n));

    const sizes = kids.map((c) => {
      const s = sizeOf(c);
      return { p: vertical ? s.h : s.w, c: vertical ? s.w : s.h };
    });
    // 只有流内子项参与主轴分配（脱流的不占位、也不贡献 gap）
    const flowIdx = kids.map((c, i) => (c.stackPositioning === 'ABSOLUTE' ? -1 : i)).filter((i) => i >= 0);
    const growIdx = flowIdx.filter((i) => (kids[i]!.stackChildPrimaryGrow ?? 0) > 0);
    const fixedSum =
      flowIdx.reduce((a, i) => a + (growIdx.includes(i) ? 0 : sizes[i]!.p), 0) +
      gap * Math.max(0, flowIdx.length - 1);
    const free = Math.max(0, innerP - fixedSum);
    if (growIdx.length > 0) {
      // grow 项的基础尺寸没进 fixedSum，最终值就是分配额
      const each = free / growIdx.length;
      for (const i of growIdx) sizes[i]!.p = each;
    }

    const used = flowIdx.reduce((a, i) => a + sizes[i]!.p, 0) + gap * Math.max(0, flowIdx.length - 1);
    const slack = Math.max(0, innerP - used);
    const justify = n.stackPrimaryAlignItems ?? 'MIN';
    let between = gap;
    let base = padP0;
    if (justify === 'CENTER') base += slack / 2;
    else if (justify === 'MAX') base += slack;
    else if (justify === 'SPACE_BETWEEN' && flowIdx.length > 1) between = gap + slack / (flowIdx.length - 1);
    else if (justify === 'SPACE_EVENLY' && flowIdx.length > 0) {
      between = gap + slack / (flowIdx.length + 1);
      base += slack / (flowIdx.length + 1);
    }

    const counterAlign = n.stackCounterAlignItems ?? 'MIN';
    /**
     * 交叉轴偏移（**不含容器起始 padding**，由调用方加）。
     *
     * `extent` 是「对齐所参照的范围」：不换行时是整个内容盒 `innerC`；
     * **换行时是当前这一行**——Figma 的换行容器把每一行当成独立的对齐容器，
     * 行块本身从顶部堆叠（没有 align-content）。若按整个容器居中，
     * 两行 40 高的项会各自被推到容器中线附近互相重叠，那不是 Figma 的行为。
     */
    const crossOffset = (c: FigNodeLike, i: number, extent: number) => {
      const self_ = c.stackChildAlignSelf ?? 'AUTO';
      const stretch = self_ === 'STRETCH' || (self_ === 'AUTO' && counterAlign === 'STRETCH');
      const cross = stretch ? extent : sizes[i]!.c;
      const align = self_ !== 'AUTO' && self_ !== 'STRETCH' ? self_ : counterAlign;
      if (stretch) return 0;
      if (align === 'CENTER') return (extent - cross) / 2;
      if (align === 'MAX') return extent - cross;
      return 0;
    };

    if (n.stackWrap === 'WRAP') {
      const lines: number[][] = [];
      let cur: number[] = [];
      let acc = 0;
      kids.forEach((c, i) => {
        if (c.stackPositioning === 'ABSOLUTE') return;
        const p = sizes[i]!.p;
        const add = cur.length === 0 ? p : p + gap;
        if (cur.length > 0 && acc + add > innerP) {
          lines.push(cur);
          cur = [i];
          acc = p;
        } else {
          cur.push(i);
          acc += add;
        }
      });
      if (cur.length) lines.push(cur);
      let lineOff = 0;
      for (const line of lines) {
        const usedLine = line.reduce((a, i) => a + sizes[i]!.p, 0) + gap * Math.max(0, line.length - 1);
        const slackLine = Math.max(0, innerP - usedLine);
        let cur2 = padP0;
        let between2 = gap;
        if (justify === 'CENTER') cur2 += slackLine / 2;
        else if (justify === 'MAX') cur2 += slackLine;
        else if (justify === 'SPACE_BETWEEN' && line.length > 1) between2 = gap + slackLine / (line.length - 1);
        let lineCross = 0;
        for (const i of line) lineCross = Math.max(lineCross, sizes[i]!.c);
        for (const i of line) {
          const c = kids[i]!;
          const cOff = padC0 + lineOff + crossOffset(c, i, lineCross);
          const x = vertical ? origin.x + cOff : origin.x + cur2;
          const y = vertical ? origin.y + cur2 : origin.y + cOff;
          place(c, x, y);
          cur2 += sizes[i]!.p + between2;
        }
        lineOff += lineCross + (n.stackCounterSpacing ?? gap);
      }
    } else {
      let cursor = base;
      kids.forEach((c, i) => {
        if (c.stackPositioning === 'ABSOLUTE') return;
        const cOff = padC0 + crossOffset(c, i, innerC);
        const x = vertical ? origin.x + cOff : origin.x + cursor;
        const y = vertical ? origin.y + cursor : origin.y + cOff;
        place(c, x, y);
        cursor += sizes[i]!.p + between;
      });
    }

    // 脱流子项：按自己的 transform 摆，不参与流
    for (const c of kids) {
      if (c.stackPositioning !== 'ABSOLUTE') continue;
      const t = c.transform ?? {};
      place(c, origin.x + (t.m02 ?? 0), origin.y + (t.m12 ?? 0));
    }
  }

  const roots = nodeChanges.filter(
    (n) => n.type === 'FRAME' && n.parentIndex && byKey.get(key(n.parentIndex.guid))?.type === 'CANVAS',
  );
  for (const r of roots) {
    const t = r.transform ?? {};
    pos.set(key(r.guid), { x: t.m02 ?? 0, y: t.m12 ?? 0 });
    layout(r, { x: t.m02 ?? 0, y: t.m12 ?? 0 });
  }

  // 写入的绝对坐标（逐层累加 transform）
  const wrote = new Map<string, { x: number; y: number }>();
  const walk = (n: FigNodeLike, bx: number, by: number) => {
    const t = n.transform ?? {};
    const x = bx + (t.m02 ?? 0);
    const y = by + (t.m12 ?? 0);
    wrote.set(key(n.guid), { x, y });
    for (const c of children.get(key(n.guid)) ?? []) walk(c, x, y);
  };
  for (const r of roots) walk(r, 0, 0);

  const moved: LayoutDiff[] = [];
  const sized: LayoutDiff[] = [];
  for (const n of nodeChanges) {
    const k = key(n.guid);
    const w = wrote.get(k);
    const f = pos.get(k);
    if (!w || !f) continue;
    const parent = n.parentIndex ? byKey.get(key(n.parentIndex.guid)) : undefined;
    const wroteSize = { w: n.size?.x ?? 0, h: n.size?.y ?? 0 };
    const figmaSize = sizeOf(n);
    const row: LayoutDiff = {
      name: n.name ?? '',
      type: n.type ?? '',
      parent: parent?.name ?? '(根)',
      wrote: w,
      figma: f,
      dx: f.x - w.x,
      dy: f.y - w.y,
      wroteSize,
      figmaSize,
    };
    if (Math.abs(row.dx) > 0.5 || Math.abs(row.dy) > 0.5) moved.push(row);
    if (Math.abs(figmaSize.w - wroteSize.w) > 0.5 || Math.abs(figmaSize.h - wroteSize.h) > 0.5) sized.push(row);
  }

  const fmt = (r: LayoutDiff) =>
    `「${r.parent}」/${r.type}「${r.name}」 写入(${Math.round(r.wrote.x)},${Math.round(r.wrote.y)})` +
    ` → Figma(${Math.round(r.figma.x)},${Math.round(r.figma.y)}) Δ(${Math.round(r.dx)},${Math.round(r.dy)})` +
    ` | 尺寸 ${r.wroteSize.w}×${r.wroteSize.h} → ${Math.round(r.figmaSize.w)}×${Math.round(r.figmaSize.h)}`;

  return {
    total: nodeChanges.length,
    moved: moved.map((r) => ({ ...r, name: fmt(r) })),
    sized: sized.map((r) => ({ ...r, name: fmt(r) })),
  };
}
