import { describe, expect, it } from 'vitest';
import {
  isEditablePathD,
  parsePathD,
  pointsToPathD,
  rebuildFromPoints,
  type PenDraftPoint,
} from '../src/editor/tools/penCore';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { editorReducer, initialState } from '../src/editor/store';
import type { VectorNode } from '../src/schema/types';

resetIdSeq(0);

describe('P1-04 d ⇄ 点集往返（锚点二次编辑的地基）', () => {
  it('直线折线往返：d → 点集 → d 字节一致', () => {
    const pts: PenDraftPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const d = pointsToPathD(pts, false);
    const parsed = parsePathD(d);
    expect(parsed.ok).toBe(true);
    expect(parsed.closed).toBe(false);
    expect(pointsToPathD(parsed.points, parsed.closed)).toBe(d);
  });

  it('闭合路径往返：Z 被识别且 d 一致', () => {
    const pts: PenDraftPoint[] = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
    ];
    const d = pointsToPathD(pts, true);
    const parsed = parsePathD(d);
    expect(parsed.closed).toBe(true);
    expect(parsed.points).toHaveLength(3);
    expect(pointsToPathD(parsed.points, parsed.closed)).toBe(d);
  });

  it('贝塞尔往返：C 段手柄被正确反推', () => {
    const pts: PenDraftPoint[] = [
      { x: 0, y: 0, hx: 10, hy: 0 },
      { x: 30, y: 0, hx: 10, hy: 0 },
    ];
    const d = pointsToPathD(pts, false);
    expect(d).toContain(' C ');
    const parsed = parsePathD(d);
    expect(parsed.ok).toBe(true);
    // 手柄反推正确 → 再序列化字节一致（这是往返的核心保证）
    expect(pointsToPathD(parsed.points, parsed.closed)).toBe(d);
  });

  it('混排（L 段 + C 段）往返一致', () => {
    const pts: PenDraftPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10, hx: 5, hy: 5 },
    ];
    const d = pointsToPathD(pts, false);
    const parsed = parsePathD(d);
    expect(parsed.ok).toBe(true);
    expect(pointsToPathD(parsed.points, parsed.closed)).toBe(d);
  });

  it('闭合曲线往返一致', () => {
    const pts: PenDraftPoint[] = [
      { x: 0, y: 0, hx: 1, hy: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const d = pointsToPathD(pts, true);
    const parsed = parsePathD(d);
    expect(parsed.ok).toBe(true);
    expect(pointsToPathD(parsed.points, parsed.closed)).toBe(d);
  });

  it('单点占位往返', () => {
    const d = pointsToPathD([{ x: 5, y: 6 }], false);
    const parsed = parsePathD(d);
    expect(parsed.ok).toBe(true);
    expect(parsed.points).toHaveLength(1);
  });

  it('空 d → 空点集且 ok', () => {
    expect(parsePathD('')).toEqual({ points: [], closed: false, ok: true });
    expect(parsePathD('   ').points).toEqual([]);
  });

  it('**外来指令（Q/A/S/T）→ ok:false**（宁可不给编辑，也不改坏路径）', () => {
    for (const d of ['M 0 0 Q 5 5 10 10', 'M 0 0 A 5 5 0 0 1 10 10', 'M 0 0 S 5 5 10 10', 'M 0 0 T 10 10']) {
      const parsed = parsePathD(d);
      expect(parsed.ok, `${d} 应判不可编辑`).toBe(false);
      expect(isEditablePathD(d)).toBe(false);
    }
  });

  it('小数坐标往返保精度（两位）', () => {
    const pts: PenDraftPoint[] = [
      { x: 1.23, y: 4.56 },
      { x: 7.89, y: 0.12 },
    ];
    const d = pointsToPathD(pts, false);
    const parsed = parsePathD(d);
    expect(pointsToPathD(parsed.points, parsed.closed)).toBe(d);
  });
});

describe('P1-04 rebuildFromPoints（锚点移动后重算 d 与包围盒）', () => {
  it('单锚点外移 → 包围盒变大且 d 反映新位置', () => {
    const before: PenDraftPoint[] = [
      { x: 100, y: 100 },
      { x: 140, y: 100 },
      { x: 140, y: 140 },
    ];
    const b0 = rebuildFromPoints(before, false);
    // 把末锚点右移 60
    const after = before.map((p, i) => (i === 2 ? { ...p, x: p.x + 60 } : p));
    const b1 = rebuildFromPoints(after, false);
    expect(b1.bounds.width).toBeGreaterThan(b0.bounds.width);
    expect(b1.d).not.toBe(b0.d);
  });

  it('本地坐标按新包围盒归零（原点跟随最左/最上锚点）', () => {
    const pts: PenDraftPoint[] = [
      { x: 50, y: 50 },
      { x: 90, y: 50 },
    ];
    const { d, bounds } = rebuildFromPoints(pts, false);
    // bounds 含 8px 余量 → 本地首点为 (8,8)
    expect(d.startsWith('M 8 8')).toBe(true);
    expect(bounds.x).toBe(42);
    expect(bounds.y).toBe(42);
  });

  it('空点集 → 空 d + 零包围盒', () => {
    expect(rebuildFromPoints([], false)).toEqual({ d: '', bounds: { x: 0, y: 0, width: 0, height: 0 } });
  });

  it('重建后再解析仍可编辑（往返闭环）', () => {
    const pts: PenDraftPoint[] = [
      { x: 10, y: 10, hx: 4, hy: 0 },
      { x: 50, y: 30 },
    ];
    const { d } = rebuildFromPoints(pts, false);
    expect(isEditablePathD(d)).toBe(true);
    const reparsed = parsePathD(d);
    expect(pointsToPathD(reparsed.points, reparsed.closed)).toBe(d);
  });
});

describe('P1-04 store：UPDATE_VECTOR_D', () => {
  function stateWithVector(): { s: ReturnType<typeof initialState>; id: string } {
    const page = createPage('P1-04 页');
    const v = createNode('VECTOR') as VectorNode;
    v.vector = { d: 'M 0 0 L 10 0 L 10 10' };
    v.layout.width = 20;
    v.layout.height = 20;
    page.root.children.push(v);
    return { s: initialState(page, 'p'), id: v.id };
  }

  it('写回 d 并同步几何', () => {
    const { s, id } = stateWithVector();
    const out = editorReducer(s, {
      type: 'UPDATE_VECTOR_D',
      id,
      d: 'M 0 0 L 30 0 L 30 30',
      patch: { width: 40, height: 40 },
    });
    const v = out.page.root.children[0] as VectorNode;
    expect(v.vector?.d).toBe('M 0 0 L 30 0 L 30 30');
    expect(v.layout.width).toBe(40);
    expect(v.layout.height).toBe(40);
  });

  it('transient 编辑不立即压栈（拖动中），COMMIT 后入栈', () => {
    const { s, id } = stateWithVector();
    const t1 = editorReducer(s, { type: 'UPDATE_VECTOR_D', id, d: 'M 0 0 L 15 0', transient: true });
    expect(t1.past).toHaveLength(0);
    expect(t1.pendingBaseline).toBeTruthy();
    const t2 = editorReducer(t1, { type: 'UPDATE_VECTOR_D', id, d: 'M 0 0 L 20 0', transient: true });
    expect(t2.past).toHaveLength(0);
    const done = editorReducer(t2, { type: 'COMMIT' });
    expect(done.past.length).toBeGreaterThan(0);
    expect(done.pendingBaseline).toBeNull();
  });

  it('非 VECTOR 节点返回原 state（防御）', () => {
    const page = createPage('x');
    page.root.children.push(createNode('RECTANGLE'));
    const s = initialState(page, 'p');
    const rId = s.page.root.children[0].id;
    expect(editorReducer(s, { type: 'UPDATE_VECTOR_D', id: rId, d: 'M 0 0' })).toBe(s);
  });

  it('未知 id 返回原 state', () => {
    const { s } = stateWithVector();
    expect(editorReducer(s, { type: 'UPDATE_VECTOR_D', id: 'nope', d: 'M 0 0' })).toBe(s);
  });

  it('保留既有 fillRule（只改 d）', () => {
    const page = createPage('fr');
    const v = createNode('VECTOR') as VectorNode;
    v.vector = { d: 'M 0 0 L 10 0', fillRule: 'evenodd' };
    page.root.children.push(v);
    const s = initialState(page, 'p');
    const out = editorReducer(s, { type: 'UPDATE_VECTOR_D', id: v.id, d: 'M 0 0 L 20 0' });
    const outV = out.page.root.children[0] as VectorNode;
    expect(outV.vector?.fillRule).toBe('evenodd');
    expect(outV.vector?.d).toBe('M 0 0 L 20 0');
  });

  it('可撤销（非 transient）', () => {
    const { s, id } = stateWithVector();
    const out = editorReducer(s, { type: 'UPDATE_VECTOR_D', id, d: 'M 0 0 L 99 0' });
    const undone = editorReducer(out, { type: 'UNDO' });
    const v = undone.page.root.children[0] as VectorNode;
    expect(v.vector?.d).toBe('M 0 0 L 10 0 L 10 10');
  });
});

describe('多子路径 d（布尔结果）round-trip 不毁形', () => {
  it('双子路径闭合 d：parse 返回 subpaths 结构', () => {
    const d = 'M 0 0 L 20 0 L 20 20 L 0 20 Z M 10 10 L 30 10 L 30 30 L 10 30 Z';
    const parsed = parsePathD(d);
    expect(parsed.ok).toBe(true);
    expect(parsed.subpaths).toHaveLength(2);
    expect(parsed.subpaths?.[1].start).toBe(4);
  });

  it('rebuildFromPoints 带 subpaths：M 数与闭合结构保持（单路径行为不变）', () => {
    const d = 'M 0 0 L 20 0 L 20 20 L 0 20 Z M 10 10 L 30 10 L 30 30 L 10 30 Z';
    const parsed = parsePathD(d);
    const abs = parsed.points.map((p) => ({ ...p, x: p.x + 50, y: p.y + 50 }));
    const r = rebuildFromPoints(abs, parsed.closed, parsed.subpaths);
    expect((r.d.match(/M/g) || []).length).toBe(2);
    expect((r.d.match(/Z/g) || []).length).toBe(2);
    // 每段各自闭合，不出现跨子路径连线
    expect(r.d).toMatch(/Z M/);
  });

  it('拖一锚点后其余子路径形状不互连（结构保持）', () => {
    const d = 'M 0 0 L 20 0 L 20 20 L 0 20 Z M 10 10 L 30 10 L 30 30 L 10 30 Z';
    const parsed = parsePathD(d);
    const pts = parsed.points.map((p, i) => (i === 0 ? { ...p, x: p.x + 5 } : p));
    const r = rebuildFromPoints(pts, parsed.closed, parsed.subpaths);
    const after = parsePathD(r.d);
    expect(after.subpaths).toHaveLength(2);
    expect(after.points).toHaveLength(parsed.points.length);
  });

  it('单子路径不返回 subpaths 键（toEqual 契约与旧行为）', () => {
    const parsed = parsePathD('M 0 0 L 10 0 L 10 10 Z');
    expect(parsed.subpaths).toBeUndefined();
  });
});
