/**
 * FR-44 连接线纯函数单源——Canvas 渲染/落点与单测共用。
 * 口径：锚点取外接矩形四边中点，路径为三次贝塞尔（控制点沿锚点外法线外推），
 * 全部数值两位小数定形（与 penCore 同确定性纪律）。
 */
import { findById } from '../../schema/factory';
import type { ContainerNode, PrototypeInteraction, UINode } from '../../schema/types';

export interface ConnGeom {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConnAnchor {
  x: number;
  y: number;
  side: 'n' | 'e' | 's' | 'w';
}

const SIDE_VEC: Record<ConnAnchor['side'], { x: number; y: number }> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};

/** 四边中点锚（Figma 连线吸附位）。返回顺序 n/e/s/w（稳定枚举）。 */
export function edgeAnchors(g: ConnGeom): ConnAnchor[] {
  return [
    { x: g.x + g.width / 2, y: g.y, side: 'n' },
    { x: g.x + g.width, y: g.y + g.height / 2, side: 'e' },
    { x: g.x + g.width / 2, y: g.y + g.height, side: 's' },
    { x: g.x, y: g.y + g.height / 2, side: 'w' },
  ];
}

/**
 * 最优锚点对：距离最小的 (源, 目标) 边中点组合。
 * 候选序源 [e,w,n,s] × 目标 [w,e,s,n]——等距时首选水平 e→w（Figma 左右并排 Frame 的默认出线方向）。
 */
export function pickAnchors(src: ConnGeom, tgt: ConnGeom): { from: ConnAnchor; to: ConnAnchor } {
  const sa = edgeAnchors(src);
  const ta = edgeAnchors(tgt);
  const order = (list: ConnAnchor[], want: ConnAnchor['side'][]): ConnAnchor[] =>
    want.map((s) => list.find((a) => a.side === s)!);
  const srcOrd = order(sa, ['e', 'w', 'n', 's']);
  const tgtOrd = order(ta, ['w', 'e', 's', 'n']);
  let best: { from: ConnAnchor; to: ConnAnchor } | null = null;
  let bestD = Infinity;
  for (const f of srcOrd) {
    for (const t of tgtOrd) {
      const d = Math.hypot(t.x - f.x, t.y - f.y);
      if (d < bestD) {
        bestD = d;
        best = { from: f, to: t };
      }
    }
  }
  return best!;
}

const r2 = (v: number): number => Math.round(v * 100) / 100;

/** 贝塞尔出线路径串：控制点沿锚点外法线外推 max(40, 0.4×直线距)。 */
export function connectorPathD(from: ConnAnchor, to: ConnAnchor): string {
  const straight = Math.hypot(to.x - from.x, to.y - from.y);
  const k = Math.max(40, straight * 0.4);
  const c1 = { x: from.x + SIDE_VEC[from.side].x * k, y: from.y + SIDE_VEC[from.side].y * k };
  const c2 = { x: to.x + SIDE_VEC[to.side].x * k, y: to.y + SIDE_VEC[to.side].y * k };
  return `M ${r2(from.x)} ${r2(from.y)} C ${r2(c1.x)} ${r2(c1.y)} ${r2(c2.x)} ${r2(c2.y)} ${r2(to.x)} ${r2(to.y)}`;
}

/**
 * 箭头三角（入端）：尖在 to，底沿外法线方向、垂直展开。
 * 返回展平点集 [tipX,tipY, b1X,b1Y, b2X,b2Y]，供 Konva.Line closed 渲染。
 */
export function arrowHeadPoints(to: ConnAnchor, size = 8): number[] {
  const v = SIDE_VEC[to.side]; // 外法线（离开节点方向）
  const bx = to.x + v.x * size;
  const by = to.y + v.y * size;
  const w = size * 0.55;
  return [r2(to.x), r2(to.y), r2(bx - v.y * w), r2(by + v.x * w), r2(bx + v.y * w), r2(by - v.x * w)];
}

/** 落点解析：命中节点 → 最近 FRAME 祖先（含自身；PAGE 根不是 FRAME → null）。 */
export function nearestFrameAncestor(root: UINode, nodeId: string): ContainerNode | null {
  let cur = findById(root, nodeId)?.node ?? null;
  while (cur) {
    if (cur.type === 'FRAME') return cur as ContainerNode;
    const parent = findById(root, cur.id)?.parent ?? null;
    if (parent === cur) return null;
    cur = parent;
  }
  return null;
}

/** 交互 id（与 PrototypePanel 原实现同规格，移入本模块单源）。 */
export function nextInteractionId(existing: PrototypeInteraction[]): string {
  let n = existing.length + 1;
  const ids = new Set(existing.map((i) => i.id));
  while (ids.has(`pi-${n}`)) n += 1;
  return `pi-${n}`;
}

/** 拖连接落定 → ON_CLICK + NAVIGATE + INSTANT（Figma 拖线默认）。返回替换用整列表。 */
export function makeNavigateInteraction(
  existing: PrototypeInteraction[],
  targetId: string,
): { list: PrototypeInteraction[]; id: string } {
  const id = nextInteractionId(existing);
  const it: PrototypeInteraction = {
    id,
    trigger: 'ON_CLICK',
    action: 'NAVIGATE',
    targetId,
    transition: { kind: 'INSTANT' },
  };
  return { list: [...existing, it], id };
}
