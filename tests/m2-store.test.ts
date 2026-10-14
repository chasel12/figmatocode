import { describe, expect, it } from 'vitest';
import { createPage, findById } from '../src/schema/factory';
import { isContainer } from '../src/schema/types';
import { editorReducer, initialState } from '../src/editor/store';
import type { EditorState } from '../src/editor/store';

/** 页面根 → FRAME（FRAME 为当前选中） */
function seeded(): EditorState {
  const page = createPage('测试页');
  let state = initialState(page, '测试项目');
  state = editorReducer(state, { type: 'ADD_NODE', kind: 'FRAME' });
  return state;
}

/** 页面根下按顺序建 n 个 RECTANGLE（显式 parentId：连续 ADD_NODE 时 RECTANGLE 也是容器，会意外嵌套） */
function seedChildren(state: EditorState, n: number): EditorState {
  for (let i = 0; i < n; i++) {
    state = editorReducer(state, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: state.page.root.id });
  }
  return state;
}

describe('FR-29 图层显隐（TOGGLE_VISIBLE）', () => {
  it('默认 undefined → false → 再次恢复 undefined', () => {
    let state = seeded();
    const id = state.selectedIds[0];
    expect(findById(state.page.root, id)?.node.visible).toBeUndefined();

    state = editorReducer(state, { type: 'TOGGLE_VISIBLE', id });
    expect(findById(state.page.root, id)?.node.visible).toBe(false);

    state = editorReducer(state, { type: 'TOGGLE_VISIBLE', id });
    expect(findById(state.page.root, id)?.node.visible).toBeUndefined();
  });

  it('页面根不可隐藏', () => {
    const state = seeded();
    const next = editorReducer(state, { type: 'TOGGLE_VISIBLE', id: state.page.root.id });
    expect(next).toBe(state);
  });

  it('显隐入历史，UNDO 恢复', () => {
    let state = seeded();
    const id = state.selectedIds[0];
    const before = state.past.length;
    state = editorReducer(state, { type: 'TOGGLE_VISIBLE', id });
    expect(state.past.length).toBe(before + 1);
    state = editorReducer(state, { type: 'UNDO' });
    expect(findById(state.page.root, id)?.node.visible).toBeUndefined();
  });
});

describe('FR-14 CREATE_FRAME（拖画 / 预设创建）', () => {
  it('创建 FIXED 尺寸 Frame 并选中新节点，名称生效', () => {
    const state0 = seeded();
    const rootChildren = state0.page.root.children.length;
    const state = editorReducer(state0, {
      type: 'CREATE_FRAME',
      width: 375,
      height: 667,
      parentId: state0.page.root.id,
      index: 0,
      name: 'iPhone SE',
    });
    expect(state.page.root.children).toHaveLength(rootChildren + 1);
    const frame = state.page.root.children[0];
    expect(frame.type).toBe('FRAME');
    expect(frame.name).toBe('iPhone SE');
    expect(frame.layout.width).toBe(375);
    expect(frame.layout.height).toBe(667);
    expect(frame.layout.widthMode).toBe('FIXED');
    expect(frame.layout.heightMode).toBe('FIXED');
    expect(state.selectedIds).toEqual([frame.id]);
    expect(state.past.length).toBe(state0.past.length + 1);
  });

  it('ABSOLUTE 父级：新 Frame 继承 ABSOLUTE 且 patch 覆盖坐标', () => {
    let state = seeded();
    const parentId = state.selectedIds[0];
    const parent = findById(state.page.root, parentId)!.node;
    if (!isContainer(parent)) throw new Error('parent 应为容器');
    parent.layout.mode = 'ABSOLUTE';

    state = editorReducer(state, {
      type: 'CREATE_FRAME',
      width: 100,
      height: 50,
      parentId,
      index: 0,
      patch: { x: 40, y: 60 },
    });
    const child = findById(state.page.root, parentId)!.node;
    if (!isContainer(child)) throw new Error('child 应为容器');
    expect(child.children).toHaveLength(1);
    const created = child.children[0];
    expect(created.layout.mode).toBe('ABSOLUTE');
    expect(created.layout.x).toBe(40);
    expect(created.layout.y).toBe(60);
  });

  it('index 越界钳制到末尾；父级非法为无操作', () => {
    const state0 = seeded();
    const rootId = state0.page.root.id;
    const state = editorReducer(state0, {
      type: 'CREATE_FRAME',
      width: 10,
      height: 10,
      parentId: rootId,
      index: 99,
    });
    expect(state.page.root.children[state.page.root.children.length - 1].id).toBe(state.selectedIds[0]);

    const bad = editorReducer(state0, {
      type: 'CREATE_FRAME',
      width: 10,
      height: 10,
      parentId: 'nope',
    });
    expect(bad).toBe(state0);
  });
});

describe('FR-29 图层拖拽重排（MOVE_NODE）', () => {
  it('同父向前移动：按下标（摘除后空间）插入，顺序正确', () => {
    // children: [frame, r0, r1, r2]（ADD_NODE 的 RECTANGLE 追加到根）
    let state = seeded();
    state = seedChildren(state, 3);
    const ids = state.page.root.children.map((c) => c.id);
    expect(ids).toHaveLength(4);

    // 把 r0（idx1）拖到 r2 之前 → Layers 计算 pos=findIndex(r2)=3，同父 oldIdx=1<3 → insertAt=2
    const r0 = ids[1];
    const r2 = ids[3];
    const pos = state.page.root.children.findIndex((c) => c.id === r2);
    const insertAt = pos - 1; // 同父 oldIdx(1) < pos(3) → 摘除后下标 -1
    state = editorReducer(state, { type: 'MOVE_NODE', id: r0, parentId: state.page.root.id, index: insertAt });
    const after = state.page.root.children.map((c) => c.id);
    expect(after).toEqual([ids[0], ids[2], r0, r2]);
  });

  it('同父向后移动（before 目标在自身之后）直接按下标', () => {
    let state = seeded();
    state = seedChildren(state, 3);
    const ids = state.page.root.children.map((c) => c.id);
    // 把 r2（idx3）拖到 r0（idx1）之前 → pos=1, oldIdx=3>pos → insertAt=1
    state = editorReducer(state, { type: 'MOVE_NODE', id: ids[3], parentId: state.page.root.id, index: 1 });
    expect(state.page.root.children.map((c) => c.id)).toEqual([ids[0], ids[3], ids[1], ids[2]]);
  });

  it('跨容器：移动到 FRAME 内并应用绝对坐标 patch', () => {
    let state = seeded();
    const frameId = state.selectedIds[0];
    state = seedChildren(state, 2);
    const moving = state.page.root.children[1]; // 第一个 RECTANGLE（frame 之后）
    const patch = { x: 12, y: 34 };
    state = editorReducer(state, {
      type: 'MOVE_NODE',
      id: moving.id,
      parentId: frameId,
      index: 0,
      patch,
    });
    const frame = findById(state.page.root, frameId)!.node;
    if (!isContainer(frame)) throw new Error('frame 应为容器');
    expect(frame.children.map((c) => c.id)).toContain(moving.id);
    expect(frame.children[0].layout.x).toBe(12);
    expect(frame.children[0].layout.y).toBe(34);
    expect(state.page.root.children.map((c) => c.id)).not.toContain(moving.id);
  });

  it('禁止移入自身与自身子树；不存在的父节点为无操作', () => {
    let state = seeded();
    const frameId = state.selectedIds[0];
    state = seedChildren(state, 1);
    const other = state.page.root.children[1];
    // 自身
    const self = editorReducer(state, { type: 'MOVE_NODE', id: frameId, parentId: frameId, index: 0 });
    expect(self).toBe(state);
    // 不存在的父节点
    const missing = editorReducer(state, { type: 'MOVE_NODE', id: frameId, parentId: 'nope', index: 0 });
    expect(missing).toBe(state);
    // isDescendant 保护：先把 other 放进 frame，再试图把 frame 移进 other（other 已在 frame 子树内）
    state = editorReducer(state, { type: 'MOVE_NODE', id: other.id, parentId: frameId, index: 0 });
    const frame = findById(state.page.root, frameId)!.node;
    if (!isContainer(frame)) throw new Error('frame 应为容器');
    expect(frame.children.map((c) => c.id)).toContain(other.id);
    const nested = editorReducer(state, { type: 'MOVE_NODE', id: frameId, parentId: other.id, index: 0 });
    expect(nested).toBe(state);
  });

  it('MOVE_NODE 入历史，UNDO 恢复原顺序', () => {
    let state = seeded();
    state = seedChildren(state, 2);
    const ids = state.page.root.children.map((c) => c.id);
    const before = state.past.length;
    state = editorReducer(state, { type: 'MOVE_NODE', id: ids[2], parentId: state.page.root.id, index: 0 });
    expect(state.past.length).toBe(before + 1);
    state = editorReducer(state, { type: 'UNDO' });
    expect(state.page.root.children.map((c) => c.id)).toEqual(ids);
  });
});

describe('FR-29 双击重命名（UPDATE_NAME）', () => {
  it('更新节点名称', () => {
    let state = seeded();
    const id = state.selectedIds[0];
    state = editorReducer(state, { type: 'UPDATE_NAME', id, name: '头部导航' });
    expect(findById(state.page.root, id)?.node.name).toBe('头部导航');
  });
});
