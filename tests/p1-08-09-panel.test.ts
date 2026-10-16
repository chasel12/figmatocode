import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { editorReducer, initialState, type EditorState } from '../src/editor/store';
import type { ContainerNode, UINode } from '../src/schema/types';

resetIdSeq(0);

function frame(name = 'Card'): ContainerNode {
  const f = createNode('FRAME') as ContainerNode;
  f.name = name;
  f.layout.width = 200;
  f.layout.height = 100;
  return f;
}

function rect(): UINode {
  const n = createNode('RECTANGLE');
  n.layout.width = 50;
  n.layout.height = 50;
  return n;
}

function stateWith(nodes: UINode[]): EditorState {
  const page = createPage('P1 面板页');
  page.root.children.push(...nodes);
  return initialState(page, 'P1 项目');
}

describe('P1-08 组件改名回流（差异 #6①）', () => {
  it('改实例名 → components[compId].name 同步', () => {
    const f = frame();
    let s = stateWith([f]);
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id, name: 'Card' });
    const compId = Object.keys(s.components)[0];
    s = editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
    const instId = s.selectedIds[0];

    s = editorReducer(s, { type: 'UPDATE_NAME', id: instId, name: 'Hero Card' });
    expect(s.components[compId].name).toBe('Hero Card');
    const inst = s.page.root.children.find((n) => n.id === instId)!;
    expect(inst.name).toBe('Hero Card');
  });

  it('改主组件节点名 → components[compId].name 同步', () => {
    const f = frame();
    let s = stateWith([f]);
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id, name: 'Card' });
    const compId = Object.keys(s.components)[0];
    s = editorReducer(s, { type: 'UPDATE_NAME', id: f.id, name: 'Renamed Master' });
    expect(s.components[compId].name).toBe('Renamed Master');
  });

  it('普通节点改名不触碰组件表', () => {
    const r = rect();
    let s = stateWith([r, frame()]);
    const before = { ...s.components };
    s = editorReducer(s, { type: 'UPDATE_NAME', id: r.id, name: 'Just a rect' });
    expect(s.components).toEqual(before);
    expect(s.page.root.children[0].name).toBe('Just a rect');
  });

  it('实例改名后新插入实例仍引用同一组件定义（名字一致）', () => {
    const f = frame();
    let s = stateWith([f]);
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id, name: 'Card' });
    const compId = Object.keys(s.components)[0];
    s = editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
    const instId = s.selectedIds[0];
    s = editorReducer(s, { type: 'UPDATE_NAME', id: instId, name: 'Renamed' });
    // 再插一个实例：其内容快照来自 def.root，def.name 已更新
    s = editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
    expect(s.components[compId].name).toBe('Renamed');
  });

  it('改名进历史栈（可撤销）', () => {
    const f = frame();
    let s = stateWith([f]);
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id, name: 'Card' });
    const compId = Object.keys(s.components)[0];
    s = editorReducer(s, { type: 'UPDATE_NAME', id: f.id, name: 'Changed' });
    expect(s.past.length).toBeGreaterThan(0);
    const undone = editorReducer(s, { type: 'UNDO' });
    expect(undone.page.root.children[0].name).toBe('Card');
    // 组件名不在 undo 范围（与既有「组件表不进历史」口径一致）
    expect(undone.components[compId].name).toBe('Changed');
  });
});

describe('P1-09 样式行内编辑（差异 #6②）', () => {
  function stateWithToken(): { s: EditorState; tokenId: string; nodeId: string } {
    const r = rect();
    let s = stateWith([r]);
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'PAINT', style: { background: '#FF0000' } });
    return { s, tokenId: s.tokens[0].id, nodeId: r.id };
  }

  it('UPDATE_TOKEN 改名：token.name 更新', () => {
    const { s, tokenId } = stateWithToken();
    const out = editorReducer(s, { type: 'UPDATE_TOKEN', id: tokenId, name: 'Brand Primary' });
    expect(out.tokens[0].name).toBe('Brand Primary');
  });

  it('UPDATE_TOKEN 改色值：引用者同步（这是面板编辑入口要驱动的能力）', () => {
    const r = rect();
    let s = stateWith([r]);
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'PAINT', style: { background: '#FF0000' }, nodeId: r.id });
    const tokenId = s.tokens[0].id;
    // 面板改色 → UPDATE_TOKEN
    s = editorReducer(s, { type: 'UPDATE_TOKEN', id: tokenId, style: { background: '#00FF00' } });
    expect(s.tokens[0].style.background).toBe('#00FF00');
    expect(s.page.root.children[0].style?.background).toBe('#00FF00');
  });

  it('多引用者同时同步', () => {
    const a = rect();
    const b = rect();
    let s = stateWith([a, b]);
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'PAINT', style: { background: '#111111' }, nodeId: a.id });
    const tokenId = s.tokens[0].id;
    s = editorReducer(s, { type: 'APPLY_TOKEN', tokenId, nodeId: b.id });
    s = editorReducer(s, { type: 'UPDATE_TOKEN', id: tokenId, style: { background: '#222222' } });
    expect(s.page.root.children[0].style?.background).toBe('#222222');
    expect(s.page.root.children[1].style?.background).toBe('#222222');
  });

  it('TEXT 样式改字号 → 引用者同步', () => {
    const r = rect();
    let s = stateWith([r]);
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'TEXT', style: { fontSize: 16 }, nodeId: r.id });
    const tokenId = s.tokens[0].id;
    s = editorReducer(s, { type: 'UPDATE_TOKEN', id: tokenId, style: { fontSize: 24 } });
    expect(s.tokens[0].style.fontSize).toBe(24);
    expect(s.page.root.children[0].style?.fontSize).toBe(24);
  });

  it('改名不改样式值；改样式不改名（互不干扰）', () => {
    const { s, tokenId } = stateWithToken();
    const renamed = editorReducer(s, { type: 'UPDATE_TOKEN', id: tokenId, name: 'X' });
    expect(renamed.tokens[0].style.background).toBe('#FF0000');
    const restyled = editorReducer(s, { type: 'UPDATE_TOKEN', id: tokenId, style: { background: '#0000FF' } });
    expect(restyled.tokens[0].name).toBe(s.tokens[0].name);
  });

  it('未知 tokenId 返回原 state（防御）', () => {
    const { s } = stateWithToken();
    expect(editorReducer(s, { type: 'UPDATE_TOKEN', id: 'nope', name: 'X' })).toBe(s);
  });
});
