import type { ContainerNode, LayoutSchema, UINode, UIPage } from '../schema/types';
import { hasText, isContainer } from '../schema/types';
import type { TextMeasureFn } from './measure';

export interface Geometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GeometryMap = Record<string, Geometry>;

interface Size {
  w: number;
  h: number;
}

function padOf(layout: LayoutSchema): [number, number, number, number] {
  return layout.padding ?? [0, 0, 0, 0];
}

function marOf(layout: LayoutSchema): [number, number, number, number] {
  return layout.margin ?? [0, 0, 0, 0];
}

/** FR-36：min/max 宽高夹紧（作用于 box 最终尺寸，先 min 后 max；根节点不经此路径） */
function clampSize(layout: LayoutSchema, s: Size): Size {
  let w = s.w;
  let h = s.h;
  if (layout.minWidth != null) w = Math.max(w, layout.minWidth);
  if (layout.maxWidth != null) w = Math.min(w, layout.maxWidth);
  if (layout.minHeight != null) h = Math.max(h, layout.minHeight);
  if (layout.maxHeight != null) h = Math.min(h, layout.maxHeight);
  return { w, h };
}

/**
 * Layout Compiler 几何引擎：UI AST → 每个节点的绝对几何（border box）。
 *
 * 语义约定：
 * - FIXED：固定像素尺寸
 * - FILL：主轴上等价 flex-grow（父级主轴 FIXED 时分配剩余空间），交叉轴上等价 100%
 * - HUG：包裹内容（text 按测量，container 按子节点集合）
 * - ABSOLUTE 子节点的 x/y 相对父级 padding box 原点
 *
 * 画布渲染与 Pixel Diff 的 reference 都基于这份几何。
 */
export class LayoutResolver {
  private hugCache = new Map<string, Size>();

  constructor(private measure: TextMeasureFn) {}

  resolve(page: UIPage): GeometryMap {
    this.hugCache.clear();
    const out: GeometryMap = {};
    const root = page.root;
    const rootRect = this.resolveNode(root, {
      availW: page.viewport.width,
      availH: page.viewport.height,
      forceW: page.viewport.width,
    });
    this.assign(root, rootRect, out);
    return out;
  }

  /**
   * 解析单个节点的 border box 尺寸。
   * ctx.availW/H：父级可用空间（FILL 依据）
   * ctx.forceW/H：强制尺寸（根节点 / 父级 STRETCH）
   */
  private resolveNode(
    node: UINode,
    ctx: { availW: number | null; availH: number | null; forceW?: number; forceH?: number },
  ): Geometry {
    const L = node.layout;
    const [pt, pr, pb, pl] = padOf(L);
    const padX = pl + pr;
    const padY = pt + pb;

    let w: number;
    if (ctx.forceW != null) w = ctx.forceW;
    else if (L.widthMode === 'FIXED' && L.width != null) w = L.width;
    else if (L.widthMode === 'FILL') w = ctx.availW ?? this.hug(node).w;
    else w = this.hug(node, ctx.availW, ctx.availH).w;

    let h: number;
    if (ctx.forceH != null) h = ctx.forceH;
    else if (L.heightMode === 'FIXED' && L.height != null) h = L.height;
    else if (L.heightMode === 'FILL') h = ctx.availH ?? this.hug(node, ctx.availW, ctx.availH).h;
    else h = this.hug(node, ctx.availW, ctx.availH).h;

    void padX;
    void padY;
    return { x: 0, y: 0, width: w, height: h };
  }

  /**
   * HUG 尺寸（自底向上）。text 在已知宽度约束下会重新换行测量。
   * 结果按 (id, availW, availH) 不缓存跨调用——只缓存无约束版本。
   */
  private hug(node: UINode, availW: number | null = null, availH: number | null = null): Size {
    const L = node.layout;
    const [pt, pr, pb, pl] = padOf(L);
    const padX = pl + pr;
    const padY = pt + pb;

    if (hasText(node)) {
      const wrapW =
        L.widthMode === 'FIXED' && L.width != null
          ? L.width - padX
          : L.widthMode === 'FILL' && (availW ?? null) != null
            ? (availW as number) - padX
            : undefined;
      const m = this.measure(node.text, node.style ?? {}, wrapW);
      let w = m.width + padX;
      let h = m.height + padY;
      if (L.widthMode === 'FIXED' && L.width != null) w = L.width;
      if (L.heightMode === 'FIXED' && L.height != null) h = L.height;
      return clampSize(L, { w, h });
    }

    if (node.type === 'IMAGE') {
      const size = this.hugCache.get(node.id);
      if (size) return clampSize(L, size);
      const fallback = { w: 120, h: 120 };
      const w = L.widthMode === 'FIXED' && L.width != null ? L.width : fallback.w;
      const h = L.heightMode === 'FIXED' && L.height != null ? L.height : fallback.h;
      this.hugCache.set(node.id, { w, h });
      return clampSize(L, { w, h });
    }

    const cached = this.hugCache.get(node.id);
    if (cached) return clampSize(L, cached);
    const computed = this.containerHug(node as ContainerNode, availW, availH);
    this.hugCache.set(node.id, computed);
    return clampSize(L, computed);
  }

  private containerHug(node: ContainerNode, availW: number | null, availH: number | null): Size {
    const L = node.layout;
    const [pt, pr, pb, pl] = padOf(L);
    const padX = pl + pr;
    const padY = pt + pb;
    const gap = L.gap ?? 0;
    const children = node.children;

    if (!children.length) {
      const w = L.widthMode === 'FIXED' && L.width != null ? L.width : padX;
      const h = L.heightMode === 'FIXED' && L.height != null ? L.height : padY;
      return clampSize(L, { w, h });
    }

    const contentW = (availW != null ? availW : null) != null ? (availW as number) - padX : null;
    const contentH = (availH != null ? availH : null) != null ? (availH as number) - padY : null;

    if (L.mode === 'ABSOLUTE') {
      let maxR = 0;
      let maxB = 0;
      for (const child of children) {
        const cm = marOf(child.layout);
        const size = this.childSize(child, availW, availH);
        const x = (child.layout.x ?? 0) + cm[3];
        const y = (child.layout.y ?? 0) + cm[0];
        maxR = Math.max(maxR, x + size.w);
        maxB = Math.max(maxB, y + size.h);
      }
      return { w: maxR + padX, h: maxB + padY };
    }

    const vertical = L.mode === 'VERTICAL';
    // FR-36：Ignore auto layout（子 mode=ABSOLUTE）不参与 hug 尺寸
    const flowChildren = children.filter((c) => c.layout.mode !== 'ABSOLUTE');
    if (!flowChildren.length) {
      const w = L.widthMode === 'FIXED' && L.width != null ? L.width : padX;
      const h = L.heightMode === 'FIXED' && L.height != null ? L.height : padY;
      return clampSize(L, { w, h });
    }
    const entries = flowChildren.map((child) => ({
      child,
      size: this.childSize(child, contentW, contentH),
    }));
    const gapCross = L.gapCross ?? gap;

    // FR-36 HORIZONTAL+WRAP：内容宽已知时按行折算高度（VERTICAL+WRAP 近似单列，浏览器出码折行——LOG 报备）
    const wrapW =
      !vertical && L.wrap === 'WRAP'
        ? L.widthMode === 'FIXED' && L.width != null
          ? Math.max(L.width - padX, 0)
          : availW != null
            ? Math.max(availW - padX, 0)
            : null
        : null;
    if (wrapW != null) {
      const rows: (typeof entries)[] = [];
      let cur: typeof entries = [];
      let curW = 0;
      for (const e of entries) {
        const cm = marOf(e.child.layout);
        const addW = e.size.w + cm[1] + cm[3] + (cur.length ? gap : 0);
        if (cur.length && curW + addW > wrapW) {
          rows.push(cur);
          cur = [e];
          curW = e.size.w + cm[1] + cm[3];
        } else {
          cur.push(e);
          curW += addW;
        }
      }
      if (cur.length) rows.push(cur);
      let maxRowW = 0;
      let sumH = 0;
      rows.forEach((row, r) => {
        let rowW = 0;
        let rowH = 0;
        row.forEach((e, i) => {
          const cm = marOf(e.child.layout);
          rowW += e.size.w + cm[1] + cm[3] + (i > 0 ? gap : 0);
          rowH = Math.max(rowH, e.size.h + cm[0] + cm[2]);
        });
        maxRowW = Math.max(maxRowW, rowW);
        sumH += rowH + (r > 0 ? gapCross : 0);
      });
      const w = L.widthMode === 'FIXED' && L.width != null ? L.width : maxRowW + padX;
      return clampSize(L, { w, h: sumH + padY });
    }

    if (vertical) {
      let maxW = 0;
      let sumH = 0;
      entries.forEach((e, i) => {
        const cm = marOf(e.child.layout);
        maxW = Math.max(maxW, e.size.w + cm[1] + cm[3]);
        sumH += e.size.h + cm[0] + cm[2];
        if (i > 0) sumH += gap;
      });
      return clampSize(L, { w: maxW + padX, h: sumH + padY });
    }

    let sumW = 0;
    let maxH = 0;
    entries.forEach((e, i) => {
      const cm = marOf(e.child.layout);
      sumW += e.size.w + cm[1] + cm[3];
      maxH = Math.max(maxH, e.size.h + cm[0] + cm[2]);
      if (i > 0) sumW += gap;
    });
    return clampSize(L, { w: sumW + padX, h: maxH + padY });
  }

  /** 子节点在给定父内容空间下的 border box 尺寸 */
  private childSize(node: UINode, parentContentW: number | null, parentContentH: number | null): Size {
    const L = node.layout;
    const cm = marOf(L);

    let w: number;
    if (L.widthMode === 'FIXED' && L.width != null) w = L.width;
    else if (L.widthMode === 'FILL') w = parentContentW != null ? Math.max(parentContentW - cm[1] - cm[3], 0) : this.hug(node).w;
    else w = this.hug(node, parentContentW, parentContentH).w;

    let h: number;
    if (L.heightMode === 'FIXED' && L.height != null) h = L.height;
    else if (L.heightMode === 'FILL') h = parentContentH != null ? Math.max(parentContentH - cm[0] - cm[2], 0) : this.hug(node, parentContentW, parentContentH).h;
    else h = this.hug(node, parentContentW, parentContentH).h;

    return clampSize(L, { w, h });
  }

  /** 自顶向下定位所有节点 */
  private assign(node: UINode, rect: Geometry, out: GeometryMap): void {
    out[node.id] = rect;
    if (!isContainer(node) || node.type === 'RECTANGLE') return;
    if (node.type === 'PAGE' && node.layout.mode === 'ABSOLUTE') {
      // 页面级 ABSOLUTE：子节点仍相对页面内容区
    }

    const L = node.layout;
    const [pt, pr, pb, pl] = padOf(L);
    const contentX = rect.x + pl;
    const contentY = rect.y + pt;
    const contentW = rect.width - pl - pr;
    const contentH = rect.height - pt - pb;
    const children = node.children;
    if (!children.length) return;

    if (L.mode === 'ABSOLUTE') {
      for (const child of children) {
        const cm = marOf(child.layout);
        const availW = Math.max(contentW - cm[1] - cm[3], 0);
        const availH = Math.max(contentH - cm[0] - cm[2], 0);
        const size = this.childSize(child, availW, availH);
        const rectChild: Geometry = {
          x: contentX + (child.layout.x ?? 0) + cm[3],
          y: contentY + (child.layout.y ?? 0) + cm[0],
          width: size.w,
          height: size.h,
        };
        this.assign(child, rectChild, out);
      }
      return;
    }

    const gap = L.gap ?? 0;
    const vertical = L.mode === 'VERTICAL';
    const align = L.align ?? 'START';
    const justify = L.justify ?? 'START';
    const gapCross = L.gapCross ?? gap;

    // FR-36：Ignore auto layout（子 mode=ABSOLUTE）——不入 flow 游标，按自身 x/y 相对父内容区放置
    const flowChildren = children.filter((c) => c.layout.mode !== 'ABSOLUTE');
    const absChildren = children.filter((c) => c.layout.mode === 'ABSOLUTE');
    const assignAbsolute = () => {
      for (const child of absChildren) {
        const cm = marOf(child.layout);
        const availW = Math.max(contentW - cm[1] - cm[3], 0);
        const availH = Math.max(contentH - cm[0] - cm[2], 0);
        const size = this.childSize(child, availW, availH);
        this.assign(
          child,
          {
            x: contentX + (child.layout.x ?? 0) + cm[3],
            y: contentY + (child.layout.y ?? 0) + cm[0],
            width: size.w,
            height: size.h,
          },
          out,
        );
      }
    };
    if (!flowChildren.length) {
      assignAbsolute();
      return;
    }

    // 1. 解析子节点尺寸（仅 flow）
    const sizes = flowChildren.map((child) => {
      const cm = marOf(child.layout);
      if (vertical) {
        const availW = Math.max(contentW - cm[1] - cm[3], 0);
        return this.childSize(child, availW, null);
      }
      const availH = Math.max(contentH - cm[0] - cm[2], 0);
      return this.childSize(child, null, availH);
    });

    // 2. 主轴 FILL 重分配（父级主轴尺寸已知才生效）
    const parentMain = vertical ? contentH : contentW;
    const fillIdx: number[] = [];
    flowChildren.forEach((child, i) => {
      const mode = vertical ? child.layout.heightMode : child.layout.widthMode;
      if (mode === 'FILL') fillIdx.push(i);
    });
    if (fillIdx.length) {
      let used = gap * (flowChildren.length - 1);
      flowChildren.forEach((child, i) => {
        const cm = marOf(child.layout);
        if (fillIdx.includes(i)) {
          used += vertical ? cm[0] + cm[2] : cm[1] + cm[3];
        } else {
          used += vertical ? sizes[i].h + cm[0] + cm[2] : sizes[i].w + cm[1] + cm[3];
        }
      });
      const each = Math.max((parentMain - used) / fillIdx.length, 0);
      fillIdx.forEach((i) => {
        if (vertical) sizes[i].h = each;
        else sizes[i].w = each;
      });
    }

    // 3. 主轴游标（justify）
    let mainUsed = gap * (flowChildren.length - 1);
    sizes.forEach((s, i) => {
      const cm = marOf(flowChildren[i].layout);
      mainUsed += vertical ? s.h + cm[0] + cm[2] : s.w + cm[1] + cm[3];
    });
    const free = parentMain - mainUsed;
    const spaceBetween = justify === 'SPACE_BETWEEN' && flowChildren.length > 1 && free > 0;
    const extraGap = spaceBetween ? free / (flowChildren.length - 1) : 0;
    let cursor = vertical ? contentY : contentX;
    if (justify === 'CENTER') cursor += free / 2;
    else if (justify === 'END') cursor += free;
    else if (spaceBetween) cursor += 0;

    // FR-36 HORIZONTAL+WRAP：按行折进 contentW，行内 justify 按行宽重算，行间 gapCross
    // BASELINE：几何近似 START（出码 align-items:baseline 由浏览器精确对齐——LOG 报备）
    const wrapAvail = !vertical && L.wrap === 'WRAP' ? contentW : null;
    if (wrapAvail != null) {
      const rows: number[][] = [];
      let cur: number[] = [];
      let curW = 0;
      sizes.forEach((s, i) => {
        const cm = marOf(flowChildren[i].layout);
        const addW = s.w + cm[1] + cm[3] + (cur.length ? gap : 0);
        if (cur.length && curW + addW > wrapAvail) {
          rows.push(cur);
          cur = [i];
          curW = s.w + cm[1] + cm[3];
        } else {
          cur.push(i);
          curW += addW;
        }
      });
      if (cur.length) rows.push(cur);

      let crossCursor = contentY;
      rows.forEach((row) => {
        let rowH = 0;
        let rowMain = gap * (row.length - 1);
        row.forEach((i) => {
          const cm = marOf(flowChildren[i].layout);
          rowMain += sizes[i].w + cm[1] + cm[3];
          rowH = Math.max(rowH, sizes[i].h + cm[0] + cm[2]);
        });
        const rowFree = wrapAvail - rowMain;
        const rowBetween = justify === 'SPACE_BETWEEN' && row.length > 1 && rowFree > 0;
        const rowExtra = rowBetween ? rowFree / (row.length - 1) : 0;
        let mainCur = contentX;
        if (justify === 'CENTER') mainCur += rowFree / 2;
        else if (justify === 'END') mainCur += rowFree;

        row.forEach((i) => {
          const child = flowChildren[i];
          const cm = marOf(child.layout);
          const size = sizes[i];
          const x = mainCur + cm[3];
          let y = crossCursor + cm[0];
          let h = size.h;
          const childCrossFixed = child.layout.heightMode === 'FIXED';
          if (align === 'STRETCH' && !childCrossFixed) {
            h = Math.max(rowH - cm[0] - cm[2], 0);
          } else if (align === 'CENTER') {
            y = crossCursor + (rowH - size.h) / 2;
          } else if (align === 'END') {
            y = crossCursor + rowH - size.h - cm[2];
          }
          this.assign(child, { x, y, width: size.w, height: h }, out);
          mainCur += size.w + cm[3] + cm[1] + gap + rowExtra;
        });
        crossCursor += rowH + gapCross;
      });
      assignAbsolute();
      return;
    }

    // 4. 定位每个子节点
    flowChildren.forEach((child, i) => {
      const cm = marOf(child.layout);
      const size = sizes[i];
      let rectChild: Geometry;

      if (vertical) {
        const y = cursor + cm[0];
        let x: number;
        let w = size.w;
        const childCrossFixed = child.layout.widthMode === 'FIXED';
        if (align === 'STRETCH' && !childCrossFixed) {
          w = Math.max(contentW - cm[1] - cm[3], 0);
          x = contentX + cm[3];
        } else if (align === 'CENTER') {
          x = contentX + (contentW - size.w) / 2;
        } else if (align === 'END') {
          x = contentX + contentW - size.w - cm[1];
        } else {
          x = contentX + cm[3];
        }
        rectChild = { x, y, width: w, height: size.h };
        cursor += size.h + cm[0] + cm[2] + gap + extraGap;
      } else {
        const x = cursor + cm[3];
        let y: number;
        let h = size.h;
        const childCrossFixed = child.layout.heightMode === 'FIXED';
        if (align === 'STRETCH' && !childCrossFixed) {
          h = Math.max(contentH - cm[0] - cm[2], 0);
          y = contentY + cm[0];
        } else if (align === 'CENTER') {
          y = contentY + (contentH - size.h) / 2;
        } else if (align === 'END') {
          y = contentY + contentH - size.h - cm[2];
        } else {
          y = contentY + cm[0];
        }
        rectChild = { x, y, width: size.w, height: h };
        cursor += size.w + cm[3] + cm[1] + gap + extraGap;
      }

      this.assign(child, rectChild, out);
    });
    assignAbsolute();
  }
}

export function resolveLayout(page: UIPage, measure: TextMeasureFn): GeometryMap {
  return new LayoutResolver(measure).resolve(page);
}

export function roundGeometry(geom: Geometry): Geometry {
  return {
    x: Math.round(geom.x),
    y: Math.round(geom.y),
    width: Math.round(geom.width),
    height: Math.round(geom.height),
  };
}
