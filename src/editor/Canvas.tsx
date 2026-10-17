import { memo, useEffect, useMemo, useRef, useState } from 'react';
import KonvaLib from 'konva';
import { Arc, Arrow, Circle, Ellipse, Group, Image as KImage, Layer, Line, Path as KPath, Rect, Stage, Text as KText } from 'react-konva';
import type Konva from 'konva';
import type { ContainerNode, FillLayer, LayoutSchema, PrototypeInteraction, StyleSchema, UINode } from '../schema/types';
import { hasText, isContainer } from '../schema/types';
import { FONT_STACK } from '../font';
import { createNode, findById } from '../schema/factory';
import { recomputeChildren, type ChildStart } from './constraints';
import { applyTextCase, arcSpec, createCanvasMeasure, effectiveLetterSpacingPx, effectiveLineHeight, flattenPx, imageAdjustCanvasParams, polygonUnitPoints, starUnitPoints, type GeometryMap } from '../compiler';
import { parsePathD, pointsToPathD, draftBounds, rebuildFromPoints, toLocalPoints, type PenDraftPoint } from './tools/penCore';
import { arrowHeadPoints, connectorPathD, makeNavigateInteraction, nearestFrameAncestor, pickAnchors, type ConnAnchor, type ConnGeom } from './tools/connections';
import { useEditor, type Tool } from './store';
import { computeSnap, type GuideLine, type Rect as SnapRect } from './snapping';
import { useCanvasGeometry } from './canvasContext';
import { canvasBus } from './canvasBus';
import { ContextMenu, type MenuItem } from './ContextMenu';

const PAGE_BG = '#FFFFFF';
/** 导引空态稳定引用（非空数组每次都是新引用 → 每次 dragmove 都触发重渲染） */
const NO_GUIDES: GuideLine[] = [];

// FR-51②：Konva 文本渲染对齐浏览器——默认 MIDDLE 基线按 em-box 中点定位，与 DOM 半行距+ascent 公式差 ~1px；
// _fixTextRendering 启用后 Konva 改用 fontBoundingBox 公式（与 CSS line box 一致）。需在 Stage 创建前设置。
(KonvaLib as unknown as { _fixTextRendering: boolean })._fixTextRendering = true;
const SEL_COLOR = '#1677FF';
const HANDLE_COLOR = '#FFFFFF';
const GUIDE_COLOR = '#FF3B30';
const HOVER_COLOR = 'rgba(22,119,255,0.9)';

function useKonvaImage(src?: string): [HTMLImageElement | null] {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.src = src;
    image.onload = () => setImg(image);
    image.onerror = () => setImg(null);
  }, [src]);
  return [img];
}

function useElementSize(): [(node: HTMLElement | null) => void, { w: number; h: number }] {
  const [size, setSize] = useState({ w: 800, h: 600 });
  const observer = useRef<ResizeObserver | null>(null);
  // ref 回调必须保持稳定引用，否则每次渲染 React 都会卸载/重挂载并触发 setSize → 无限循环
  const ref = (node: HTMLElement | null) => {
    observer.current?.disconnect();
    if (!node) return;
    const update = () =>
      setSize((prev) => {
        const w = node.clientWidth;
        const h = node.clientHeight;
        return prev.w === w && prev.h === h ? prev : { w, h };
      });
    observer.current = new ResizeObserver(update);
    observer.current.observe(node);
    update();
  };
  useEffect(() => () => observer.current?.disconnect(), []);
  return [ref, size];
}

/** 悬停/拖拽期间的上下文。对象引用保持稳定（字段就地更新），ContentLayer/NodeView 的 memo 才有效。 */
interface Ctx {
  geometry: GeometryMap;
  measure: ReturnType<typeof createCanvasMeasure>;
  scale: number;
  tool: Tool;
  panActive: boolean;
  snapOn: boolean;
  shouldIgnoreClick: () => boolean;
  resetClick: () => void;
  /** 节点拖拽启动后抑制随之而来的 click（避免多选被拖拽重置） */
  markSuppressClick: () => void;
  onHover: (id: string | null) => void;
  onSelect: (id: string, additive: boolean) => void;
  onNodeDblClick: (node: UINode, point: { x: number; y: number }) => void;
  /** 自管理节点拖拽启动（Konva 9 DD 自动启动在本事件链下不可靠——g1-g4 隔离实验定界，见 handleDown 注释） */
  startNodeDrag: (id: string, grp: Konva.Group, startPage: { x: number; y: number }) => void;
  onNodeDragMove: (
    id: string,
    delta: { x: number; y: number },
    pointerPage: { x: number; y: number },
    altKey: boolean,
  ) => { x: number; y: number };
  onNodeDragEnd: (id: string, finalRect: SnapRect, pointerPage: { x: number; y: number }) => void;
  onResize: (id: string, patch: { width?: number; height?: number; x?: number; y?: number }) => void;
}

interface InsertHint {
  targetId: string;
  /** 流式插入位置参考线（绝对定位目标只有外框高亮） */
  line: { x1: number; y1: number; x2: number; y2: number } | null;
}

function textWrap(_text: string): 'char' | 'word' {
  // FR-51②：统一 word 模式对齐浏览器断行——拉丁词保整（char 模式会把 Compiler 拆成 Compi/ler）；
  // 纯 CJK 无空格时 Konva word 退化为二分断行，与 char 等效
  return 'word';
}

function pagePoint(stage: Konva.Stage, pos: { x: number; y: number }): { x: number; y: number } {
  return stage.getAbsoluteTransform().copy().invert().point(pos);
}

function contentOrigin(geom: GeometryMap[string], layout: LayoutSchema): { x: number; y: number } {
  const p = layout.padding ?? [0, 0, 0, 0];
  return { x: geom.x + p[3], y: geom.y + p[0] };
}

function intersects(a: SnapRect, b: SnapRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function findInTree(root: UINode, id: string): { node: UINode; parent: ContainerNode | null } | null {
  let result: { node: UINode; parent: ContainerNode | null } | null = null;
  const visit = (node: UINode, parent: ContainerNode | null): void => {
    if (node.id === id) {
      result = { node, parent };
      return;
    }
    if (isContainer(node)) node.children.forEach((c) => visit(c, node));
  };
  visit(root, null);
  return result;
}

function collectSubtreeIds(root: UINode, id: string): Set<string> {
  const set = new Set<string>();
  const found = findInTree(root, id);
  if (!found) return set;
  const visit = (n: UINode): void => {
    set.add(n.id);
    if (isContainer(n)) n.children.forEach(visit);
  };
  visit(found.node);
  return set;
}

function findContainerAt(
  geometry: GeometryMap,
  page: UINode,
  point: { x: number; y: number },
  excludeIds: Set<string>,
): ContainerNode | null {
  let best: ContainerNode | null = null;
  let bestArea = Infinity;
  const visit = (node: UINode): void => {
    if (excludeIds.has(node.id)) return;
    if (isContainer(node) && node.type !== 'RECTANGLE') {
      const g = geometry[node.id];
      if (g && point.x >= g.x && point.x <= g.x + g.width && point.y >= g.y && point.y <= g.y + g.height) {
        const area = g.width * g.height;
        if (area <= bestArea) {
          bestArea = area;
          best = node;
        }
      }
      node.children.forEach(visit);
    }
  };
  visit(page);
  return best;
}

/** FR-17 画布填充：色值→[r,g,b]（#hex/rgb，近似解析失败取灰） */
function parseFillColor(c: string): [number, number, number] {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  if (hex) {
    const h = hex[1];
    return [
      parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16),
      parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16),
      parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16),
    ];
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(c);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return [200, 200, 200];
}

/** FR-17 画布单层填充 props：SOLID/线性/径向 Konva 原生；角度/菱形近似首停靠色（LOG 已记） */
function fillLayerProps(f: FillLayer, g: { x: number; y: number; width: number; height: number }): Record<string, unknown> {
  if (f.type === 'SOLID') return { fill: f.color ?? '#E8E8E8' };
  const stops = f.stops && f.stops.length ? f.stops : [
    { position: 0, color: '#000000' },
    { position: 1, color: '#FFFFFF' },
  ];
  const colorStops: (number | string)[] = [];
  for (const s of stops) {
    // Konva colorStops 为成对格式 [offset, cssColor]；stop 级透明度并入 rgba（5 元组会致 Konva 解析失败回退纯色）
    const [r, g2, b] = parseFillColor(s.color);
    colorStops.push(s.position, `rgba(${r},${g2},${b},${s.opacity ?? 1})`);
  }
  const cx = g.x + g.width / 2;
  const cy = g.y + g.height / 2;
  const rad = ((f.angle ?? 0) * Math.PI) / 180; // Figma 向量角 0=右
  if (f.type === 'GRADIENT_LINEAR') {
    const len = (Math.abs(Math.cos(rad)) * g.width + Math.abs(Math.sin(rad)) * g.height) / 2;
    return {
      fill: stops[0]?.color ?? '#000000',
      // fill 仅为 Konva 必需占位（无渐变时回退色）；不设 fillPriority=gradient 会被纯色覆盖
      fillPriority: 'linear-gradient',
      fillLinearGradientStartPoint: { x: cx - Math.cos(rad) * len, y: cy - Math.sin(rad) * len },
      fillLinearGradientEndPoint: { x: cx + Math.cos(rad) * len, y: cy + Math.sin(rad) * len },
      fillLinearGradientColorStops: colorStops,
    };
  }
  if (f.type === 'GRADIENT_RADIAL') {
    return {
      fill: stops[0]?.color ?? '#000000',
      fillPriority: 'radial-gradient',
      fillRadialGradientStartPoint: { x: cx, y: cy },
      fillRadialGradientEndPoint: { x: cx, y: cy },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndRadius: Math.max(g.width, g.height) / 2,
      fillRadialGradientColorStops: colorStops,
    };
  }
  return { fill: stops[0]?.color ?? '#000000' };
}

/** FR-18 画布描边 props：三对齐 Konva 无原生（居中近似）；四边独立取最大宽近似（LOG 已记） */
function strokeLayerProps(style: StyleSchema): Record<string, unknown> {
  const b = style.border;
  if (!b) return {};
  const hasWidths = !!(b.widths && b.widths.some((w) => w > 0));
  if (!hasWidths && !(b.width > 0)) return {};
  const width = hasWidths ? Math.max(...(b.widths ?? [0])) : b.width;
  if (width <= 0) return {};
  return {
    stroke: b.color,
    strokeWidth: width,
    lineJoin: b.join === 'BEVEL' ? 'bevel' : b.join === 'ROUND' ? 'round' : 'miter',
    ...(b.join === 'MITER' && b.miterLimit ? { miterLimit: b.miterLimit } : {}),
    ...(b.dash && b.dash[0] > 0 ? { dash: [b.dash[0], b.dash[1]] } : {}),
  };
}

/** FR-19 画布投影预览：Konva 单组 shadow（多层阴影只画首条；INNER/模糊类画布近似见 LOG） */
function shadowProps(style: StyleSchema): Record<string, unknown> {
  const sh = (style.effects ?? []).find((e) => e.visible !== false && e.kind === 'DROP_SHADOW');
  if (!sh) return {};
  return {
    shadowColor: sh.color ?? 'rgba(0,0,0,0.2)',
    shadowBlur: sh.blur ?? 4,
    shadowOffset: { x: sh.x ?? 0, y: sh.y ?? 4 },
    shadowOpacity: 1,
  };
}

function dropIndex(parent: ContainerNode, geometry: GeometryMap, point: { x: number; y: number }, dragId: string): number {
  if (parent.layout.mode === 'ABSOLUTE') return parent.children.length;
  const vertical = parent.layout.mode === 'VERTICAL';
  let index = 0;
  for (const child of parent.children) {
    if (child.id === dragId) continue;
    const g = geometry[child.id];
    if (!g) continue;
    const center = vertical ? g.y + g.height / 2 : g.x + g.width / 2;
    const coord = vertical ? point.y : point.x;
    if (coord > center) index += 1;
  }
  return index;
}

function deepestAtPoint(geometry: GeometryMap, root: UINode, point: { x: number; y: number }): UINode | null {
  const hits: { node: UINode; depth: number; area: number }[] = [];
  const visit = (node: UINode, depth: number): void => {
    if (node.visible === false) return;
    if (node.type !== 'PAGE' && !node.locked) {
      const g = geometry[node.id];
      if (g && point.x >= g.x && point.x <= g.x + g.width && point.y >= g.y && point.y <= g.y + g.height) {
        hits.push({ node, depth, area: g.width * g.height });
      }
    }
    if (isContainer(node)) node.children.forEach((c) => visit(c, depth + 1));
  };
  visit(root, 0);
  if (!hits.length) return null;
  hits.sort((a, b) => b.depth - a.depth || a.area - b.area);
  return hits[0].node;
}

function computeInsertHint(page: UINode, geometry: GeometryMap, dragId: string, center: { x: number; y: number }): InsertHint | null {
  const exclude = collectSubtreeIds(page, dragId);
  const target = findContainerAt(geometry, page, center, exclude);
  if (!target) return null;
  const tg = geometry[target.id];
  if (!tg) return null;
  if (target.layout.mode === 'ABSOLUTE') return { targetId: target.id, line: null };

  const index = dropIndex(target, geometry, center, dragId);
  const others = target.children.filter((c) => c.id !== dragId);
  const gap = target.layout.gap ?? 0;
  const p = target.layout.padding ?? [0, 0, 0, 0];
  let line: { x1: number; y1: number; x2: number; y2: number };
  if (target.layout.mode === 'VERTICAL') {
    let y: number;
    if (others.length === 0) y = tg.y + p[0];
    else if (index < others.length) {
      const g = geometry[others[index].id];
      y = g ? g.y - gap / 2 : tg.y + p[0];
    } else {
      const last = geometry[others[others.length - 1].id];
      y = last ? last.y + last.height + gap / 2 : tg.y + tg.height - p[2];
    }
    line = { x1: tg.x + p[3], y1: y, x2: tg.x + tg.width - p[1], y2: y };
  } else {
    let x: number;
    if (others.length === 0) x = tg.x + p[3];
    else if (index < others.length) {
      const g = geometry[others[index].id];
      x = g ? g.x - gap / 2 : tg.x + p[3];
    } else {
      const last = geometry[others[others.length - 1].id];
      x = last ? last.x + last.width + gap / 2 : tg.x + tg.width - p[1];
    }
    line = { x1: x, y1: tg.y + p[0], x2: x, y2: tg.y + tg.height - p[2] };
  }
  return { targetId: target.id, line };
}

interface NodeViewProps {
  node: UINode;
  ctx: Ctx;
  /** tool/space 变化时强制重渲染（拖拽开关依赖 ctx 的就地字段） */
  interact: string;
}

const NodeView = memo(function NodeView({ node, ctx, interact }: NodeViewProps) {
  const geom = ctx.geometry[node.id];
  const dragRef = useRef<Konva.Group | null>(null);
  const [img] = useKonvaImage(node.type === 'IMAGE' ? node.src : undefined);
  const style = node.style ?? {};
  const isRoot = node.type === 'PAGE';
  const interactive = !isRoot && !node.locked && ctx.tool === 'select' && !ctx.panActive;
  // FR-29 显隐：隐藏节点（含子树）不渲染；命中/框选已按 visible 过滤
  if (node.visible === false) return null;

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (ctx.shouldIgnoreClick()) {
      e.cancelBubble = true;
      return;
    }
    if (ctx.panActive || ctx.tool !== 'select') return; // 非选择工具：放行冒泡至 stage（文本工具点节点创建/编辑 FR-15）
    e.cancelBubble = true;
    ctx.onSelect(node.id, e.evt.shiftKey);
  };
  const handleDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (ctx.panActive) return; // 空格/抓手：冒泡到 stage 平移（任意位置，P0-02）
    if (ctx.tool !== 'select') return; // 绘制工具（FR-14 Frame 等）：冒泡到 stage 起笔
    ctx.resetClick();
    e.cancelBubble = true;
    // 自管理拖拽：Konva 9 DD 的自动启动在本事件结构下不可靠（纯 Konva 结构复刻 g1-g3 均正常、
    // 手动 startDrag+move 也不被 DD 认账——隔离实验定界），故 down 只记录意图，位移由
    // stageMouseMove 驱动、endInteraction 提交——与拖拽连线/框画同一套已验证机制，
    // 真实鼠标与 Playwright 同路径。
    if (e.evt.button === 0 && interactive) {
      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      const grp = dragRef.current;
      if (stage && pointer && grp) {
        ctx.startNodeDrag(node.id, grp, pagePoint(stage, pointer));
      }
    }
  };
  const handleEnter = () => {
    if (ctx.tool === 'select' && !ctx.panActive) ctx.onHover(node.id);
  };
  const handleLeave = () => ctx.onHover(null);
  const handleDbl = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    if (ctx.panActive || ctx.tool !== 'select') return;
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;
    ctx.onNodeDblClick(node, pagePoint(stage, pointer));
  };

  const common = {
    onClick: handleClick,
    onTap: handleClick,
    onMouseDown: handleDown,
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave,
    onDblClick: handleDbl,
  };
  if (!geom) return null;

  let shape: React.ReactNode = null;

  if (node.type === 'TEXT') {
    const fontSize = style.fontSize ?? 16;
    const lineH = effectiveLineHeight(style);
    const truncating = style.textTruncation === 'ENDING';
    const truncateH = truncating && style.maxLines != null && style.maxLines > 0
      ? Math.min(geom.height, style.maxLines * lineH)
      : geom.height;
    shape = (
      <KText
        {...common}
        {...shadowProps(style)}
        x={geom.x}
        y={geom.y}
        width={geom.width}
        height={truncateH}
        text={applyTextCase(node.text, style.textCase)}
        fontSize={fontSize}
        fontFamily={style.fontFamily ?? FONT_STACK}
        fontStyle={style.fontWeight != null && style.fontWeight >= 600 ? 'bold' : 'normal'}
        lineHeight={lineH / fontSize}
        align={style.textAlign ?? 'left'}
        verticalAlign={(style.textAlignVertical ?? 'TOP').toLowerCase()}
        textDecoration={
          style.textDecoration === 'UNDERLINE' ? 'underline' : style.textDecoration === 'STRIKETHROUGH' ? 'line-through' : undefined
        }
        fill={style.color ?? '#111111'}
        letterSpacing={effectiveLetterSpacingPx(style)}
        wrap={style.textWrap === false ? 'none' : textWrap(node.text)}
        ellipsis={truncating}
        listening={!isRoot && !node.locked}
      />
    );
  } else if (node.type === 'BUTTON') {
    const fontSize = style.fontSize ?? 16;
    const m = ctx.measure(node.text, style);
    const tw = Math.max(8, Math.min(m.width, geom.width - 8));
    shape = (
      <>
        <Rect
          {...common}
          {...shadowProps(style)}
          x={geom.x}
          y={geom.y}
          width={geom.width}
          height={geom.height}
          fill={style.background ?? '#1677FF'}
          cornerRadius={style.borderRadius ?? 0}
          stroke={style.border ? style.border.color : undefined}
          strokeWidth={style.border ? style.border.width : 0}
          opacity={style.opacity ?? 1}
          listening={!isRoot && !node.locked}
        />
        <KText
          x={geom.x + (geom.width - tw) / 2}
          y={geom.y + (geom.height - m.height) / 2}
          width={tw}
          text={node.text}
          fontSize={fontSize}
          fontFamily={style.fontFamily ?? FONT_STACK}
          fontStyle={style.fontWeight != null && style.fontWeight >= 600 ? 'bold' : 'normal'}
          lineHeight={effectiveLineHeight(style) / fontSize}
          align="center"
          fill={style.color ?? '#FFFFFF'}
          letterSpacing={effectiveLetterSpacingPx(style)}
          listening={false}
        />
      </>
    );
  } else if (node.type === 'IMAGE') {
    const radius = style.borderRadius;
    const mode = style.imageScaleMode ?? 'FILL';
    // P1-03 图片 7 项调整：Konva 侧仅能表达 brightness/contrast/saturate（内建滤镜），
    // 色温/色调/高光/阴影无对应项——面板以「画布不显示近似项」提示（见 imageAdjust.ts 报备）。
    const adjParams = imageAdjustCanvasParams(node.imageAdjustments);
    const konvaFilters: ((imageData: ImageData) => void)[] = [];
    const filterProps: Record<string, unknown> = {};
    if (adjParams.brightness !== 0) {
      konvaFilters.push(KonvaLib.Filters.Brighten);
      filterProps.brightness = adjParams.brightness;
    }
    if (adjParams.contrast !== 0) {
      konvaFilters.push(KonvaLib.Filters.Contrast);
      filterProps.contrast = adjParams.contrast;
    }
    if (adjParams.saturation !== 0) {
      konvaFilters.push(KonvaLib.Filters.HSL);
      filterProps.saturation = adjParams.saturation;
    }
    // 有滤镜时需 cache 生效（Konva 语义：filters 只对已缓存节点起作用）
    const needsCache = konvaFilters.length > 0;
    const imgFilterProps = needsCache ? { filters: konvaFilters, ...filterProps, cached: true } : {};
    if (img && mode === 'TILE') {
      shape = (
        <Rect
          {...common}
          {...shadowProps(style)}
          x={geom.x}
          y={geom.y}
          width={geom.width}
          height={geom.height}
          fillPatternImage={img}
          fillPatternRepeat="repeat"
          cornerRadius={radius ?? 0}
          {...imgFilterProps}
          listening={!isRoot && !node.locked}
        />
      );
    } else if (img) {
      const iw0 = img.naturalWidth || img.width;
      const ih0 = img.naturalHeight || img.height;
      let ix = geom.x;
      let iy = geom.y;
      let iw = geom.width;
      let ih = geom.height;
      let crop: { x: number; y: number; width: number; height: number } | undefined;
      if (iw0 && ih0) {
        if (mode === 'FIT') {
          const s = Math.min(geom.width / iw0, geom.height / ih0);
          iw = iw0 * s;
          ih = ih0 * s;
          ix = geom.x + (geom.width - iw) / 2;
          iy = geom.y + (geom.height - ih) / 2;
        } else {
          // FILL/CROP：cover——裁源图中央至节点宽高比（Crop 近似，裁切把手后续）
          const s = Math.max(geom.width / iw0, geom.height / ih0);
          const cw = geom.width / s;
          const ch = geom.height / s;
          crop = { x: (iw0 - cw) / 2, y: (ih0 - ch) / 2, width: cw, height: ch };
        }
      }
      shape = (
        <KImage
          {...common}
          {...shadowProps(style)}
          image={img}
          x={ix}
          y={iy}
          width={iw}
          height={ih}
          crop={crop}
          cornerRadius={radius ?? 0}
          {...imgFilterProps}
          listening={!isRoot && !node.locked}
        />
      );
    } else {
      shape = (
        <Rect
          {...common}
          {...shadowProps(style)}
          x={geom.x}
          y={geom.y}
          width={geom.width}
          height={geom.height}
          fill="#e0e0e0"
          cornerRadius={radius ?? 0}
          listening={!isRoot && !node.locked}
        />
      );
    }
  } else if (node.type === 'VECTOR') {
    // FR-21/49 矢量：vector.d 为节点本地坐标（相对左上角），直接用 Konva.Path 描画。
    // 出码侧由 svgOfVector 产出同形状内联 <svg>，两端共享同一 d（画布↔出码一致性）。
    const d = node.vector?.d ?? '';
    const b = style.border;
    const lw = b?.width ?? 1;
    const stroke = b?.color ?? '#111111';
    const cap = b?.cap === 'ROUND' ? 'round' : b?.cap === 'SQUARE' ? 'square' : 'butt';
    // fill：有 fills 取首层纯色（渐变在 path 上不表达，FR-17 口径外的近似）
    const firstFill = (style.fills ?? []).find((f) => f.visible !== false && f.type === 'SOLID');
    const fill = firstFill?.color ?? 'transparent';
    shape = (
      <KPath
        {...common}
        {...shadowProps(style)}
        x={geom.x}
        y={geom.y}
        data={d}
        stroke={stroke}
        strokeWidth={lw}
        lineCap={cap}
        lineJoin={b?.join === 'ROUND' ? 'round' : b?.join === 'BEVEL' ? 'bevel' : 'miter'}
        fill={fill}
        fillRule={node.vector?.fillRule === 'evenodd' ? 'evenodd' : 'nonzero'}
        {...(b?.dash && b.dash[0] > 0 ? { dash: [b.dash[0], b.dash[1]] } : {})}
        opacity={style.opacity ?? 1}
        hitStrokeWidth={Math.max(lw, 8)}
        listening={!isRoot && !node.locked}
      />
    );
  } else if (node.type === 'LINE') {
    // LINE：两点连线（斜角由端点体现，与出码 rotate 同起点同角），描边取 border 配置
    const b = style.border;
    const lw = b?.width ?? 1;
    const rot = ((style.rotation ?? 0) * Math.PI) / 180;
    const len = geom.width || 1;
    const x2 = geom.x + Math.cos(rot) * len;
    const y2 = geom.y + Math.sin(rot) * len;
    const cap = b?.cap === 'ROUND' ? 'round' : b?.cap === 'SQUARE' ? 'square' : 'butt';
    const color = b?.color ?? '#000000';
    const lineEl = (
      <Line
        {...common}
        {...shadowProps(style)}
        points={[geom.x, geom.y, x2, y2]}
        stroke={color}
        strokeWidth={lw}
        lineCap={cap}
        {...(b?.dash && b.dash[0] > 0 ? { dash: [b.dash[0], b.dash[1]] } : {})}
        opacity={style.opacity ?? 1}
        hitStrokeWidth={Math.max(lw, 8)}
        listening={!isRoot && !node.locked}
      />
    );
    const head = b?.cap;
    if (!head || !head.startsWith('ARROW')) {
      shape = lineEl;
    } else {
      // FR-16 端点箭头：两端同款（线帽语义）；LINES=描边三角近似开口，DIAMOND/POLYGON=闭合点集，CIRCLE=圆
      const hl = Math.max(lw * 3, 8);
      const cosr = Math.cos(rot);
      const sinr = Math.sin(rot);
      const op = style.opacity ?? 1;
      const mkHead = (px: number, py: number, dirX: number, dirY: number, key: string): React.ReactNode => {
        if (head === 'ARROW_CIRCLE') {
          return <Circle key={key} x={px} y={py} radius={hl * 0.55} fill={color} opacity={op} listening={false} />;
        }
        if (head === 'ARROW_TRIANGLED' || head === 'ARROW_LINES') {
          return (
            <Arrow
              key={key}
              points={[px - dirX * hl, py - dirY * hl, px, py]}
              stroke={color}
              fill={head === 'ARROW_LINES' ? 'transparent' : color}
              strokeWidth={lw}
              pointerLength={hl}
              pointerWidth={hl * 0.9}
              lineCap={cap}
              opacity={op}
              listening={false}
            />
          );
        }
        const n = head === 'ARROW_DIAMOND' ? 4 : 6;
        const r = hl * 0.75;
        const base = Math.atan2(dirY, dirX);
        const pts: number[] = [];
        for (let i = 0; i < n; i++) {
          const a = base + (i * Math.PI * 2) / n;
          pts.push(px + r * Math.cos(a), py + r * Math.sin(a));
        }
        return <Line key={key} closed points={pts} fill={color} stroke={color} strokeWidth={lw} opacity={op} listening={false} />;
      };
      shape = (
        <>
          {lineEl}
          {mkHead(x2, y2, cosr, sinr, 'arrow-end')}
          {mkHead(geom.x, geom.y, -cosr, -sinr, 'arrow-start')}
        </>
      );
    }
  } else if (node.type === 'SLICE') {
    // FR-14：Slice 无视觉样式——画布仅虚线圈定框（标记导出区域），出码整节点跳过
    shape = (
      <Rect
        {...common}
        x={geom.x}
        y={geom.y}
        width={geom.width}
        height={geom.height}
        stroke="#8A8A8A"
        strokeWidth={1}
        dash={[6, 4]}
        fill="rgba(138,138,138,0.06)"
        opacity={style.opacity ?? 1}
        listening={!isRoot && !node.locked}
      />
    );
  } else {
    // RECTANGLE / OVAL / POLYGON / STAR：多层 fills 与描边逻辑同构复用（FR-16 扩形状与 arcData）
    const isOval = node.type === 'OVAL';
    const isPoly = node.type === 'POLYGON';
    const isStar = node.type === 'STAR';
    const arcData = isOval && style.arcData ? style.arcData : null;
    const arcN = arcData ? arcSpec(arcData.startingAngle, arcData.endingAngle) : null;
    const br = style.borderRadius;
    const cornerRadius = typeof br === 'number' ? br : br ? [br[0], br[1], br[2], br[3]] : 0;
    const sp = strokeLayerProps(style);
    const fillLayers = (style.fills ?? []).filter((f) => f.visible !== false);
    const listening = !isRoot && !node.locked;
    const ellipseGeo = {
      x: geom.x + geom.width / 2,
      y: geom.y + geom.height / 2,
      radiusX: Math.max(geom.width / 2, 0.5),
      radiusY: Math.max(geom.height / 2, 0.5),
    };
    const rectGeo = { x: geom.x, y: geom.y, width: geom.width, height: geom.height };
    const unitPts = isPoly
      ? polygonUnitPoints(style.pointCount ?? 3)
      : isStar
        ? starUnitPoints(style.pointCount ?? 5, style.innerRadius ?? 0.38)
        : null;
    const polyPts = unitPts ? flattenPx(unitPts, geom.width, geom.height) : null;

    const renderOne = (key: string, layerProps: Record<string, unknown>): React.ReactNode => {
      if (polyPts) {
        // 统一点集闭合描画（与出码 clip-path 同 helper 口径）
        return <Line key={key} {...layerProps} points={polyPts} closed hitStrokeWidth={Math.max(style.border?.width ?? 1, 10)} />;
      }
      if (arcData && arcN && (arcN.sweep < 360 || arcData.innerRadius > 0)) {
        const rx = Math.max(geom.width / 2, 0.5);
        const ry = Math.max(geom.height / 2, 0.5);
        return (
          <Arc
            key={key}
            {...layerProps}
            x={ellipseGeo.x}
            y={ellipseGeo.y}
            innerRadius={Math.max(0, Math.min(1, arcData.innerRadius)) * rx}
            outerRadius={rx}
            angle={arcN.sweep}
            rotation={arcN.start}
            scaleY={ry / rx}
          />
        );
      }
      if (isOval) return <Ellipse key={key} {...layerProps} {...ellipseGeo} />;
      return <Rect key={key} {...layerProps} {...rectGeo} cornerRadius={cornerRadius} />;
    };

    if (fillLayers.length) {
      // FR-17：fills[0]=面板最上→Konva 后声明在上，故倒序（底先画）
      const bottomUp = [...fillLayers].reverse();
      shape = (
        <>
          {bottomUp.map((f, idx) => {
            const top = idx === bottomUp.length - 1;
            const layerProps = {
              ...common,
              ...(top ? sp : {}),
              ...(idx === 0 ? shadowProps(style) : {}),
              ...fillLayerProps(f, geom),
              opacity: (style.opacity ?? 1) * (f.opacity ?? 1),
              listening: top && listening,
            };
            return renderOne(`fill-${idx}`, layerProps);
          })}
        </>
      );
    } else {
      const baseProps = {
        ...common,
        ...sp,
        ...shadowProps(style),
        fill: style.background ?? (node.type === 'RECTANGLE' || isOval || isPoly || isStar ? '#E8E8E8' : 'transparent'),
        opacity: style.opacity ?? 1,
        listening,
      };
      shape = renderOne('base', baseProps);
    }
  }

  const children = isContainer(node) ? node.children : [];
  return (
    <Group
      name={isRoot ? 'page-bg' : node.id}
      ref={(n) => {
        dragRef.current = n;
      }}
      // 拖拽走应用层自管理（handleDown→stageMouseMove→endInteraction），故 Konva 侧 draggable 关闭
      draggable={false}
      onClick={handleClick}
      onTap={handleClick}
      onMouseDown={handleDown}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onDblClick={handleDbl}
    >
      {shape}
      {node.type === 'SECTION' && !isRoot && (
        <KText
          text={node.name}
          x={geom.x}
          y={geom.y - 19}
          width={Math.max(geom.width, 40)}
          wrap="none"
          ellipsis
          fontFamily={FONT_STACK}
          fontSize={12}
          fill="#8A8A8A"
          listening={false}
        />
      )}
      {node.type === 'FRAME' && node.flowStart && (
        // FR-43：流程起点蓝标（Figma ▶ 徽标语义；不监听命中，选区标签同点位时让位于其下）
        <KText
          text="▶"
          x={geom.x + 2}
          y={geom.y - 17}
          fontFamily={FONT_STACK}
          fontSize={12}
          fill={SEL_COLOR}
          listening={false}
        />
      )}
      {children.map((child) => (
        <NodeView key={child.id} node={child} ctx={ctx} interact={interact} />
      ))}
    </Group>
  );
});
const ContentLayer = memo(function ContentLayer({
  root,
  rootGeom,
  rootFill,
  ctx,
  tool,
  spaceDown,
}: {
  root: ContainerNode;
  rootGeom: GeometryMap[string] | undefined;
  rootFill: string;
  ctx: Ctx;
  tool: Tool;
  spaceDown: boolean;
}) {
  return (
    <Layer>
      {rootGeom && (
        <Rect
          name="page-bg"
          x={rootGeom.x}
          y={rootGeom.y}
          width={rootGeom.width}
          height={rootGeom.height}
          fill={rootFill}
          shadowColor="rgba(0,0,0,0.15)"
          shadowBlur={24}
          shadowOffset={{ x: 0, y: 8 }}
        />
      )}
      {root.children.map((child) => (
        <NodeView key={child.id} node={child} ctx={ctx} interact={`${tool}:${spaceDown ? 1 : 0}`} />
      ))}
    </Layer>
  );
});

export function Canvas() {
  const { state, dispatch } = useEditor();
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 40, y: 40 });
  const [wrapRef, wrapSize] = useElementSize();
  const [spaceDown, setSpaceDown] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [insertHint, setInsertHint] = useState<InsertHint | null>(null);
  const [marquee, setMarquee] = useState<SnapRect | null>(null);
  const [menu, setMenu] = useState<{ clientX: number; clientY: number; nodeId: string | null } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [snapOn, setSnapOn] = useState(true);
  // FR-21 钢笔草稿：page 坐标点集；tool==='pen' 时 stage 点击收点，Enter 收笔 / Escape 作废
  const [penDraft, setPenDraft] = useState<PenDraftPoint[]>([]);
  // FR-21：光标 page 坐标（供钢笔橡皮筋预览；仅 pen 工具下更新）
  const [penCursor, setPenCursor] = useState<{ x: number; y: number } | null>(null);
  // FR-44 连接线：拖连接点的当前出线端点（page 坐标）；hover 中的交互 id（目标高亮）
  const [connDraft, setConnDraft] = useState<{ x: number; y: number } | null>(null);
  const [connHover, setConnHover] = useState<string | null>(null);

  const stageRef = useRef<Konva.Stage | null>(null);
  // FR-21：键盘 effect 内读草稿最新值（state 闭包陷阱规避）
  const penDraftRef = useRef<PenDraftPoint[]>([]);
  penDraftRef.current = penDraft;
  // FR-44：window mouseup（endInteraction）读连接草稿最新值
  const connDraftRef = useRef<{ x: number; y: number } | null>(null);
  connDraftRef.current = connDraft;
  // 自管理节点拖拽（Konva DD 自动启动不可靠的替代，见 NodeView.handleDown 注释）
  const nodeDragRef = useRef<{ id: string; grp: Konva.Group; start: { x: number; y: number }; moved: boolean } | null>(null);
  // FR-21：钢笔锚点拖拽起点（拖动拉手柄；page 坐标）
  const penDragRef = useRef<{ x: number; y: number } | null>(null);
  const resizing = useRef<{
    id: string;
    handle: string;
    /** FR-35：drag 起点父尺寸与 ABSOLUTE 子快照（约束重算基准）；Ctrl 拖=忽略约束 */
    startG?: { width: number; height: number };
    startChildren?: ChildStart[];
    ignoreConstraints?: boolean;
  } | null>(null);
  const modeRef = useRef<'idle' | 'maybe-marquee' | 'marquee' | 'pan' | 'draw'>('idle');
  const marqueeOrigin = useRef<{ x: number; y: number } | null>(null);
  const marqueeRef = useRef<SnapRect | null>(null);
  const panStart = useRef<{ clientX: number; clientY: number; posX: number; posY: number } | null>(null);
  const spaceRef = useRef(false);
  const suppressClickRef = useRef(false);
  const menuRef = useRef(menu);
  const editingRef = useRef(editingId);
  menuRef.current = menu;
  editingRef.current = editingId;
  marqueeRef.current = marquee;

  const measure = useMemo(() => createCanvasMeasure(), []);
  // 几何由 Editor 层统一解析并经 context 下发（右栏对齐/图层拖拽与画布共用同一份）
  const geometry: GeometryMap = useCanvasGeometry() ?? {};
  const selected = useMemo(() => new Set(state.selectedIds), [state.selectedIds]);
  const isPan = spaceDown || state.tool === 'hand';

  const rootGeom = geometry[state.page.root.id];
  const selectedCount = state.selectedIds.length;

  const ctxRef = useRef<Ctx | null>(null);
  const ctx: Ctx = (ctxRef.current ??= {
    geometry,
    measure,
    scale,
    tool: state.tool,
    panActive: isPan,
    snapOn,
    shouldIgnoreClick: () => suppressClickRef.current,
    resetClick: () => {
      suppressClickRef.current = false;
    },
    markSuppressClick: () => {
      suppressClickRef.current = true;
    },
    onHover: () => {},
    onSelect: () => {},
    onNodeDblClick: () => {},
    startNodeDrag: () => {},
    onNodeDragMove: (_id, delta) => delta,
    onNodeDragEnd: () => {},
    onResize: () => {},
  });
  ctx.geometry = geometry;
  ctx.measure = measure;
  ctx.scale = scale;
  ctx.tool = state.tool;
  ctx.panActive = isPan;
  ctx.snapOn = snapOn;
  ctx.onHover = (id) => setHoverId(id);
  ctx.onSelect = (id, additive) => dispatch({ type: 'SELECT', id, additive });
  ctx.startNodeDrag = (id, grp, startPage) => {
    if (nodeDragRef.current) return; // shape+Group 双 handler 幂等
    nodeDragRef.current = { id, grp, start: startPage, moved: false };
  };
  ctx.onNodeDblClick = (node, point) => {
    if (node.type === 'TEXT' || node.type === 'BUTTON') {
      setEditText(node.text);
      setEditingId(node.id);
      return;
    }
    const deepest = deepestAtPoint(geometry, state.page.root, point);
    if (deepest && deepest.id !== node.id) dispatch({ type: 'SELECT', id: deepest.id });
  };
  ctx.onResize = (id, patch) => {
    const layoutPatch: Record<string, number | string> = {};
    if (patch.width != null) {
      layoutPatch.width = Math.max(1, Math.round(patch.width));
      layoutPatch.widthMode = 'FIXED';
    }
    if (patch.height != null) {
      layoutPatch.height = Math.max(1, Math.round(patch.height));
      layoutPatch.heightMode = 'FIXED';
    }
    if (patch.x != null) layoutPatch.x = Math.round(patch.x);
    if (patch.y != null) layoutPatch.y = Math.round(patch.y);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch({ type: 'UPDATE_LAYOUT', id, patch: layoutPatch as any, transient: true });
    // FR-35：ABSOLUTE 容器 resize → 子项按约束重算（Ctrl 拖忽略；基准=drag 起点，避免逐帧累计）
    const r = resizing.current;
    if (r && r.id === id && r.startG && r.startChildren && !r.ignoreConstraints) {
      const newSize = {
        width: (layoutPatch.width as number | undefined) ?? r.startG.width,
        height: (layoutPatch.height as number | undefined) ?? r.startG.height,
      };
      const multi = recomputeChildren(r.startChildren, r.startG, newSize);
      if (multi.length) dispatch({ type: 'UPDATE_LAYOUT_MULTI', patches: multi, transient: true });
    }
  };

  ctx.onNodeDragMove = (id, delta, pointerPage, altKey) => {
    setGuides(NO_GUIDES);
    setInsertHint(null);
    const found = findInTree(state.page.root, id);
    const geom = geometry[id];
    if (!found || !found.parent || !geom) return delta;
    const parent = found.parent;

    if (parent.layout.mode === 'ABSOLUTE') {
      if (!snapOn || altKey) return delta;
      const moving: SnapRect = {
        x: geom.x + delta.x,
        y: geom.y + delta.y,
        width: geom.width,
        height: geom.height,
      };
      const refs: SnapRect[] = [];
      for (const c of parent.children) {
        if (c.id === id) continue;
        const cg = geometry[c.id];
        if (cg) refs.push(cg);
      }
      const pg = geometry[parent.id];
      if (pg) {
        const p = parent.layout.padding ?? [0, 0, 0, 0];
        refs.push({
          x: pg.x + p[3],
          y: pg.y + p[0],
          width: Math.max(1, pg.width - p[3] - p[1]),
          height: Math.max(1, pg.height - p[0] - p[2]),
        });
      }
      const res = computeSnap(moving, refs, 6 / scale);
      if (res.guides.length) setGuides(res.guides);
      if (res.dx || res.dy) return { x: delta.x + res.dx, y: delta.y + res.dy };
      return delta;
    }

    // 流式父级：显示插入指示线（不吸附，Figma auto-layout 语义）
    const center = { x: geom.x + delta.x + geom.width / 2, y: geom.y + delta.y + geom.height / 2 };
    setInsertHint(computeInsertHint(state.page.root, geometry, id, center));
    return delta;
  };

  ctx.onNodeDragEnd = (id, finalRect) => {
    setGuides(NO_GUIDES);
    setInsertHint(null);
    const found = findInTree(state.page.root, id);
    const geom = geometry[id];
    if (!found || !found.parent || !geom) return;
    const parent = found.parent;
    const node = found.node;
    const ml = node.layout.margin?.[3] ?? 0;
    const mt = node.layout.margin?.[0] ?? 0;

    if (parent.layout.mode === 'ABSOLUTE') {
      const pg = geometry[parent.id];
      if (!pg) return;
      const origin = contentOrigin(pg, parent.layout);
      const x = Math.round(finalRect.x - origin.x - ml);
      const y = Math.round(finalRect.y - origin.y - mt);
      if (x === Math.round(geom.x) && y === Math.round(geom.y)) return;
      dispatch({ type: 'UPDATE_LAYOUT', id, patch: { x, y } });
      return;
    }

    const center = { x: finalRect.x + finalRect.width / 2, y: finalRect.y + finalRect.height / 2 };
    const target = findContainerAt(geometry, state.page.root, center, collectSubtreeIds(state.page.root, id));
    if (!target) return;
    const index = dropIndex(target, geometry, center, id);
    if (target.layout.mode === 'ABSOLUTE') {
      const tg = geometry[target.id];
      if (!tg) return;
      const origin = contentOrigin(tg, target.layout);
      dispatch({
        type: 'MOVE_NODE',
        id,
        parentId: target.id,
        index,
        patch: { x: Math.round(finalRect.x - origin.x - ml), y: Math.round(finalRect.y - origin.y - mt) },
      });
      return;
    }
    dispatch({ type: 'MOVE_NODE', id, parentId: target.id, index });
  };

  const commitText = () => {
    const id = editingRef.current;
    if (!id) return;
    const found = findInTree(state.page.root, id);
    if (found && hasText(found.node) && found.node.text !== editText) {
      dispatch({ type: 'UPDATE_TEXT', id, text: editText });
    }
    setEditingId(null);
  };

  const canGroup = () => {
    const ids = state.selectedIds.filter((id) => id !== state.page.root.id);
    if (!ids.length) return false;
    const founds = ids.map((id) => findInTree(state.page.root, id)).filter((f) => f && f.parent && !f.node.locked);
    if (!founds.length) return false;
    const parentId = (founds[0] as NonNullable<(typeof founds)[number]>).parent!.id;
    return founds.every((f) => f && f.parent && f.parent.id === parentId);
  };

  const doGroup = () => {
    const ids = state.selectedIds.filter((id) => id !== state.page.root.id);
    if (!ids.length) return;
    const founds = ids
      .map((id) => findInTree(state.page.root, id))
      .filter((f): f is NonNullable<typeof f> => !!f && !!f.parent && !f.node.locked);
    if (!founds.length) return;
    const parentId = founds[0].parent!.id;
    if (!founds.every((f) => f.parent && f.parent.id === parentId)) return;
    const parent = founds[0].parent!;

    if (parent.layout.mode === 'ABSOLUTE') {
      const pg = geometry[parent.id];
      if (!pg) return;
      let x1 = Infinity;
      let y1 = Infinity;
      let x2 = -Infinity;
      let y2 = -Infinity;
      for (const f of founds) {
        const g = geometry[f.node.id];
        if (!g) return;
        x1 = Math.min(x1, g.x);
        y1 = Math.min(y1, g.y);
        x2 = Math.max(x2, g.x + g.width);
        y2 = Math.max(y2, g.y + g.height);
      }
      const origin = contentOrigin(pg, parent.layout);
      const frameLayout: Partial<LayoutSchema> = {
        x: Math.round(x1 - origin.x),
        y: Math.round(y1 - origin.y),
        width: Math.round(x2 - x1),
        height: Math.round(y2 - y1),
      };
      const offsets: Record<string, { x: number; y: number }> = {};
      for (const f of founds) {
        const g = geometry[f.node.id]!;
        const ml = f.node.layout.margin?.[3] ?? 0;
        const mt = f.node.layout.margin?.[0] ?? 0;
        offsets[f.node.id] = { x: Math.round(g.x - x1 - ml), y: Math.round(g.y - y1 - mt) };
      }
      dispatch({ type: 'GROUP', ids, frameLayout, offsets });
    } else {
      dispatch({ type: 'GROUP', ids });
    }
  };

  /** FR-14：创建 Frame（拖画与预设共用）。at=左上角页面坐标；流式根按中心点算插入索引，绝对定位根写 x/y 补丁；parentId=拖画落点容器（缺省 root） */
  const createFrameAt = (width: number, height: number, at: { x: number; y: number }, name?: string, parentId?: string) => {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const found = parentId ? findInTree(state.page.root, parentId) : null;
    const rootOrParent = found && isContainer(found.node) ? found.node : state.page.root;
    const pg = geometry[rootOrParent.id];
    let index: number | undefined;
    let patch: Partial<LayoutSchema> | undefined;
    if (rootOrParent.layout.mode === 'ABSOLUTE' && pg) {
      const origin = contentOrigin(pg, rootOrParent.layout);
      patch = { x: Math.round(at.x - origin.x), y: Math.round(at.y - origin.y) };
      index = rootOrParent.children.length;
    } else {
      index = dropIndex(rootOrParent, geometry, { x: at.x + w / 2, y: at.y + h / 2 }, '');
    }
    dispatch({ type: 'CREATE_FRAME', width: w, height: h, parentId: rootOrParent.id, index, patch, name });
    dispatch({ type: 'SET_TOOL', tool: 'select' });
  };

  /** FR-15/16/14：矩形/椭圆/直线/多边形/星形/Section/Slice/文本工具创建——Canvas 预构建节点后 INSERT_NODE（文本 HUG，其余 FIXED 拖画尺寸）；at=页面坐标；LINE 经 rotation 存斜角 */
  const createShapeAt = (
    kind: 'RECTANGLE' | 'TEXT' | 'OVAL' | 'LINE' | 'POLYGON' | 'STAR' | 'SECTION' | 'SLICE',
    w: number,
    h: number,
    at: { x: number; y: number },
    parentId?: string,
    rotation?: number,
  ): string => {
    const node = createNode(kind);
    const found = parentId ? findInTree(state.page.root, parentId) : null;
    const container = found && isContainer(found.node) ? found.node : state.page.root;
    const pg = geometry[container.id];
    let index: number | undefined;
    let patch: Partial<LayoutSchema> | undefined;
    if (container.layout.mode === 'ABSOLUTE' && pg) {
      const origin = contentOrigin(pg, container.layout);
      patch = { x: Math.round(at.x - origin.x), y: Math.round(at.y - origin.y) };
      index = container.children.length;
    } else {
      index = dropIndex(container, geometry, { x: at.x + Math.max(w, 1) / 2, y: at.y + Math.max(h, 1) / 2 }, '');
    }
    if (kind === 'RECTANGLE' || kind === 'OVAL' || kind === 'LINE' || kind === 'POLYGON' || kind === 'STAR' || kind === 'SECTION' || kind === 'SLICE') {
      node.layout = {
        ...node.layout,
        width: Math.max(kind === 'LINE' ? 1 : 1, Math.round(w)),
        height: kind === 'LINE' ? 0 : Math.max(1, Math.round(h)),
        widthMode: 'FIXED',
        heightMode: 'FIXED',
        ...(container.layout.mode === 'ABSOLUTE' ? { mode: 'ABSOLUTE' as const, x: 0, y: 0 } : {}),
      };
      if (kind === 'LINE' && rotation) node.style = { ...(node.style ?? {}), rotation };
    } else if (container.layout.mode === 'ABSOLUTE') {
      node.layout = { ...node.layout, mode: 'ABSOLUTE' as const, x: 0, y: 0 };
    }
    dispatch({ type: 'INSERT_NODE', node, parentId: container.id, index, patch });
    dispatch({ type: 'SET_TOOL', tool: 'select' });
    return node.id;
  };

  /** FR-21 钢笔收笔：page 坐标点集 → 本地 d → VECTOR 节点（挂落点容器，同拖画语义） */
  const commitPen = (points: PenDraftPoint[], closed: boolean): void => {
    if (points.length < 2) {
      setPenDraft([]);
      return;
    }
    const b = draftBounds(points);
    const local = toLocalPoints(points, b.x, b.y);
    const d = pointsToPathD(local, closed);
    const node = createNode('VECTOR');
    node.vector = { d };
    node.style = { border: { width: 2, color: '#1677FF', style: 'solid' } };
    node.layout = {
      ...node.layout,
      mode: 'ABSOLUTE',
      x: Math.round(b.x),
      y: Math.round(b.y),
      width: Math.max(Math.round(b.width), 1),
      height: Math.max(Math.round(b.height), 1),
      widthMode: 'FIXED',
      heightMode: 'FIXED',
    };
    const dropContainer = findContainerAt(geometry, state.page.root, { x: b.x + b.width / 2, y: b.y + b.height / 2 }, new Set());
    const parent = dropContainer && dropContainer.id !== state.page.root.id ? dropContainer : state.page.root;
    const pg = geometry[parent.id];
    let patch: Partial<LayoutSchema> | undefined;
    if (parent.layout.mode === 'ABSOLUTE' && pg) {
      const origin = contentOrigin(pg, parent.layout);
      patch = { x: Math.round(b.x - origin.x), y: Math.round(b.y - origin.y) };
    }
    dispatch({ type: 'INSERT_NODE', node, parentId: parent.id, patch });
    dispatch({ type: 'SELECT', id: node.id });
    setPenDraft([]);
    dispatch({ type: 'SET_TOOL', tool: 'select' });
  };

  const applyMarquee = (m: SnapRect) => {
    const r: SnapRect = {
      x: Math.min(m.x, m.x + m.width),
      y: Math.min(m.y, m.y + m.height),
      width: Math.abs(m.width),
      height: Math.abs(m.height),
    };
    const ids: string[] = [];
    const visit = (node: UINode, ancestorLocked: boolean): void => {
      if (node.visible === false) return;
      const locked = ancestorLocked || !!node.locked;
      if (node.type !== 'PAGE' && !locked) {
        const g = geometry[node.id];
        if (g && intersects(g, r)) ids.push(node.id);
      }
      if (isContainer(node)) node.children.forEach((c) => visit(c, locked));
    };
    visit(state.page.root, false);
    dispatch({ type: 'SELECT_MANY', ids });
  };

  const endInteraction = () => {
    // P1-04：锚点拖拽收笔（提交一步历史，撤销粒度=一次拖拽）
    if (anchorDrag.current) {
      anchorDrag.current = null;
      setHoverVecAnchor(null);
      dispatch({ type: 'COMMIT' });
      return;
    }
    // 自管理节点拖拽提交（moved<3px 的纯点击不产位移，指示即刻清）
    if (nodeDragRef.current) {
      const drag = nodeDragRef.current;
      nodeDragRef.current = null;
      const g = geometry[drag.id];
      const delta = { x: drag.grp.x(), y: drag.grp.y() };
      drag.grp.position({ x: 0, y: 0 });
      setGuides(NO_GUIDES);
      setInsertHint(null);
      if (g && drag.moved && (delta.x !== 0 || delta.y !== 0)) {
        const finalRect: SnapRect = { x: g.x + delta.x, y: g.y + delta.y, width: g.width, height: g.height };
        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition();
        const pagePos = stage && pointer ? pagePoint(stage, pointer) : { x: finalRect.x, y: finalRect.y };
        ctx.onNodeDragEnd(drag.id, finalRect, pagePos);
      }
      return;
    }
    // FR-44 连接线：从连接点起手拖线，mouseup 落点=最近 FRAME 祖先 → 创建 ON_CLICK/Navigate/Instant
    if (connDraftRef.current) {
      const at = connDraftRef.current;
      connDraftRef.current = null; // ref 即速 null（对齐 pen 分支：Stage+window 双 mouseup 不重复创建）
      setConnDraft(null);
      if (conn) {
        const hit = deepestAtPoint(geometry, state.page.root, at);
        const drop = hit ? nearestFrameAncestor(state.page.root, hit.id) : null;
        if (drop && drop.id !== conn.id) {
          const found = findById(state.page.root, conn.id);
          const existing = found?.node.interactions ?? [];
          const { list } = makeNavigateInteraction(existing, drop.id);
          dispatch({ type: 'UPDATE_INTERACTIONS', id: conn.id, interactions: list });
        }
      }
      return;
    }
    // FR-21 钢笔：mousedown 起点即落锚；拖动位移作为出锚手柄（对称贝塞尔，不拖=直线段）
    if (penDragRef.current) {
      const start = penDragRef.current;
      penDragRef.current = null;
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      const at = stage && pointer ? pagePoint(stage, pointer) : start;
      const hx = Math.round((at.x - start.x) * 100) / 100;
      const hy = Math.round((at.y - start.y) * 100) / 100;
      const next: PenDraftPoint = Math.abs(hx) < 1 && Math.abs(hy) < 1 ? { x: start.x, y: start.y } : { x: start.x, y: start.y, hx, hy };
      setPenDraft((prev) => [...prev, next]);
      return;
    }
    if (resizing.current) {
      resizing.current = null;
      dispatch({ type: 'COMMIT' });
    }
    const mode = modeRef.current;
    if (mode === 'draw') {
      const r = marqueeRef.current;
      const o = marqueeOrigin.current;
      if (o) {
        const box = r ? { x: r.x, y: r.y, w: r.width, h: r.height } : { x: o.x, y: o.y, w: 100, h: 100 };
        // FR-14/35：拖画落点找最深容器（与文本工具同语义；矩形不可为容器由 findContainerAt 保证）→ 成为子项，约束/布局才有挂载对象
        const dropContainer = findContainerAt(geometry, state.page.root, { x: box.x + box.w / 2, y: box.y + box.h / 2 }, new Set());
        const dropParentId = dropContainer?.id;
        if (state.tool === 'ellipse') createShapeAt('OVAL', box.w, box.h, { x: box.x, y: box.y }, dropParentId);
        else if (state.tool === 'polygon') createShapeAt('POLYGON', box.w, box.h, { x: box.x, y: box.y }, dropParentId);
        else if (state.tool === 'star') createShapeAt('STAR', box.w, box.h, { x: box.x, y: box.y }, dropParentId);
        // FR-14：Section 恒挂 Page 顶层（Figma 语义 Section 不入 Frame，故不传 parentId）；Slice 跟随落点容器
        else if (state.tool === 'section') createShapeAt('SECTION', box.w, box.h, { x: box.x, y: box.y });
        else if (state.tool === 'slice') createShapeAt('SLICE', box.w, box.h, { x: box.x, y: box.y }, dropParentId);
        else if (state.tool === 'line') {
          // 直线：起止点求长度与斜角（atan2），起点=拖画原点
          const stage = stageRef.current;
          const p = stage ? stage.getPointerPosition() : null;
          const end = stage && p ? pagePoint(stage, p) : { x: box.x + box.w, y: box.y + box.h };
          const dx = end.x - o.x;
          const dy = end.y - o.y;
          const len = Math.round(Math.hypot(dx, dy)) || 100;
          const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
          const lineDrop = findContainerAt(geometry, state.page.root, o, new Set());
          createShapeAt('LINE', len, 0, { x: o.x, y: o.y }, lineDrop?.id, angle);
        } else if (state.tool === 'rect') createShapeAt('RECTANGLE', box.w, box.h, { x: box.x, y: box.y }, dropParentId);
        else createFrameAt(box.w, box.h, { x: box.x, y: box.y }, undefined, dropParentId);
      }
      setMarquee(null);
      marqueeRef.current = null;
    }
    if (mode === 'marquee') {
      const m = marqueeRef.current;
      if (m) applyMarquee(m);
      setMarquee(null);
      marqueeRef.current = null;
    }
    modeRef.current = 'idle';
    marqueeOrigin.current = null;
    panStart.current = null;
  };

  const setScaleCentered = (ns: number) => {
    const cx = wrapSize.w / 2;
    const cy = wrapSize.h / 2;
    const pagePt = { x: (cx - stagePos.x) / scale, y: (cy - stagePos.y) / scale };
    setScale(ns);
    setStagePos({ x: cx - pagePt.x * ns, y: cy - pagePt.y * ns });
  };

  const fit = () => {
    const g = geometry[state.page.root.id];
    if (!g || !wrapSize.w || !wrapSize.h) return;
    const margin = 48;
    const s = Math.min((wrapSize.w - margin * 2) / g.width, (wrapSize.h - margin * 2) / g.height, 4);
    const ns = Math.max(0.2, s);
    setScale(ns);
    setStagePos({
      x: (wrapSize.w - g.width * ns) / 2 - g.x * ns,
      y: (wrapSize.h - g.height * ns) / 2 - g.y * ns,
    });
  };

  const zoomIn = () => setScaleCentered(Math.min(4, scale * 1.1));
  const zoomOut = () => setScaleCentered(Math.max(0.2, scale / 1.1));
  const commitPenOpen = () => {
    if (penDraftRef.current.length >= 2) commitPen(penDraftRef.current, false);
  };
  const createFrameCentered = (w: number, h: number, name?: string) => {
    const pageCx = (wrapSize.w / 2 - stagePos.x) / scale;
    const pageCy = (wrapSize.h / 2 - stagePos.y) / scale;
    createFrameAt(w, h, { x: pageCx - w / 2, y: pageCy - h / 2 }, name);
  };

  const actionsRef = useRef({ endInteraction, fit, doGroup, setScaleCentered, zoomIn, zoomOut, createFrameCentered, commitPenOpen });
  actionsRef.current = { endInteraction, fit, doGroup, setScaleCentered, zoomIn, zoomOut, createFrameCentered, commitPenOpen };

  // 鼠标移出 stage 后松开也要收尾（框选/平移跨出画布区）
  useEffect(() => {
    const onUp = () => actionsRef.current.endInteraction();
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  // FR-25/26/14：顶栏缩放控件、View 菜单、预设创建 → 画布命令
  useEffect(
    () =>
      canvasBus.onCmd((cmd) => {
        const a = actionsRef.current;
        if (cmd.op === 'fit') a.fit();
        else if (cmd.op === 'zoomSet') a.setScaleCentered(cmd.scale);
        else if (cmd.op === 'zoomIn') a.zoomIn();
        else if (cmd.op === 'zoomOut') a.zoomOut();
        else if (cmd.op === 'createFrame') a.createFrameCentered(cmd.width, cmd.height, cmd.name);
        else if (cmd.op === 'captureRegion') {
          // FR-24：region 为 page 坐标 → 绝对空间（stagePos + scale），pixelRatio=desired/zoom 保证导出尺寸与画布缩放无关
          const st = stageRef.current;
          if (!st) {
            canvasBus.rejectCapture(cmd.requestId, new Error('stage not ready'));
            return;
          }
          try {
            const zoom = scale;
            const abs = {
              x: stagePos.x + cmd.region.x * zoom,
              y: stagePos.y + cmd.region.y * zoom,
              width: cmd.region.width * zoom,
              height: cmd.region.height * zoom,
            };
            const dataUrl = st.toDataURL({
              ...abs,
              pixelRatio: cmd.pixelScale / zoom,
              mimeType: cmd.mime,
              quality: 0.92,
            });
            canvasBus.resolveCapture(cmd.requestId, dataUrl);
          } catch (err) {
            canvasBus.rejectCapture(cmd.requestId, err instanceof Error ? err : new Error(String(err)));
          }
        }
      }),
    [scale, stagePos],
  );

  // 顶栏缩放% 实时回显
  useEffect(() => canvasBus.publishScale(scale), [scale]);

  // FR-51② 同款口径：e2e 通道读舞台变换（连接线拖线/像素断言需要 page→screen 换算）。
  // 仅 VITE_E2E_HOOK=1 构建挂载；只读，不新增任何编辑行为。
  useEffect(() => {
    if ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_E2E_HOOK !== '1') return;
    (window as unknown as Record<string, unknown>).__UIC_VIEW__ = () => ({ scale, x: stagePos.x, y: stagePos.y });
    return () => {
      delete (window as unknown as Record<string, unknown>).__UIC_VIEW__;
    };
  }, [scale, stagePos]);

  // 全局键：空格平移、Shift+1/0 缩放、Ctrl+G 成组、Esc 取消（编辑框选/菜单时阻断外层反选）
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === 'Space' && !e.shiftKey) {
        // FR-44：Shift+Space 归内联预览（Editor 消费），空格平移不收 shift 组合
        e.preventDefault();
        if (!spaceRef.current) {
          spaceRef.current = true;
          setSpaceDown(true);
        }
        return;
      }
      if (e.shiftKey && e.code === 'Digit1') {
        e.preventDefault();
        actionsRef.current.fit();
        return;
      }
      if (e.shiftKey && e.code === 'Digit0') {
        e.preventDefault();
        actionsRef.current.setScaleCentered(1);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        actionsRef.current.doGroup();
        return;
      }
      if (e.key === 'Escape') {
        let handled = false;
        if (menuRef.current) {
          setMenu(null);
          handled = true;
        }
        if (marqueeRef.current || modeRef.current === 'draw') {
          modeRef.current = 'idle';
          marqueeOrigin.current = null;
          setMarquee(null);
          marqueeRef.current = null;
          handled = true;
        }
        if (penDraftRef.current.length) {
          // FR-21：钢笔 Escape 作废草稿（先删末点、再按一次全清——Figma 语义近似为直接全清）
          setPenDraft([]);
          handled = true;
        }
        if (connDraftRef.current) {
          // FR-44：Escape 作废拖线（只清拖线态，不动选区）
          setConnDraft(null);
          setConnHover(null);
          handled = true;
        }
        if (nodeDragRef.current) {
          // Escape 中断节点拖拽：视觉复位（不提交）
          nodeDragRef.current.grp.position({ x: 0, y: 0 });
          nodeDragRef.current = null;
          setGuides(NO_GUIDES);
          setInsertHint(null);
          handled = true;
        }
        if (handled) e.stopImmediatePropagation();
      }
      if (e.key === 'Enter' && penDraftRef.current.length >= 2) {
        // FR-21：Enter 开放收笔；Shift+Enter 已在 stageClick 闭合收笔
        actionsRef.current.commitPenOpen();
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceRef.current = false;
        setSpaceDown(false);
      }
    };
    const onBlur = () => {
      if (spaceRef.current) {
        spaceRef.current = false;
        setSpaceDown(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // FR-21：切出钢笔即作废草稿（半截路径不入库）
  useEffect(() => {
    if (state.tool !== 'pen') {
      if (penDraftRef.current.length) setPenDraft([]);
      setPenCursor(null);
    }
  }, [state.tool]);

  // 光标：空格/抓手=grab，选择工具悬停节点=move，其余工具十字
  useEffect(() => {
    const el = stageRef.current?.container();
    if (!el) return;
    if (spaceDown || state.tool === 'hand') el.style.cursor = 'grab';
    else if (state.tool === 'text') el.style.cursor = 'text';
    else if (state.tool !== 'select') el.style.cursor = 'crosshair';
    else el.style.cursor = hoverId && geometry[hoverId] ? 'move' : 'default';
  }, [spaceDown, state.tool, hoverId, geometry]);

  const handles = useMemo(() => {
    if (state.selectedIds.length !== 1) return [];
    const id = state.selectedIds[0];
    if (id === state.page.root.id) return [];
    const g = geometry[id];
    if (!g) return [];
    const found = findInTree(state.page.root, id);
    if (found?.node.locked) return [];
    const absParent = found?.parent?.layout.mode === 'ABSOLUTE';
    const list: { key: string; x: number; y: number; cursor: string }[] = [
      { key: 'se', x: g.x + g.width, y: g.y + g.height, cursor: 'nwse-resize' },
      { key: 'e', x: g.x + g.width, y: g.y + g.height / 2, cursor: 'ew-resize' },
      { key: 's', x: g.x + g.width / 2, y: g.y + g.height, cursor: 'ns-resize' },
    ];
    if (absParent) {
      list.push({ key: 'nw', x: g.x, y: g.y, cursor: 'nwse-resize' });
      list.push({ key: 'n', x: g.x + g.width / 2, y: g.y, cursor: 'ns-resize' });
      list.push({ key: 'w', x: g.x, y: g.y + g.height / 2, cursor: 'ew-resize' });
      list.push({ key: 'ne', x: g.x + g.width, y: g.y, cursor: 'nesw-resize' });
      list.push({ key: 'sw', x: g.x, y: g.y + g.height, cursor: 'nesw-resize' });
    }
    return list;
  }, [state.selectedIds, geometry, state.page]);

  /**
   * P1-04：已提交 VECTOR 的锚点二次编辑。
   * 仅当选中的是 VECTOR（select 工具、仓库内可解析的 d）时给出锚点集；
   * 锚点坐标为**页面系**（节点几何原点 + 本地 d 坐标），与拖画/收笔同坐标系。
   */
  const vecAnchors = useMemo(() => {
    if (isPan || state.tool !== 'select' || state.selectedIds.length !== 1) return null;
    const id = state.selectedIds[0];
    if (id === state.page.root.id) return null;
    const g = geometry[id];
    const found = findInTree(state.page.root, id);
    if (!g || !found || found.node.type !== 'VECTOR' || found.node.locked) return null;
    const d = found.node.vector?.d ?? '';
    const parsed = parsePathD(d);
    if (!parsed.ok || !parsed.points.length) return null;
    const origin = contentOrigin(g, found.node.layout);
    return {
      id,
      closed: parsed.closed,
      anchors: parsed.points.map((p, i) => ({
        index: i,
        x: origin.x + p.x,
        y: origin.y + p.y,
        hx: p.hx ?? 0,
        hy: p.hy ?? 0,
      })),
    };
  }, [state.selectedIds, geometry, state.page, isPan, state.tool]);

  // P1-04：锚点拖拽（page 坐标起手快照，拖动时整节点重算 d）
  const anchorDrag = useRef<{ id: string; index: number; startX: number; startY: number; points: PenDraftPoint[]; closed: boolean; origin: { x: number; y: number } } | null>(null);
  const [hoverVecAnchor, setHoverVecAnchor] = useState<number | null>(null);

  // FR-44 连接线：单选 FRAME（select 工具、非平移）时给出连接点 + 已有交互的目标箭头线。
  // 目标不在当前页几何（跨页/已删=broken link）的交互不画线——面板已显「已断开」，画布静默（报备口径）。
  const conn = useMemo(() => {
    if (isPan || state.tool !== 'select' || state.selectedIds.length !== 1) return null;
    const id = state.selectedIds[0];
    if (id === state.page.root.id) return null;
    const found = findById(state.page.root, id);
    if (!found || found.node.type !== 'FRAME') return null;
    const g = geometry[id];
    if (!g) return null;
    const knob: ConnAnchor = { x: g.x + g.width, y: g.y + g.height / 2, side: 'e' };
    const items: { it: PrototypeInteraction; d: string; head: number[]; targetId: string; tg: ConnGeom }[] = [];
    for (const it of found.node.interactions ?? []) {
      if (!it.targetId) continue;
      if (it.action !== 'NAVIGATE' && it.action !== 'OPEN_OVERLAY') continue;
      const tg = geometry[it.targetId];
      if (!tg) continue;
      const pair = pickAnchors(g, tg);
      items.push({ it, d: connectorPathD(pair.from, pair.to), head: arrowHeadPoints(pair.to), targetId: it.targetId, tg });
    }
    return { id, g, knob, items };
  }, [isPan, state.tool, state.selectedIds, state.page, geometry]);

  // 拖线中的落点候选：命中节点→最近 FRAME 祖先（排除源自身），供高亮与 mouseup 创建判定
  const connDrop = useMemo(() => {
    if (!connDraft || !conn) return null;
    const hit = deepestAtPoint(geometry, state.page.root, connDraft);
    const f = hit ? nearestFrameAncestor(state.page.root, hit.id) : null;
    return f && f.id !== conn.id ? geometry[f.id] ?? null : null;
  }, [connDraft, conn, geometry, state.page]);
  const connGhostD = conn && connDraft ? connectorPathD(conn.knob, { ...connDraft, side: 'w' }) : '';
  const connHoverGeom = conn && connHover ? conn.items.find((i) => i.it.id === connHover)?.tg ?? null : null;

  // 选区/工具变化即中止拖线与 hover 态（防残影）
  useEffect(() => {
    setConnDraft(null);
    setConnHover(null);
  }, [state.selectedIds, state.tool]);

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    if (e.evt.ctrlKey || e.evt.metaKey) {
      // 缩放：以光标为锚点
      const oldScale = scale;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = Math.min(4, Math.max(0.2, oldScale * (direction > 0 ? 1.1 : 1 / 1.1)));
      const mousePointTo = {
        x: (pointer.x - stagePos.x) / oldScale,
        y: (pointer.y - stagePos.y) / oldScale,
      };
      setScale(newScale);
      setStagePos({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
      return;
    }
    // 平移（Shift 时横向）
    if (e.evt.shiftKey) {
      setStagePos((p) => ({ x: p.x - e.evt.deltaY, y: p.y }));
    } else {
      setStagePos((p) => ({ x: p.x - e.evt.deltaX, y: p.y - e.evt.deltaY }));
    }
  };

  const handleSize = 8 / scale;

  const stageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const target = e.target as Konva.Node;
    const isStage = target === (e.target as Konva.Node).getStage();
    const isBg = isStage || target.name() === 'page-bg';
    if (isPan) {
      // 空格/抓手：任意位置起手平移（P0-02）
      modeRef.current = 'pan';
      panStart.current = { clientX: e.evt.clientX, clientY: e.evt.clientY, posX: stagePos.x, posY: stagePos.y };
      suppressClickRef.current = false;
      return;
    }
    if (state.tool === 'frame' || state.tool === 'section' || state.tool === 'slice' || state.tool === 'rect' || state.tool === 'ellipse' || state.tool === 'line' || state.tool === 'polygon' || state.tool === 'star') {
      // FR-14/FR-16 Frame/矩形/椭圆/直线拖画：任意位置起笔（节点上冒泡而来同样受理）
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!stage || !pointer) return;
      modeRef.current = 'draw';
      marqueeOrigin.current = pagePoint(stage, pointer);
      marqueeRef.current = null;
      suppressClickRef.current = true;
      return;
    }
    if (state.tool === 'pen') {
      // FR-21：mousedown 起锚点，拖动拉出手柄（Figma 语义：拖出即贝塞尔，不拖=直线段）
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (stage && pointer) {
        const at = pagePoint(stage, pointer);
        penDragRef.current = { x: at.x, y: at.y };
      }
      suppressClickRef.current = false;
      return;
    }
    if (state.tool === 'text') {
      // 文本工具：无拖拽模式；清上一交互残留的 click 抑制（拖画后 suppress 滞留至下次消费）
      suppressClickRef.current = false;
      return;
    }
    if (!isBg) return;
    if (state.tool === 'select') {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!stage || !pointer) return;
      modeRef.current = 'maybe-marquee';
      marqueeOrigin.current = pagePoint(stage, pointer);
      suppressClickRef.current = false;
    }
  };

  const stageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // P1-04：锚点拖拽优先于其他交互（拖锚点改形；本地坐标按新包围盒归零后回写）
    if (anchorDrag.current) {
      const st = stageRef.current;
      const pt = st?.getPointerPosition();
      if (!st || !pt) return;
      const at = pagePoint(st, pt);
      const drag = anchorDrag.current;
      const dx = at.x - drag.startX;
      const dy = at.y - drag.startY;
      const moved: PenDraftPoint[] = drag.points.map((p, i) =>
        i === drag.index ? { ...p, x: Math.round((p.x + dx) * 100) / 100, y: Math.round((p.y + dy) * 100) / 100 } : p,
      );
      // 本地点集 → 绝对坐标 → 重算 d 与包围盒（与收笔同口径）
      const abs = moved.map((p) => ({ ...p, x: p.x + drag.origin.x, y: p.y + drag.origin.y }));
      const { d, bounds } = rebuildFromPoints(abs, drag.closed);
      dispatch({
        type: 'UPDATE_VECTOR_D',
        id: drag.id,
        d,
        patch: {
          width: Math.max(1, Math.round(bounds.width)),
          height: Math.max(1, Math.round(bounds.height)),
          x: Math.round(bounds.x),
          y: Math.round(bounds.y),
        },
        transient: true,
      });
      return;
    }
    // 自管理节点拖拽（handleDown 起手 → 这里驱动位移与吸附/插入指示 → endInteraction 提交）。
    // Konva 9 DD 自动启动在本事件结构下不可靠（隔离实验定界），与拖线/框选同走 stage 级驱动。
    if (nodeDragRef.current) {
      const drag = nodeDragRef.current;
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!stage || !pointer) return;
      const p = pagePoint(stage, pointer);
      const dx = p.x - drag.start.x;
      const dy = p.y - drag.start.y;
      if (!drag.moved && Math.hypot(dx * scale, dy * scale) < 3) return; // <3px 视为点击
      drag.moved = true;
      suppressClickRef.current = true; // 拖后合成的 click 不得重置多选（原 onDragStart 语义）
      const corrected = ctx.onNodeDragMove(drag.id, { x: dx, y: dy }, p, e.evt.altKey);
      drag.grp.position(corrected);
      return;
    }
    // FR-44：拖线期间只需光标位置（mode 恒 idle，与钢笔草稿同挂载点）
    if (connDraftRef.current) {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (stage && pointer) {
        const at = pagePoint(stage, pointer);
        setConnDraft((prev) => (prev && prev.x === at.x && prev.y === at.y ? prev : { x: at.x, y: at.y }));
      }
      return;
    }
    if (resizing.current) {
      if (e.evt.ctrlKey) resizing.current.ignoreConstraints = true; // FR-35 Ctrl 拖忽略约束（按下过即忽略全程）
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const p = pagePoint(stage, pointer);
      const { id, handle } = resizing.current;
      const g = geometry[id];
      if (!g) return;
      const patch: { width?: number; height?: number; x?: number; y?: number } = {};
      if (handle.includes('e')) patch.width = p.x - g.x;
      if (handle.includes('s')) patch.height = p.y - g.y;
      if (handle.includes('w')) {
        patch.width = g.x + g.width - p.x;
        patch.x = p.x;
      }
      if (handle.includes('n')) {
        patch.height = g.y + g.height - p.y;
        patch.y = p.y;
      }
      ctx.onResize(id, patch);
      return;
    }
    if (modeRef.current === 'pan' && panStart.current) {
      const dx = e.evt.clientX - panStart.current.clientX;
      const dy = e.evt.clientY - panStart.current.clientY;
      if (!suppressClickRef.current && Math.hypot(dx, dy) > 4) suppressClickRef.current = true;
      setStagePos({ x: panStart.current.posX + dx, y: panStart.current.posY + dy });
      return;
    }
    if (modeRef.current === 'idle' || modeRef.current === 'pan') {
      // FR-21：钢笔草稿预览需实时光标位置（pen 无拖动模式，mode 恒 idle）
      if (state.tool === 'pen') {
        const st = stageRef.current;
        const pt = st?.getPointerPosition();
        if (st && pt) {
          const at = pagePoint(st, pt);
          setPenCursor((prev) => (prev && prev.x === at.x && prev.y === at.y ? prev : { x: at.x, y: at.y }));
        }
      }
      return;
    }
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer || !marqueeOrigin.current) return;
    const p = pagePoint(stage, pointer);
    const o = marqueeOrigin.current;
    if (modeRef.current === 'maybe-marquee') {
      const dist = Math.hypot((p.x - o.x) * scale, (p.y - o.y) * scale);
      if (dist > 4) {
        modeRef.current = 'marquee';
        suppressClickRef.current = true;
      } else {
        return;
      }
    }
    const rect: SnapRect = {
      x: Math.min(o.x, p.x),
      y: Math.min(o.y, p.y),
      width: Math.abs(p.x - o.x),
      height: Math.abs(p.y - o.y),
    };
    setMarquee(rect);
    marqueeRef.current = rect;
  };

  const stageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (suppressClickRef.current) return;
    const target = e.target as Konva.Node;
    const isStage = target === target.getStage();
    const isBg = isStage || target.name() === 'page-bg';
    if (state.tool === 'pen') {
      // FR-21：锚点落点在 mousedown/mouseup（endInteraction）——拖动即拉手柄。
      // 此处只处理 Shift+点击=闭合收笔（Figma 语义）；单纯 click 不再重复落点。
      if (e.evt.shiftKey && penDraft.length >= 2) {
        commitPen(penDraft, true);
      }
      return;
    }
    if (state.tool === 'text') {
      // FR-15/P0-21：文本工具随处可点——点文本/BUTTON 进入编辑，点容器内则在该容器创建（Figma 语义）
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!stage || !pointer) return;
      const at = pagePoint(stage, pointer);
      const hit = deepestAtPoint(geometry, state.page.root, at);
      if (hit && hasText(hit)) {
        setEditText(hit.text ?? '');
        setEditingId(hit.id);
        return;
      }
      const container = findContainerAt(geometry, state.page.root, at, new Set());
      const parent = container ?? state.page.root;
      const id = createShapeAt('TEXT', 0, 0, at, parent.id);
      setEditText('');
      setEditingId(id);
      return;
    }
    if (!isBg) return;
    if (isStage) dispatch({ type: 'SELECT', id: null });
    else dispatch({ type: 'SELECT', id: state.page.root.id });
  };

  const stageContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    let n: Konva.Node | null = e.target;
    let nodeId: string | null = null;
    while (n && n !== stage) {
      const name = n.name();
      if (name === 'page-bg') break;
      if (name) {
        nodeId = name;
        break;
      }
      n = n.getParent();
    }
    if (nodeId && !state.selectedIds.includes(nodeId)) dispatch({ type: 'SELECT', id: nodeId });
    setMenu({ clientX: e.evt.clientX, clientY: e.evt.clientY, nodeId });
  };

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl+';
  const menuNode = menu?.nodeId ? (findInTree(state.page.root, menu.nodeId)?.node ?? null) : null;
  const menuItems: MenuItem[] = !menu
    ? []
    : menu.nodeId && menuNode
      ? [
          {
            label: '剪切',
            shortcut: `${modKey}X`,
            onClick: () => {
              dispatch({ type: 'COPY' });
              dispatch({ type: 'DELETE' });
            },
          },
          { label: '复制', shortcut: `${modKey}C`, onClick: () => dispatch({ type: 'COPY' }) },
          { label: '复制副本', shortcut: `${modKey}D`, onClick: () => dispatch({ type: 'DUPLICATE' }) },
          { label: '粘贴', shortcut: `${modKey}V`, onClick: () => dispatch({ type: 'PASTE' }) },
          { divider: true },
          { label: '成组', shortcut: `${modKey}G`, disabled: !canGroup(), onClick: doGroup },
          {
            label: '置顶层',
            shortcut: isMac ? '⇧⌘]' : 'Ctrl+Shift+]',
            onClick: () => dispatch({ type: 'REORDER_Z', id: menu.nodeId!, to: 'front' }),
          },
          {
            label: '置底层',
            shortcut: isMac ? '⌘[' : 'Ctrl+[',
            onClick: () => dispatch({ type: 'REORDER_Z', id: menu.nodeId!, to: 'back' }),
          },
          { divider: true },
          {
            label: menuNode.locked ? '解锁' : '锁定',
            onClick: () => dispatch({ type: 'TOGGLE_LOCK', ids: [menu.nodeId!] }),
          },
          ...(menuNode.type === 'FRAME'
            ? [
                { divider: true },
                {
                  label: menuNode.flowStart ? '移除流程起点' : '设为流程起点',
                  // FR-43：右键直达 SET_FLOW_START（画布蓝标随之出现/消失）
                  onClick: () => dispatch({ type: 'SET_FLOW_START', id: menuNode.flowStart ? null : menu.nodeId! }),
                },
              ]
            : []),
          { divider: true },
          { label: '删除', shortcut: 'Del', danger: true, onClick: () => dispatch({ type: 'DELETE' }) },
        ]
      : [
          { label: '粘贴', shortcut: `${modKey}V`, onClick: () => dispatch({ type: 'PASTE' }) },
          {
            label: '全选',
            shortcut: `${modKey}A`,
            onClick: () =>
              dispatch({ type: 'SELECT_MANY', ids: state.page.root.children.map((c) => c.id) }),
          },
        ];

  const zoomValue =
    Math.abs(scale - 1) < 0.001
      ? '1'
      : Math.abs(scale - 0.5) < 0.001
        ? '0.5'
        : Math.abs(scale - 2) < 0.001
          ? '2'
          : Math.abs(scale - 4) < 0.001
            ? '4'
            : 'custom';

  const editingNode = editingId ? findInTree(state.page.root, editingId) : null;
  const editingGeom = editingId ? geometry[editingId] : undefined;
  const editingStyle = editingNode && hasText(editingNode.node) ? (editingNode.node.style ?? {}) : {};

  return (
    <div className="canvas-wrap" ref={wrapRef}>
        <Stage
          ref={stageRef}
          width={wrapSize.w}
          height={wrapSize.h}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          onWheel={onWheel}
          onMouseDown={stageMouseDown}
          onMouseMove={stageMouseMove}
          onMouseUp={endInteraction}
          onClick={stageClick}
          onContextMenu={stageContextMenu}
        >
          <ContentLayer
            root={state.page.root}
            rootGeom={rootGeom}
            rootFill={state.page.root.style?.background ?? PAGE_BG}
            ctx={ctx}
            tool={state.tool}
            spaceDown={spaceDown}
          />
          <Layer listening={false}>
            {guides.map((g, i) =>
              g.axis === 'x' ? (
                <Group key={`guide-x-${i}`}>
                  <Line points={[g.pos, g.from, g.pos, g.to]} stroke={GUIDE_COLOR} strokeWidth={1 / scale} />
                  {g.gap != null && (
                    <>
                      <Rect
                        x={g.pos + 4 / scale}
                        y={(g.from + g.to) / 2 - 7 / scale}
                        width={`${Math.round(g.gap)}px`.length * 6.5 / scale + 6 / scale}
                        height={14 / scale}
                        fill={GUIDE_COLOR}
                        cornerRadius={2 / scale}
                      />
                      <KText
                        x={g.pos + 7 / scale}
                        y={(g.from + g.to) / 2 - 4 / scale}
                        text={`${Math.round(g.gap)}px`}
                        fontSize={10 / scale}
                        fill="#FFFFFF"
                        listening={false}
                      />
                    </>
                  )}
                </Group>
              ) : (
                <Group key={`guide-y-${i}`}>
                  <Line points={[g.from, g.pos, g.to, g.pos]} stroke={GUIDE_COLOR} strokeWidth={1 / scale} />
                  {g.gap != null && (
                    <>
                      <Rect
                        x={(g.from + g.to) / 2 - `${Math.round(g.gap)}px`.length * 6.5 / scale / 2}
                        y={g.pos + 4 / scale}
                        width={`${Math.round(g.gap)}px`.length * 6.5 / scale + 6 / scale}
                        height={14 / scale}
                        fill={GUIDE_COLOR}
                        cornerRadius={2 / scale}
                      />
                      <KText
                        x={(g.from + g.to) / 2 - `${Math.round(g.gap)}px`.length * 6.5 / scale / 2 + 3 / scale}
                        y={g.pos + 7 / scale}
                        text={`${Math.round(g.gap)}px`}
                        fontSize={10 / scale}
                        fill="#FFFFFF"
                        listening={false}
                      />
                    </>
                  )}
                </Group>
              ),
            )}
            {hoverId &&
              hoverId !== state.page.root.id &&
              !selected.has(hoverId) &&
              geometry[hoverId] &&
              (() => {
                const g = geometry[hoverId]!;
                const found = findInTree(state.page.root, hoverId);
                const label = found?.node.name || found?.node.type || '';
                const labelW = Math.max(24, label.length * 9 + 8);
                const sizeText = `${Math.round(g.width)} × ${Math.round(g.height)}`;
                const sizeW = Math.max(24, sizeText.length * 6 + 8);
                return (
                  <>
                    <Rect x={g.x} y={g.y} width={g.width} height={g.height} stroke={HOVER_COLOR} strokeWidth={1 / scale} />
                    <Rect
                      x={g.x}
                      y={g.y - 18 / scale}
                      width={labelW / scale}
                      height={14 / scale}
                      fill={SEL_COLOR}
                      cornerRadius={2 / scale}
                    />
                    <KText
                      x={g.x + 4 / scale}
                      y={g.y - 15 / scale}
                      text={label}
                      fontSize={9 / scale}
                      fill="#FFFFFF"
                      listening={false}
                    />
                    <Rect
                      x={g.x + (labelW + 4) / scale}
                      y={g.y - 18 / scale}
                      width={sizeW / scale}
                      height={14 / scale}
                      fill={SEL_COLOR}
                      cornerRadius={2 / scale}
                    />
                    <KText
                      x={g.x + (labelW + 8) / scale}
                      y={g.y - 15 / scale}
                      text={sizeText}
                      fontSize={9 / scale}
                      fill="#FFFFFF"
                      listening={false}
                    />
                  </>
                );
              })()}
            {state.selectedIds.map((id) => {
              const g = geometry[id];
              if (!g || id === state.page.root.id) return null;
              return (
                <Rect
                  key={`sel-${id}`}
                  x={g.x}
                  y={g.y}
                  width={g.width}
                  height={g.height}
                  stroke={SEL_COLOR}
                  strokeWidth={1.5 / scale}
                  dash={[4 / scale, 4 / scale]}
                />
              );
            })}
            {insertHint &&
              (() => {
                const tg = geometry[insertHint.targetId];
                if (!tg) return null;
                return (
                  <>
                    <Rect
                      x={tg.x}
                      y={tg.y}
                      width={tg.width}
                      height={tg.height}
                      stroke={SEL_COLOR}
                      strokeWidth={1.5 / scale}
                    />
                    {insertHint.line && (
                      <>
                        <Line
                          points={[
                            insertHint.line.x1,
                            insertHint.line.y1,
                            insertHint.line.x2,
                            insertHint.line.y2,
                          ]}
                          stroke={SEL_COLOR}
                          strokeWidth={2 / scale}
                        />
                        <Rect
                          x={insertHint.line.x1 - 3.5 / scale}
                          y={insertHint.line.y1 - 3.5 / scale}
                          width={7 / scale}
                          height={7 / scale}
                          cornerRadius={3.5 / scale}
                          fill={SEL_COLOR}
                        />
                      </>
                    )}
                  </>
                );
              })()}
            {marquee && (
              <Rect
                x={marquee.x}
                y={marquee.y}
                width={marquee.width}
                height={marquee.height}
                fill="rgba(22,119,255,0.08)"
                stroke={SEL_COLOR}
                strokeWidth={1 / scale}
                dash={[4 / scale, 4 / scale]}
              />
            )}
            {penDraft.length > 0 && (
              <>
                {/* FR-21 钢笔草稿：已落锚点连线（与收笔出码同一 d 口径） */}
                <KPath
                  data={pointsToPathD(penDraft, false)}
                  x={0}
                  y={0}
                  stroke={SEL_COLOR}
                  strokeWidth={1.5 / scale}
                  listening={false}
                />
                {/* 橡皮筋：末锚点 → 当前光标（未落点提示） */}
                {penCursor && (
                  <Line
                    points={[penDraft[penDraft.length - 1].x, penDraft[penDraft.length - 1].y, penCursor.x, penCursor.y]}
                    stroke={SEL_COLOR}
                    strokeWidth={1 / scale}
                    dash={[4 / scale, 4 / scale]}
                    opacity={0.6}
                    listening={false}
                  />
                )}
                {/* 锚点方块 + 首点闭合热区提示（Shift+点击首点附近即闭合，Figma 语义） */}
                {penDraft.map((p, i) => (
                  <Rect
                    key={`pen-anchor-${i}`}
                    x={p.x - 3.5 / scale}
                    y={p.y - 3.5 / scale}
                    width={7 / scale}
                    height={7 / scale}
                    fill={i === 0 ? SEL_COLOR : HANDLE_COLOR}
                    stroke={SEL_COLOR}
                    strokeWidth={1.5 / scale}
                    listening={false}
                  />
                ))}
              </>
            )}
            {/* P1-04：已提交 VECTOR 的锚点（可拖动二次编辑；与手柄同位但语义不同——锚点改形，手柄改框） */}
            {vecAnchors && (
              <>
                {vecAnchors.anchors.map((a) => (
                  <Circle
                    key={`vec-anchor-${a.index}`}
                    x={a.x}
                    y={a.y}
                    radius={(hoverVecAnchor === a.index ? 5.5 : 4) / scale}
                    fill={a.index === 0 ? SEL_COLOR : HANDLE_COLOR}
                    stroke={SEL_COLOR}
                    strokeWidth={1.5 / scale}
                    onMouseEnter={() => setHoverVecAnchor(a.index)}
                    onMouseLeave={() => setHoverVecAnchor(null)}
                    onMouseDown={(e) => {
                      e.cancelBubble = true;
                      suppressClickRef.current = true;
                      const g = geometry[vecAnchors.id];
                      const found = findInTree(state.page.root, vecAnchors.id);
                      if (!g || !found) return;
                      const parsed = parsePathD(found.node.vector?.d ?? '');
                      if (!parsed.ok) return;
                      const stage = stageRef.current;
                      const pointer = stage?.getPointerPosition();
                      if (!stage || !pointer) return;
                      const at = pagePoint(stage, pointer);
                      anchorDrag.current = {
                        id: vecAnchors.id,
                        index: a.index,
                        startX: at.x,
                        startY: at.y,
                        points: parsed.points,
                        closed: parsed.closed,
                        origin: contentOrigin(g, found.node.layout),
                      };
                    }}
                  />
                ))}
              </>
            )}
            {selectedCount === 1 &&
              (() => {
                const id = state.selectedIds[0];
                const g = geometry[id];
                if (!g || id === state.page.root.id) return null;
                const label = `${Math.round(g.width)} × ${Math.round(g.height)}`;
                return (
                  <>
                    <Rect
                      x={g.x}
                      y={g.y - 20 / scale}
                      width={(label.length * 6 + 8) / scale}
                      height={16 / scale}
                      fill={SEL_COLOR}
                      cornerRadius={3 / scale}
                    />
                    <KText
                      x={g.x + 4 / scale}
                      y={g.y - 16 / scale}
                      text={label}
                      fontSize={10 / scale}
                      fill="#FFFFFF"
                      listening={false}
                    />
                  </>
                );
              })()}
          </Layer>
          <Layer>
            {handles.map((h) => (
              <Rect
                key={h.key}
                x={h.x - handleSize / 2}
                y={h.y - handleSize / 2}
                width={handleSize}
                height={handleSize}
                fill={HANDLE_COLOR}
                stroke={SEL_COLOR}
                strokeWidth={1.5 / scale}
                cornerRadius={2 / scale}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  suppressClickRef.current = true; // 把手拖动后 mouseup 合成的 stage click 不得反选（Figma 拖把手保持选中）
                  const id = state.selectedIds[0];
                  if (!id) return;
                  // FR-35：把手按下抓约束快照（仅 ABSOLUTE 容器；Ctrl=忽略约束）
                  const found = findById(state.page.root, id);
                  const g = geometry[id];
                  let startG: { width: number; height: number } | undefined;
                  let startChildren: ChildStart[] | undefined;
                  if (found && g && found.node.layout.mode === 'ABSOLUTE' && 'children' in found.node) {
                    startG = { width: g.width, height: g.height };
                    startChildren = found.node.children.map((c) => {
                      const cg = geometry[c.id];
                      return {
                        id: c.id,
                        x: c.layout.x ?? 0,
                        y: c.layout.y ?? 0,
                        width: cg?.width ?? c.layout.width ?? 0,
                        height: cg?.height ?? c.layout.height ?? 0,
                        constraints: c.layout.constraints,
                      };
                    });
                  }
                  resizing.current = {
                    id,
                    handle: h.key,
                    startG,
                    startChildren,
                    ignoreConstraints: e.evt.ctrlKey,
                  };
                }}
                onMouseEnter={() => {
                  const stage = stageRef.current;
                  if (stage) stage.container().style.cursor = h.cursor;
                }}
                onMouseLeave={() => {
                  const stage = stageRef.current;
                  if (stage) stage.container().style.cursor = 'default';
                }}
              />
            ))}
          </Layer>
          {/* FR-44 连接线层：连接点（拖出创建 Navigate）+ 既有交互的目标箭头线 + hover/落点高亮 */}
          {conn && (
            <Layer>
              {connHoverGeom && (
                <Rect
                  x={connHoverGeom.x}
                  y={connHoverGeom.y}
                  width={connHoverGeom.width}
                  height={connHoverGeom.height}
                  stroke={SEL_COLOR}
                  strokeWidth={2 / scale}
                  fill="rgba(22,119,255,0.06)"
                  listening={false}
                />
              )}
              {conn.items.map((ln) => (
                <Group key={ln.it.id}>
                  <KPath
                    data={ln.d}
                    stroke={SEL_COLOR}
                    strokeWidth={1.6 / scale}
                    hitStrokeWidth={14 / scale}
                    onMouseEnter={() => setConnHover(ln.it.id)}
                    onMouseLeave={() => setConnHover((h) => (h === ln.it.id ? null : h))}
                    onClick={(ev) => {
                      ev.cancelBubble = true;
                      dispatch({ type: 'SELECT', id: ln.targetId });
                    }}
                  />
                  <Line points={ln.head} closed fill={SEL_COLOR} listening={false} />
                </Group>
              ))}
              {connGhostD && (
                <KPath data={connGhostD} stroke={SEL_COLOR} strokeWidth={1.4 / scale} dash={[6 / scale, 4 / scale]} listening={false} />
              )}
              {connDrop && (
                <Rect
                  x={connDrop.x}
                  y={connDrop.y}
                  width={connDrop.width}
                  height={connDrop.height}
                  stroke={SEL_COLOR}
                  strokeWidth={2.5 / scale}
                  fill="rgba(22,119,255,0.10)"
                  listening={false}
                />
              )}
              {/* 旋钮外偏 14/scale（page 单位=屏幕恒定 14px）：避让 'e' 把手外沿 4/scale + 半径 7/scale（验证轨回归） */}
              <Circle
                x={conn.knob.x + 14 / scale}
                y={conn.knob.y}
                radius={7 / scale}
                fill={SEL_COLOR}
                stroke="#FFFFFF"
                strokeWidth={1.5 / scale}
                onMouseDown={(ev) => {
                  ev.cancelBubble = true;
                  suppressClickRef.current = true; // 拖线收尾合成的 click 不得反选（Figma 拖线保持选中）
                  const stage = stageRef.current;
                  const pointer = stage?.getPointerPosition();
                  const at = stage && pointer ? pagePoint(stage, pointer) : { x: conn.knob.x, y: conn.knob.y };
                  setConnDraft(at);
                }}
                onMouseEnter={() => {
                  const stage = stageRef.current;
                  if (stage) stage.container().style.cursor = 'crosshair';
                }}
                onMouseLeave={() => {
                  const stage = stageRef.current;
                  if (stage) stage.container().style.cursor = 'default';
                }}
              />
            </Layer>
          )}
        </Stage>

        {editingNode && editingGeom && hasText(editingNode.node) && (
          <textarea
            className="text-edit"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              e.stopPropagation();
              if (e.key === 'Escape') {
                e.preventDefault();
                commitText();
              } else if (editingNode.node.type === 'BUTTON' && e.key === 'Enter') {
                e.preventDefault();
                commitText();
              }
            }}
            onBlur={commitText}
            style={{
              left: editingGeom.x * scale + stagePos.x,
              top: editingGeom.y * scale + stagePos.y,
              width: Math.max(24, editingGeom.width * scale),
              height: Math.max(20, editingGeom.height * scale),
              fontSize: (editingStyle.fontSize ?? 16) * scale,
              lineHeight: `${(editingStyle.lineHeight ?? Math.round((editingStyle.fontSize ?? 16) * 1.4)) * scale}px`,
              textAlign: editingStyle.textAlign ?? 'left',
              color: editingStyle.color ?? (editingNode.node.type === 'BUTTON' ? '#FFFFFF' : '#111111'),
              fontWeight: editingStyle.fontWeight ?? 400,
              fontFamily: editingStyle.fontFamily ?? FONT_STACK,
              letterSpacing: (editingStyle.letterSpacing ?? 0) * scale,
              background:
                editingNode.node.type === 'BUTTON'
                  ? editingStyle.background ?? '#1677FF'
                  : 'rgba(255,255,255,0.92)',
              borderRadius: typeof editingStyle.borderRadius === 'number' ? `${editingStyle.borderRadius * scale}px` : '2px',
            }}
            autoFocus
          />
        )}

        <div className="canvas-status">
          <span className="status-page" title={state.page.name}>
            {state.page.name}
          </span>
          <span className="status-sel">{selectedCount ? `已选中 ${selectedCount}` : '未选中'}</span>
          <span className="status-hint">
            空格拖平移 · 滚轮平移 · Ctrl+滚轮缩放 · Shift+1 适应 / Shift+0 100% · 框选 · 右键菜单 · Ctrl+G 成组
          </span>
          <label className="status-snap" title="拖拽时对齐吸附（按住 Alt 临时关闭）">
            <input type="checkbox" checked={snapOn} onChange={(e) => setSnapOn(e.target.checked)} />
            吸附
          </label>
          <span className="status-zoom">
            <button type="button" className="zoom-btn" onClick={() => setScaleCentered(Math.max(0.2, scale / 1.1))}>
              −
            </button>
            <select
              value={zoomValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'fit') fit();
                else if (v !== 'custom') setScaleCentered(Number(v));
              }}
            >
              <option value="fit">适合画布</option>
              <option value="0.5">50%</option>
              <option value="1">100%</option>
              <option value="2">200%</option>
              <option value="4">400%</option>
              <option value="custom">{Math.round(scale * 100)}%</option>
            </select>
            <button type="button" className="zoom-btn" onClick={() => setScaleCentered(Math.min(4, scale * 1.1))}>
              ＋
            </button>
          </span>
        </div>

        {menu && <ContextMenu x={menu.clientX} y={menu.clientY} items={menuItems} onClose={() => setMenu(null)} />}
      </div>
  );
}
