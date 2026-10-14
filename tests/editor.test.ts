import { describe, expect, it } from 'vitest';
import { createPage, findById } from '../src/schema/factory';
import { isContainer } from '../src/schema/types';
import { editorReducer, initialState } from '../src/editor/store';
import type { EditorState } from '../src/editor/store';

/** 页面根 → FRAME → TEXT（TEXT 为当前选中） */
function seeded(): EditorState {
  const page = createPage('测试页');
  let state = initialState(page, '测试项目');
  state = editorReducer(state, { type: 'ADD_NODE', kind: 'FRAME' });
  state = editorReducer(state, { type: 'ADD_NODE', kind: 'TEXT' });
  return state;
}

describe('editor store 复制/粘贴（FR-13）', () => {
  it('COPY 快照选中节点，PASTE 在其父容器（FRAME）追加新 id 节点并选中', () => {
    let state = seeded();
    const targetId = state.selectedIds[0];
    state = editorReducer(state, { type: 'COPY' });
    expect(state.clipboard).toHaveLength(1);

    state = editorReducer(state, { type: 'PASTE' });
    const frame = state.page.root.children[0];
    if (!isContainer(frame)) throw new Error('首个子节点应为 FRAME 容器');
    const ids = frame.children.map((c) => c.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(state.selectedIds[0]).toBe(ids[ids.length - 1]);
    expect(state.selectedIds[0]).not.toBe(targetId);
    expect(state.past.length).toBeGreaterThan(0);
  });

  it('空剪贴板 PASTE 为无操作', () => {
    const state = seeded();
    const next = editorReducer(state, { type: 'PASTE' });
    expect(next).toBe(state);
  });

  it('COPY 忽略页面根节点', () => {
    const state = seeded();
    const next = editorReducer(state, { type: 'COPY', ids: [state.page.root.id] });
    expect(next.clipboard).toHaveLength(0);
    expect(next).toBe(state);
  });

  it('剪贴板跨新建页面保留', () => {
    let state = seeded();
    state = editorReducer(state, { type: 'COPY' });
    expect(state.clipboard).toHaveLength(1);
    state = editorReducer(state, { type: 'NEW_PAGE' });
    expect(state.clipboard).toHaveLength(1);
    state = editorReducer(state, { type: 'PASTE' });
    expect(state.page.root.children).toHaveLength(1);
  });

  it('撤销回退粘贴（历史包含粘贴前页面）', () => {
    let state = seeded();
    state = editorReducer(state, { type: 'COPY' });
    state = editorReducer(state, { type: 'PASTE' });
    const frameAfter = state.page.root.children[0];
    if (!isContainer(frameAfter)) throw new Error('首个子节点应为 FRAME 容器');
    expect(frameAfter.children).toHaveLength(2);
    state = editorReducer(state, { type: 'UNDO' });
    const frameBefore = state.page.root.children[0];
    if (!isContainer(frameBefore)) throw new Error('首个子节点应为 FRAME 容器');
    expect(frameBefore.children).toHaveLength(1);
  });
});

describe('editor store 图片 src 编辑', () => {
  it('UPDATE_SRC 修改 IMAGE 节点 src 并进历史', () => {
    let state = initialState(createPage('图片页'), '项目');
    state = editorReducer(state, { type: 'ADD_NODE', kind: 'IMAGE' });
    const id = state.selectedIds[0];
    const pastBefore = state.past.length;

    state = editorReducer(state, { type: 'UPDATE_SRC', id, src: 'https://example.com/a.png', transient: true });
    state = editorReducer(state, { type: 'COMMIT' });

    const found = findById(state.page.root, id);
    if (!found || found.node.type !== 'IMAGE') throw new Error('应为 IMAGE 节点');
    expect(found.node.src).toBe('https://example.com/a.png');
    expect(state.past.length).toBeGreaterThan(pastBefore);
  });

  it('非 IMAGE 节点 UPDATE_SRC 无副作用', () => {
    let state = initialState(createPage('图片页'), '项目');
    state = editorReducer(state, { type: 'ADD_NODE', kind: 'FRAME' });
    const id = state.selectedIds[0];
    const before = state;

    state = editorReducer(state, { type: 'UPDATE_SRC', id, src: 'x.png' });
    expect(state).toBe(before);
    expect(state.past).toBe(before.past);
  });
});
