import { describe, expect, it } from 'vitest';
import { createPage, findById } from '../src/schema/factory';
import { isContainer } from '../src/schema/types';
import { editorReducer, initialState } from '../src/editor/store';
import type { EditorState } from '../src/editor/store';
import { computeSnap } from '../src/editor/snapping';
import { alignPatches, distributePatches } from '../src/editor/align';

describe('FR-2 吸附（computeSnap）', () => {
  it('边缘在阈值内：修正位移到对齐位置并给出参考线', () => {
    const res = computeSnap({ x: 102, y: 50, width: 40, height: 20 }, [{ x: 100, y: 0, width: 50, height: 300 }], 6);
    expect(res.dx).toBe(-2);
    expect(res.guides.length).toBeGreaterThanOrEqual(1);
    const gx = res.guides.find((g) => g.axis === 'x');
    expect(gx?.pos).toBe(100);
  });

  it('中心线优先于边缘（diff 最小者胜）', () => {
    const res = computeSnap({ x: 105, y: 500, width: 40, height: 20 }, [{ x: 100, y: 0, width: 50, height: 300 }], 6);
    // moving 中心 125 === ref 中心 125 → dx=0（左边缘差 5 不是最近）
    expect(res.dx).toBe(0);
    const gx = res.guides.find((g) => g.axis === 'x');
    expect(gx?.pos).toBe(125);
  });

  it('超出阈值不吸附', () => {
    const res = computeSnap({ x: 140, y: 500, width: 40, height: 20 }, [{ x: 100, y: 0, width: 50, height: 300 }], 6);
    expect(res.dx).toBe(0);
    expect(res.dy).toBe(0);
    expect(res.guides).toHaveLength(0);
  });

  it('正交空隙标注（gap）', () => {
    const res = computeSnap({ x: 0, y: 150, width: 100, height: 50 }, [{ x: 0, y: 0, width: 100, height: 100 }], 6);
    expect(res.dx).toBe(0); // x 边缘已对齐
    expect(res.dy).toBe(0); // y 无对齐目标
    const gx = res.guides.find((g) => g.axis === 'x');
    expect(gx?.gap).toBe(50);
  });
});

describe('FR-10 对齐与等距分布（纯函数）', () => {
  const a = { id: 'a', rect: { x: 0, y: 0, width: 50, height: 50 } };
  const b = { id: 'b', rect: { x: 100, y: 0, width: 50, height: 50 } };

  it('左对齐到选区包围盒', () => {
    const patches = alignPatches([a, b], 'left');
    expect(patches.find((p) => p.id === 'b')?.x).toBe(0);
    expect(patches.find((p) => p.id === 'a')?.x).toBe(0);
    expect(patches.find((p) => p.id === 'a')?.y).toBeUndefined(); // 仅变更目标轴
  });

  it('底对齐', () => {
    const patches = alignPatches([a, { id: 'c', rect: { x: 0, y: 80, width: 20, height: 40 } }], 'bottom');
    expect(patches.find((p) => p.id === 'a')?.y).toBe(120 - 50);
    expect(patches.find((p) => p.id === 'c')?.y).toBe(120 - 40);
  });

  it('水平等距分布：首尾贴住包围盒，间隙相等', () => {
    const items = [
      { id: 'a', rect: { x: 0, y: 0, width: 30, height: 10 } },
      { id: 'b', rect: { x: 50, y: 0, width: 30, height: 10 } },
      { id: 'c', rect: { x: 200, y: 0, width: 30, height: 10 } },
    ];
    const patches = distributePatches(items, 'h');
    // 包围盒 0..230，总宽 90，gap=(230-90)/2=70 → b→100, c→200
    expect(patches.find((p) => p.id === 'b')?.x).toBe(100);
    expect(patches.find((p) => p.id === 'c')?.x).toBe(200);
    expect(patches.find((p) => p.id === 'a')).toBeUndefined();
  });

  it('少于 3 项不分布', () => {
    expect(distributePatches([a, b], 'h')).toHaveLength(0);
  });
});

/** 根下 FRAME（ABSOLUTE）内两个 RECTANGLE */
function seededAbs(): { state: EditorState; frameId: string; r1: string; r2: string } {
  let state = initialState(createPage('abs页'), '项目');
  state = editorReducer(state, { type: 'ADD_NODE', kind: 'FRAME' });
  const frameId = state.page.root.children[0].id;
  state = editorReducer(state, { type: 'UPDATE_LAYOUT', id: frameId, patch: { mode: 'ABSOLUTE' } });
  state = editorReducer(state, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: frameId });
  const r1 = state.selectedIds[0];
  state = editorReducer(state, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: frameId });
  const r2 = state.selectedIds[0];
  return { state, frameId, r1, r2 };
}

describe('M1 store actions', () => {
  it('SELECT_MANY 过滤页面根', () => {
    let state = initialState(createPage('t'), 'p');
    state = editorReducer(state, { type: 'ADD_NODE', kind: 'RECTANGLE' });
    const rid = state.selectedIds[0];
    state = editorReducer(state, { type: 'SELECT_MANY', ids: [rid, state.page.root.id] });
    expect(state.selectedIds).toEqual([rid]);
  });

  it('SET_TOOL 切换工具，重复设置为无操作', () => {
    let state = initialState(createPage('t'), 'p');
    expect(state.tool).toBe('select');
    state = editorReducer(state, { type: 'SET_TOOL', tool: 'hand' });
    expect(state.tool).toBe('hand');
    const same = editorReducer(state, { type: 'SET_TOOL', tool: 'hand' });
    expect(same).toBe(state);
  });

  it('NUDGE 仅移动绝对定位子级；流式子级不动（Figma 语义）', () => {
    const { state: abs, r1 } = seededAbs();
    let s = editorReducer(abs, { type: 'SELECT_MANY', ids: [r1] });
    const before = findById(s.page.root, r1)!.node.layout;
    const x0 = before.x ?? 0;
    s = editorReducer(s, { type: 'NUDGE', dx: 5, dy: -3 });
    const after = findById(s.page.root, r1)!.node.layout;
    expect(after.x).toBe(x0 + 5);
    expect(after.y).toBe((before.y ?? 0) - 3);
    expect(s.pendingBaseline).not.toBeNull(); // 微调是一次可撤销操作

    // 流式：根直接子节点（父级 PAGE 为 VERTICAL）
    let flow = initialState(createPage('flow'), 'p');
    flow = editorReducer(flow, { type: 'ADD_NODE', kind: 'RECTANGLE' });
    const fid = flow.selectedIds[0];
    const fx0 = findById(flow.page.root, fid)!.node.layout.x ?? 0;
    const next = editorReducer(flow, { type: 'NUDGE', dx: 7, dy: 7 });
    expect(findById(next.page.root, fid)!.node.layout.x ?? 0).toBe(fx0);
    expect(next).toBe(flow); // 无操作
  });

  it('NUDGE 支持流父内脱流子项（Ignore auto layout，FR-36）', () => {
    let flow = initialState(createPage('flow'), 'p');
    flow = editorReducer(flow, { type: 'ADD_NODE', kind: 'RECTANGLE' });
    const id = flow.selectedIds[0];
    flow = editorReducer(flow, {
      type: 'UPDATE_LAYOUT',
      id,
      patch: { prevMode: 'VERTICAL', mode: 'ABSOLUTE', x: 40, y: 80 },
    });
    const next = editorReducer(flow, { type: 'NUDGE', dx: 5, dy: -3 });
    const layout = findById(next.page.root, id)!.node.layout;
    expect(layout.x).toBe(45);
    expect(layout.y).toBe(77);
  });

  it('TOGGLE_LOCK 加锁/解锁', () => {
    const { state, r1 } = seededAbs();
    let s = editorReducer(state, { type: 'SELECT_MANY', ids: [r1] });
    s = editorReducer(s, { type: 'TOGGLE_LOCK' });
    expect(findById(s.page.root, r1)!.node.locked).toBe(true);
    s = editorReducer(s, { type: 'TOGGLE_LOCK' });
    expect(findById(s.page.root, r1)!.node.locked).toBe(false);
  });

  it('REORDER_Z 置顶层/置底层', () => {
    let s = initialState(createPage('z'), 'p');
    const rootId = s.page.root.id;
    s = editorReducer(s, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: rootId });
    const a = s.selectedIds[0];
    s = editorReducer(s, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: rootId });
    const b = s.selectedIds[0];
    s = editorReducer(s, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: rootId });
    const c = s.selectedIds[0];
    s = editorReducer(s, { type: 'REORDER_Z', id: a, to: 'front' });
    expect(s.page.root.children.map((x) => x.id)).toEqual([b, c, a]);
    s = editorReducer(s, { type: 'REORDER_Z', id: c, to: 'back' });
    expect(s.page.root.children.map((x) => x.id)).toEqual([c, b, a]);
  });

  it('UPDATE_LAYOUT_MULTI 一次历史提交多个位置补丁', () => {
    const { state, r1, r2 } = seededAbs();
    const pastBefore = state.past.length;
    const next = editorReducer(state, {
      type: 'UPDATE_LAYOUT_MULTI',
      patches: [
        { id: r1, patch: { x: 10 } },
        { id: r2, patch: { x: 60, y: 5 } },
      ],
    });
    expect(findById(next.page.root, r1)!.node.layout.x).toBe(10);
    expect(findById(next.page.root, r2)!.node.layout.x).toBe(60);
    expect(findById(next.page.root, r2)!.node.layout.y).toBe(5);
    expect(next.past.length).toBe(pastBefore + 1);
  });

  it('GROUP 绝对定位：新 frame 包裹成员并携带坐标补丁', () => {
    const { state, r1, r2 } = seededAbs();
    const next = editorReducer(state, {
      type: 'GROUP',
      ids: [r1, r2],
      frameLayout: { x: 10, y: 20, width: 200, height: 100 },
      offsets: { [r1]: { x: 0, y: 0 }, [r2]: { x: 60, y: 0 } },
    });
    expect(next.selectedIds).toHaveLength(1);
    const frame = findById(next.page.root, next.selectedIds[0])!.node;
    expect(frame.type).toBe('FRAME');
    if (!isContainer(frame)) throw new Error('应为容器');
    expect(frame.layout.mode).toBe('ABSOLUTE');
    expect(frame.layout.widthMode).toBe('FIXED');
    expect(frame.layout.x).toBe(10);
    expect(frame.layout.width).toBe(200);
    expect(frame.children.map((c) => c.id)).toEqual([r1, r2]);
    expect(frame.children[0].layout.x).toBe(0);
    expect(frame.children[1].layout.x).toBe(60);
    expect(state.page.root.children[0].id).not.toBe(frame.id); // 原页未被修改
  });

  it('GROUP 流式：继承父级方向并 HUG 尺寸', () => {
    let s = initialState(createPage('g'), 'p');
    const rootId = s.page.root.id;
    s = editorReducer(s, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: rootId });
    const a = s.selectedIds[0];
    s = editorReducer(s, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: rootId });
    const b = s.selectedIds[0];
    const next = editorReducer(s, { type: 'GROUP', ids: [a, b] });
    const frame = findById(next.page.root, next.selectedIds[0])!.node;
    if (!isContainer(frame)) throw new Error('应为容器');
    expect(frame.layout.mode).toBe('VERTICAL');
    expect(frame.layout.widthMode).toBe('HUG');
    expect(frame.children.map((c) => c.id)).toEqual([a, b]);
    expect(next.past.length).toBe(s.past.length + 1);
  });

  it('FR-11 历史保留 ≥100 步', () => {
    let s = initialState(createPage('h'), 'p');
    const rootId = s.page.root.id;
    for (let i = 0; i < 130; i++) {
      s = editorReducer(s, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: rootId });
    }
    expect(s.past.length).toBe(100);
    expect(s.page.root.children).toHaveLength(130);
    // 100 次撤销全部可用
    for (let i = 0; i < 100; i++) s = editorReducer(s, { type: 'UNDO' });
    expect(s.page.root.children).toHaveLength(30);
    expect(s.past).toHaveLength(0);
  });

  it('FR-11 transient 微调与后续提交各自可撤销（基线入栈）', () => {
    let s = initialState(createPage('t'), 'p');
    s = editorReducer(s, { type: 'ADD_NODE', kind: 'FRAME' });
    const frameId = s.page.root.children[0].id;
    const original = findById(s.page.root, frameId)!.node.layout.width;

    s = editorReducer(s, { type: 'UPDATE_LAYOUT', id: frameId, patch: { width: 120 }, transient: true });
    expect(findById(s.page.root, frameId)!.node.layout.width).toBe(120);
    expect(s.pendingBaseline).not.toBeNull();

    s = editorReducer(s, { type: 'UPDATE_LAYOUT', id: frameId, patch: { width: 200 } });
    expect(findById(s.page.root, frameId)!.node.layout.width).toBe(200);
    expect(s.pendingBaseline).toBeNull();

    s = editorReducer(s, { type: 'UNDO' });
    expect(findById(s.page.root, frameId)!.node.layout.width).toBe(120); // 撤销第二次提交
    s = editorReducer(s, { type: 'UNDO' });
    expect(findById(s.page.root, frameId)!.node.layout.width).toBe(original); // 撤销微调本身
    s = editorReducer(s, { type: 'UNDO' });
    expect(s.page.root.children).toHaveLength(0); // 撤销 ADD
  });
});
