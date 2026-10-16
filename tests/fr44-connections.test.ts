/**
 * FR-44 连接线纯函数 + 拖线创建落库（单测单源）。
 * 覆盖：锚点枚举 / 最优锚点对（含 Figma 水平偏好）/ 贝塞尔串确定性两位小数 / 箭头点集 /
 * 落点最近 FRAME 祖先 / Navigate 交互构造与 pi-N 防撞 / UPDATE_INTERACTIONS 写回。
 */
import { describe, expect, it } from 'vitest';
import {
  arrowHeadPoints,
  connectorPathD,
  edgeAnchors,
  makeNavigateInteraction,
  nearestFrameAncestor,
  nextInteractionId,
  pickAnchors,
} from '../src/editor/tools/connections';
import { createNode, createPage } from '../src/schema/factory';
import { editorReducer, initialState } from '../src/editor/store';
import type { ContainerNode, PrototypeInteraction } from '../src/schema/types';

describe('FR-44 连接线几何（tools/connections）', () => {
  it('edgeAnchors：四边中点，序 n/e/s/w', () => {
    const a = edgeAnchors({ x: 0, y: 0, width: 100, height: 60 });
    expect(a.map((p) => p.side)).toEqual(['n', 'e', 's', 'w']);
    expect(a[0]).toEqual({ x: 50, y: 0, side: 'n' });
    expect(a[1]).toEqual({ x: 100, y: 30, side: 'e' });
    expect(a[2]).toEqual({ x: 50, y: 60, side: 's' });
    expect(a[3]).toEqual({ x: 0, y: 30, side: 'w' });
  });

  it('pickAnchors：左右并排取水平 e→w', () => {
    const src = { x: 0, y: 0, width: 100, height: 100 };
    const tgt = { x: 200, y: 0, width: 100, height: 100 };
    const { from, to } = pickAnchors(src, tgt);
    expect([from.side, to.side]).toEqual(['e', 'w']);
  });

  it('pickAnchors：上下堆叠取垂直 s→n', () => {
    const src = { x: 0, y: 0, width: 100, height: 100 };
    const tgt = { x: 0, y: 200, width: 100, height: 100 };
    const { from, to } = pickAnchors(src, tgt);
    expect([from.side, to.side]).toEqual(['s', 'n']);
  });

  it('connectorPathD：M/C 结构、端点锚定（取整口径一致）、确定性', () => {
    const src = { x: 0, y: 0, width: 100, height: 100 };
    const tgt = { x: 333.5, y: 50, width: 100, height: 100 };
    const { from, to } = pickAnchors(src, tgt);
    const d = connectorPathD(from, to);
    const r2 = (v: number) => Math.round(v * 100) / 100;
    expect(d.startsWith(`M ${r2(from.x)} ${r2(from.y)} C `)).toBe(true);
    expect(d.endsWith(`${r2(to.x)} ${r2(to.y)}`)).toBe(true);
    expect(d).toBe(connectorPathD(from, to));
    const decimals = d.match(/\d+\.\d{3,}/g);
    expect(decimals).toBeNull();
  });

  it('arrowHeadPoints：6 点数、尖端=锚点、外法线展开', () => {
    const a = { x: 10, y: 20, side: 'w' as const };
    const pts = arrowHeadPoints(a, 8);
    expect(pts).toHaveLength(6);
    expect(pts.slice(0, 2)).toEqual([10, 20]);
    // w 侧外法线 (-1,0)：底点在节点外侧，x 均小于尖端
    expect(pts[2]).toBeLessThan(10);
    expect(pts[4]).toBeLessThan(10);
  });
});

describe('FR-44 落点与交互构造', () => {
  function pageWithFrames() {
    const page = createPage('连线页');
    const f1 = createNode('FRAME') as ContainerNode;
    const child = createNode('RECTANGLE');
    f1.children.push(child);
    const f2 = createNode('FRAME') as ContainerNode;
    page.root.children.push(f1, f2);
    return { page, f1, child, f2 };
  }

  it('nearestFrameAncestor：子矩形→所在 Frame；Frame 自身→自身；PAGE 根→null', () => {
    const { page, f1, child } = pageWithFrames();
    expect(nearestFrameAncestor(page.root, child.id)?.id).toBe(f1.id);
    expect(nearestFrameAncestor(page.root, f1.id)?.id).toBe(f1.id);
    expect(nearestFrameAncestor(page.root, page.root.id)).toBeNull();
  });

  it('makeNavigateInteraction：追加不改原表、ON_CLICK/NAVIGATE/INSTANT、pi-N id', () => {
    const { page, f1, f2 } = pageWithFrames();
    const existing: PrototypeInteraction[] = [];
    const { list, id } = makeNavigateInteraction(existing, f2.id);
    expect(existing).toHaveLength(0);
    expect(list).toHaveLength(1);
    expect(id).toMatch(/^pi-/);
    expect(list[0]).toMatchObject({ trigger: 'ON_CLICK', action: 'NAVIGATE', targetId: f2.id, transition: { kind: 'INSTANT' } });
    void page;
    void f1;
  });

  it('nextInteractionId：撞位跳过（pi-2 存在且 length=1 → pi-3）', () => {
    const mk = (id: string): PrototypeInteraction => ({ id, trigger: 'ON_CLICK', action: 'BACK' });
    expect(nextInteractionId([mk('pi-2')])).toBe('pi-3');
    expect(nextInteractionId([mk('pi-1')])).toBe('pi-2');
    expect(nextInteractionId([])).toBe('pi-1');
  });

  it('UPDATE_INTERACTIONS 写回：拖线产物入 node.interactions；清列表落 undefined', () => {
    const { page, f1, f2 } = pageWithFrames();
    const s = initialState(page, 'p');
    const { list } = makeNavigateInteraction(f1.interactions ?? [], f2.id);
    const out = editorReducer({ ...s, selectedIds: [f1.id] }, { type: 'UPDATE_INTERACTIONS', id: f1.id, interactions: list });
    const node = out.page.root.children.find((c) => c.id === f1.id) as ContainerNode;
    expect(node.interactions).toHaveLength(1);
    expect(node.interactions?.[0].targetId).toBe(f2.id);
    const out2 = editorReducer(out, { type: 'UPDATE_INTERACTIONS', id: f1.id, interactions: [] });
    const node2 = out2.page.root.children.find((c) => c.id === f1.id) as ContainerNode;
    expect(node2.interactions).toBeUndefined();
  });
});
