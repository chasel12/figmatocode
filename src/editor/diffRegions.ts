import type { GeometryMap } from '../compiler/layout';
import type { UIPage, UINode } from '../schema/types';

/**
 * Pixel Diff 差异区域分析（FR-23）：
 * 基于 pixelmatch 的差异掩码（diff 输出中精确 #FF0000 像素，已实测与 diffPixels 一致）
 * 做连通域提取 → 归属到 Layout Resolver 几何节点 → 输出位置/尺寸误差与分类。
 *
 * 归属规则：优先归属非 FRAME 节点（TEXT/BUTTON/IMAGE/RECTANGLE，外扩 3px 容差）；
 * 无叶子命中时归属 FRAME——有子节点视为间距（Spacing），无子节点视为框体本身。
 * 分类为启发式（§8.6 维度），目标是「可检测、可定位」（§8.9），不追求自动修复。
 * 局限：单边尺寸偏差与纯水平位移的像素签名相同，仅凭外接矩形无法区分（热图辅助人工判读）。
 */

export type DiffCategory = 'Layout' | 'Typography' | 'Color' | 'Spacing' | 'Size' | 'Position';

export interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  pixels: number;
  /** 归属节点名（无法归属为 null） */
  node: string | null;
  category: DiffCategory;
}

export interface NodeDiffError {
  nodeId: string;
  node: string;
  type: string;
  /** 差异并集外接矩形相对节点几何的偏移：位置误差（可为负） */
  dx: number;
  dy: number;
  /** 差异并集外接矩形相对节点几何的尺寸差：尺寸误差 */
  dw: number;
  dh: number;
  pixels: number;
  category: DiffCategory;
}

export interface DiffAnalysis {
  regions: DiffRegion[];
  nodeErrors: NodeDiffError[];
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NodeEntry {
  id: string;
  name: string;
  type: string;
  rect: Rect;
  depth: number;
  frame: boolean;
}

const MASK_TOLERANCE = 3;
const MIN_REGION_PIXELS = 4;
const MAX_REGIONS = 60;
const CATEGORY_OFFSET_THRESHOLD = 2;

/** pixelmatch 差异输出中，实际差异像素为精确 #FF0000（不透明）；匹配像素为透明/原色 */
export function buildDiffMask(rgba: Uint8ClampedArray, total: number): Uint8Array {
  const mask = new Uint8Array(total);
  for (let i = 0, p = 0; p < total; p++, i += 4) {
    if (rgba[i] === 255 && rgba[i + 1] === 0 && rgba[i + 2] === 0 && rgba[i + 3] === 255) mask[p] = 1;
  }
  return mask;
}

/** 4 连通泛洪提取连通域，按像素数降序截断 */
export function findRegions(
  mask: Uint8Array,
  width: number,
  height: number,
  minPixels = MIN_REGION_PIXELS,
  maxRegions = MAX_REGIONS,
): Array<Rect & { pixels: number }> {
  const visited = new Uint8Array(mask.length);
  const out: Array<Rect & { pixels: number }> = [];
  const stack: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    let minX = width,
      minY = height,
      maxX = -1,
      maxY = -1,
      count = 0;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      count++;
      const x = p % width;
      const y = (p / width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && mask[p - 1] && !visited[p - 1]) {
        visited[p - 1] = 1;
        stack.push(p - 1);
      }
      if (x < width - 1 && mask[p + 1] && !visited[p + 1]) {
        visited[p + 1] = 1;
        stack.push(p + 1);
      }
      if (y > 0 && mask[p - width] && !visited[p - width]) {
        visited[p - width] = 1;
        stack.push(p - width);
      }
      if (y < height - 1 && mask[p + width] && !visited[p + width]) {
        visited[p + width] = 1;
        stack.push(p + width);
      }
    }
    if (count >= minPixels) out.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, pixels: count });
  }
  out.sort((a, b) => b.pixels - a.pixels);
  return out.slice(0, maxRegions);
}

function collectNodes(page: UIPage, geometry: GeometryMap): NodeEntry[] {
  const rootGeom = geometry[page.root.id];
  const ox = rootGeom ? rootGeom.x : 0;
  const oy = rootGeom ? rootGeom.y : 0;
  const out: NodeEntry[] = [];
  const walk = (node: UINode, depth: number): void => {
    const g = geometry[node.id];
    if (g && node.type !== 'PAGE') {
      out.push({
        id: node.id,
        name: node.name || node.id,
        type: node.type,
        rect: { x: g.x - ox, y: g.y - oy, width: g.width, height: g.height },
        depth,
        frame: node.type === 'FRAME',
      });
    }
    if (node.type === 'PAGE' || node.type === 'FRAME') {
      node.children.forEach((c) => walk(c, depth + 1));
    }
  };
  walk(page.root, 0);
  return out;
}

function expand(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, width: r.width + by * 2, height: r.height + by * 2 };
}

function intersectArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function unionRect(rects: Rect[]): Rect {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const r of rects) {
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.width > maxX) maxX = r.x + r.width;
    if (r.y + r.height > maxY) maxY = r.y + r.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** 非 FRAME 节点按深度降序，平级/包含关系时更深（更具体）的节点优先 */
function bySpecificity(nodes: NodeEntry[]): NodeEntry[] {
  return [...nodes].sort((a, b) => b.depth - a.depth);
}

function attributeRegion(
  region: Rect,
  leaves: NodeEntry[],
  frames: NodeEntry[],
): { entry: NodeEntry | null; category: DiffCategory } {
  let best: NodeEntry | null = null;
  let bestArea = 0;
  for (const leaf of leaves) {
    const a = intersectArea(region, expand(leaf.rect, MASK_TOLERANCE));
    if (a >= bestArea && a > 0) {
      bestArea = a;
      best = leaf;
    }
  }
  if (best) return { entry: best, category: 'Layout' };

  for (const frame of frames) {
    if (intersectArea(region, expand(frame.rect, MASK_TOLERANCE)) <= 0) continue;
    if (frame.type === 'FRAME') {
      // FRAME 内部、无叶子命中：视为子节点间距/内边距区域
      return { entry: null, category: 'Spacing' };
    }
    return { entry: frame, category: 'Layout' };
  }
  return { entry: null, category: 'Layout' };
}

function nodeCategory(entry: NodeEntry, union: Rect, areaRatio: number): DiffCategory {
  const dx = union.x - entry.rect.x;
  const dy = union.y - entry.rect.y;
  const dw = union.width - entry.rect.width;
  const dh = union.height - entry.rect.height;
  // 顺序敏感：先判位移（并集起点偏移），再判文本度量，再判超出节点的单向扩展，最后按覆盖率判填充差异
  if (Math.abs(dx) >= CATEGORY_OFFSET_THRESHOLD || Math.abs(dy) >= CATEGORY_OFFSET_THRESHOLD) return 'Position';
  if ((entry.type === 'TEXT' || entry.type === 'BUTTON') && areaRatio >= 0.5) return 'Typography';
  if (dw >= CATEGORY_OFFSET_THRESHOLD || dh >= CATEGORY_OFFSET_THRESHOLD) return 'Size';
  if (areaRatio >= 0.6) return 'Color';
  return 'Layout';
}

export function analyzeDiffRegions(
  page: UIPage,
  geometry: GeometryMap,
  mask: Uint8Array,
  width: number,
  height: number,
): DiffAnalysis {
  const raw = findRegions(mask, width, height);
  const nodes = collectNodes(page, geometry);
  const leaves = bySpecificity(nodes.filter((n) => !n.frame));
  const frames = bySpecificity(nodes.filter((n) => n.frame));

  const regions: DiffRegion[] = [];
  const byNode = new Map<string, { entry: NodeEntry; rects: Rect[]; pixels: number }>();

  for (const r of raw) {
    const rect: Rect = { x: r.x, y: r.y, width: r.width, height: r.height };
    const { entry, category } = attributeRegion(rect, leaves, frames);
    if (entry) {
      const bucket = byNode.get(entry.id) ?? { entry, rects: [], pixels: 0 };
      bucket.rects.push(rect);
      bucket.pixels += r.pixels;
      byNode.set(entry.id, bucket);
      regions.push({ ...rect, pixels: r.pixels, node: entry.name, category });
    } else {
      regions.push({ ...rect, pixels: r.pixels, node: null, category });
    }
  }

  const nodeErrors: NodeDiffError[] = [];
  for (const bucket of byNode.values()) {
    const union = unionRect(bucket.rects);
    const inter = intersectArea(union, bucket.entry.rect);
    const nodeArea = bucket.entry.rect.width * bucket.entry.rect.height;
    const areaRatio = nodeArea > 0 ? Math.min(inter / nodeArea, 1) : 0;
    nodeErrors.push({
      nodeId: bucket.entry.id,
      node: bucket.entry.name,
      type: bucket.entry.type,
      dx: union.x - bucket.entry.rect.x,
      dy: union.y - bucket.entry.rect.y,
      dw: union.width - bucket.entry.rect.width,
      dh: union.height - bucket.entry.rect.height,
      pixels: bucket.pixels,
      category: nodeCategory(bucket.entry, union, areaRatio),
    });
  }
  nodeErrors.sort((a, b) => b.pixels - a.pixels);

  return { regions, nodeErrors };
}
