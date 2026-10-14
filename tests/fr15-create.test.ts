import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { editorReducer, initialState, type EditorState } from '../src/editor/store';
import type { UINode } from '../src/schema/types';

resetIdSeq(0);

function baseState(): EditorState {
  const page = createPage('FR15 页面');
  return initialState(page, 'fr15');
}

describe('FR-15/16 工具创建：INSERT_NODE', () => {
  it('插入矩形：节点入父 children、选中新节点、进撤销栈', () => {
    const s0 = baseState();
    const rect = createNode('RECTANGLE', { name: '拖画矩形' });
    rect.layout = { ...rect.layout, width: 120, height: 60, widthMode: 'FIXED', heightMode: 'FIXED' };
    const s1 = editorReducer(s0, {
      type: 'INSERT_NODE',
      node: rect,
      parentId: s0.page.root.id,
      index: 0,
    });
    expect(s1.page.root.children).toHaveLength(1);
    expect(s1.page.root.children[0].id).toBe(rect.id);
    expect(s1.selectedIds).toEqual([rect.id]);
    expect(s1.past).toHaveLength(1);
    expect(s1.page.root.children[0].layout.width).toBe(120);

    const s2 = editorReducer(s1, { type: 'UNDO' });
    expect(s2.page.root.children).toHaveLength(0);
    expect(s2.future).toHaveLength(1);
  });

  it('文本节点插入（HUG 语义保持）+ patch 坐标写入', () => {
    const s0 = baseState();
    const text = createNode('TEXT');
    const s1 = editorReducer(s0, {
      type: 'INSERT_NODE',
      node: text,
      parentId: s0.page.root.id,
      patch: { mode: 'ABSOLUTE', x: 40, y: 80 },
    });
    const n = s1.page.root.children[0];
    expect(n.type).toBe('TEXT');
    expect(n.layout.widthMode).toBe('HUG');
    expect(n.layout.mode).toBe('ABSOLUTE');
    expect(n.layout.x).toBe(40);
    expect(n.layout.y).toBe(80);
    expect(s1.selectedIds).toEqual([text.id]);
  });

  it('索引越界钳制到 children 范围；非法父无操作', () => {
    const s0 = baseState();
    const a = createNode('RECTANGLE');
    const b = createNode('RECTANGLE');
    const s1 = editorReducer(s0, { type: 'INSERT_NODE', node: a, parentId: s0.page.root.id, index: 0 });
    const s2 = editorReducer(s1, { type: 'INSERT_NODE', node: b, parentId: s1.page.root.id, index: 99 });
    expect(s2.page.root.children.map((c) => c.id)).toEqual([a.id, b.id]);

    const s3 = editorReducer(s2, { type: 'INSERT_NODE', node: createNode('RECTANGLE'), parentId: 'missing' });
    expect(s3).toBe(s2);
  });

  it('外部节点对象被深拷贝插入（改原对象不污染已入栈状态）', () => {
    const s0 = baseState();
    const rect = createNode('RECTANGLE');
    const s1 = editorReducer(s0, { type: 'INSERT_NODE', node: rect, parentId: s0.page.root.id });
    (rect as UINode).name = '外部篡改';
    expect(s1.page.root.children[0].name).not.toBe('外部篡改');
  });
});
