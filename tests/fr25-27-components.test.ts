import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { editorReducer, initialState, type EditorState } from '../src/editor/store';
import type { ContainerNode, StyleToken, UINode } from '../src/schema/types';

resetIdSeq(0);

function pageWith(...nodes: UINode[]): EditorState {
  const page = createPage('C 轨页面');
  page.root.children.push(...nodes);
  return initialState(page, 'C 轨项目');
}

function frame(name = 'Card'): ContainerNode {
  const f = createNode('FRAME') as ContainerNode;
  f.name = name;
  f.layout.width = 200;
  f.layout.height = 100;
  return f;
}

function rect(): UINode {
  const r = createNode('RECTANGLE');
  r.layout.width = 50;
  r.layout.height = 50;
  return r;
}

describe('FR-25 组件与实例', () => {
  it('CREATE_COMPONENT：入表 + 节点挂 componentId', () => {
    const f = frame();
    let s = pageWith(f);
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id, name: 'Card' });
    const ids = Object.keys(s.components);
    expect(ids).toHaveLength(1);
    expect(s.components[ids[0]].name).toBe('Card');
    // 原节点挂上 componentId
    const node = s.page.root.children[0];
    expect(node.componentId).toBe(ids[0]);
  });

  it('CREATE_COMPONENT：叶子包 FRAME root（组件根需可容纳）', () => {
    const r = rect();
    let s = pageWith(r);
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: r.id });
    const def = Object.values(s.components)[0];
    expect(def.root.type).toBe('FRAME');
    expect(def.root.children).toHaveLength(1);
    expect(def.root.children[0].type).toBe('RECTANGLE');
  });

  it('CREATE_COMPONENT：root 子树重排 id（不与实例撞号）', () => {
    const f = frame();
    f.children = [rect(), rect()];
    let s = pageWith(f);
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id });
    const def = Object.values(s.components)[0];
    const originalIds = new Set<string>();
    const collect = (n: UINode): void => {
      originalIds.add(n.id);
      if ('children' in n) n.children.forEach(collect);
    };
    collect(f);
    const snapshotIds: string[] = [];
    const collect2 = (n: UINode): void => {
      snapshotIds.push(n.id);
      if ('children' in n) n.children.forEach(collect2);
    };
    collect2(def.root);
    // 快照 id 与原树完全不同
    expect(snapshotIds.some((id) => originalIds.has(id))).toBe(false);
  });

  it('CREATE_COMPONENT：不存在的节点返回原 state（防御）', () => {
    const s = pageWith(frame());
    expect(editorReducer(s, { type: 'CREATE_COMPONENT', id: 'nope' })).toBe(s);
  });

  it('INSERT_INSTANCE：深拷贝 + 新 id + 挂 componentId + 选中', () => {
    const f = frame();
    let s = pageWith(f);
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id });
    const compId = Object.keys(s.components)[0];
    const before = s.page.root.children.length;
    s = editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
    expect(s.page.root.children.length).toBe(before + 1);
    const inst = s.page.root.children[s.page.root.children.length - 1];
    expect(inst.componentId).toBe(compId);
    expect(inst.id).not.toBe(f.id);
    expect(s.selectedIds).toEqual([inst.id]);
  });

  it('INSERT_INSTANCE：未知 componentId 返回原 state', () => {
    const s = pageWith(frame());
    expect(editorReducer(s, { type: 'INSERT_INSTANCE', componentId: 'nope' })).toBe(s);
  });

  it('PUSH_TO_COMPONENT：改主组件后，新插入实例内容跟随', () => {
    const f = frame();
    f.children = [rect()];
    let s = pageWith(f);
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id });
    const compId = Object.keys(s.components)[0];

    // 选中实例并改其子节点宽度，再回写主组件
    s = editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
    const instId = s.selectedIds[0];
    const inst = s.page.root.children.find((n) => n.id === instId) as ContainerNode;
    const childId = inst.children[0].id;
    s = editorReducer(s, { type: 'UPDATE_LAYOUT', id: childId, patch: { width: 999 } });
    s = editorReducer(s, { type: 'PUSH_TO_COMPONENT', id: instId });

    // 主组件 root 已更新
    const findW = (n: UINode): number | null => {
      if (n.id.startsWith('n') && n.layout.width === 999) return n.layout.width;
      if ('children' in n) {
        for (const c of n.children) {
          const r = findW(c);
          if (r != null) return r;
        }
      }
      return null;
    };
    expect(findW(s.components[compId].root)).toBe(999);

    // 新插入的实例应含 999
    s = editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
    const newest = s.page.root.children[s.page.root.children.length - 1] as ContainerNode;
    const widths: number[] = [];
    const collect = (n: UINode): void => {
      if (n.layout.width != null) widths.push(n.layout.width);
      if ('children' in n) n.children.forEach(collect);
    };
    collect(newest);
    expect(widths).toContain(999);
  });

  it('DETACH_INSTANCE：仅删标记、不动 id 与内容', () => {
    const f = frame();
    let s = pageWith(f);
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id });
    const compId = Object.keys(s.components)[0];
    s = editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
    const instId = s.selectedIds[0];
    s = editorReducer(s, { type: 'DETACH_INSTANCE', id: instId });
    const inst = s.page.root.children.find((n) => n.id === instId)!;
    expect(inst.componentId).toBeUndefined();
    expect(inst.id).toBe(instId); // id 不变
  });

  it('DETACH_INSTANCE：非实例节点返回原 state', () => {
    const f = frame();
    const s = pageWith(f);
    expect(editorReducer(s, { type: 'DETACH_INSTANCE', id: f.id })).toBe(s);
  });

  it('组件表不进 past/future（增删不受 Ctrl+Z 影响）', () => {
    const f = frame();
    let s = pageWith(f);
    const pastBefore = s.past.length;
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id });
    // CREATE_COMPONENT 会 pushHistory（节点挂 componentId 属页面变更），但 redo 栈不因此清空组件
    expect(s.components).toBeTruthy();
    const compId = Object.keys(s.components)[0];
    s = editorReducer(s, { type: 'UNDO' });
    // 撤销页面变更后组件表仍在
    expect(Object.keys(s.components)).toContain(compId);
    expect(s.past.length).toBeLessThanOrEqual(pastBefore + 1);
  });
});

describe('FR-27 样式系统', () => {
  it('CREATE_TOKEN：自动派生 cssVar 自增序号', () => {
    let s = pageWith(frame());
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'PAINT', style: { background: '#FF0000' } });
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'TEXT', style: { fontSize: 16 } });
    expect(s.tokens[0].cssVar).toBe('--uic-paint-1');
    expect(s.tokens[1].cssVar).toBe('--uic-text-2');
    expect(s.styleSeq).toBe(2);
  });

  it('CREATE_TOKEN 带 nodeId：创建即应用（浅合并 + 记引用）', () => {
    const r = rect();
    let s = pageWith(r);
    s = editorReducer(s, {
      type: 'CREATE_TOKEN',
      kind: 'PAINT',
      style: { background: '#00FF00' },
      nodeId: r.id,
    });
    const node = s.page.root.children[0];
    expect(node.style?.background).toBe('#00FF00');
    expect(node.styleTokenId).toBe(s.tokens[0].id);
  });

  it('UPDATE_TOKEN：两个引用节点同步更新', () => {
    const a = rect();
    const b = rect();
    let s = pageWith(a, b);
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'PAINT', style: { background: '#111111' }, nodeId: a.id });
    const tokenId = s.tokens[0].id;
    s = editorReducer(s, { type: 'APPLY_TOKEN', tokenId, nodeId: b.id });
    expect(s.page.root.children[1].styleTokenId).toBe(tokenId);

    s = editorReducer(s, { type: 'UPDATE_TOKEN', id: tokenId, style: { background: '#222222' } });
    expect(s.page.root.children[0].style?.background).toBe('#222222');
    expect(s.page.root.children[1].style?.background).toBe('#222222');
  });

  it('DELETE_TOKEN：清引用但保留样式值（Detach 语义）', () => {
    const r = rect();
    let s = pageWith(r);
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'PAINT', style: { background: '#ABCDEF' }, nodeId: r.id });
    const tokenId = s.tokens[0].id;
    s = editorReducer(s, { type: 'DELETE_TOKEN', id: tokenId });
    expect(s.tokens).toHaveLength(0);
    const node = s.page.root.children[0];
    expect(node.styleTokenId).toBeUndefined();
    expect(node.style?.background).toBe('#ABCDEF'); // 值保留
  });

  it('APPLY_TOKEN：浅合并不清其余字段', () => {
    const r = rect();
    r.style = { borderRadius: 8, opacity: 0.5 };
    let s = pageWith(r);
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'PAINT', style: { background: '#123456' } });
    s = editorReducer(s, { type: 'APPLY_TOKEN', tokenId: s.tokens[0].id, nodeId: r.id });
    const node = s.page.root.children[0];
    expect(node.style?.background).toBe('#123456');
    expect(node.style?.borderRadius).toBe(8); // 未清
    expect(node.style?.opacity).toBe(0.5);
  });

  it('APPLY_TOKEN：未知 token 返回原 state', () => {
    const s = pageWith(rect());
    expect(editorReducer(s, { type: 'APPLY_TOKEN', tokenId: 'nope' })).toBe(s);
  });

  it('DETACH_TOKEN：仅删引用，样式值留在节点上', () => {
    const r = rect();
    let s = pageWith(r);
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'PAINT', style: { background: '#654321' }, nodeId: r.id });
    s = editorReducer(s, { type: 'DETACH_TOKEN', id: r.id });
    const node = s.page.root.children[0];
    expect(node.styleTokenId).toBeUndefined();
    expect(node.style?.background).toBe('#654321');
  });

  it('tokens 表在 LOAD_PAGE 时重置（跨工程不串味）', () => {
    let s = pageWith(rect());
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'PAINT', style: { background: '#FF0000' } });
    expect(s.tokens).toHaveLength(1);
    const fresh = createPage('另一页');
    s = editorReducer(s, { type: 'LOAD_PAGE', page: fresh });
    expect(s.tokens).toHaveLength(0);
    expect(s.components).toEqual({});
    expect(s.styleSeq).toBe(0);
  });
});

describe('FR-39 P 轨状态域（单点合入回归）', () => {
  it('initialState：pages 单页起步、currentPageId 对齐', () => {
    const s = pageWith(rect());
    expect(s.pages).toHaveLength(1);
    expect(s.currentPageId).toBe(s.page.id);
    expect(s.history).toEqual({});
  });

  it('LOAD_PAGE：pages 重置为单页（不残留旧工程页）', () => {
    let s = pageWith(rect());
    s = editorReducer(s, { type: 'LOAD_PAGE', page: createPage('新页') });
    expect(s.pages).toHaveLength(1);
    expect(s.currentPageId).toBe(s.page.id);
  });
});

describe('StyleToken 形状自洽（schema-decisions §一）', () => {
  it('CREATE_TOKEN 产出字段齐全', () => {
    let s = pageWith(rect());
    s = editorReducer(s, { type: 'CREATE_TOKEN', kind: 'TEXT', style: { fontSize: 18 } });
    const t: StyleToken = s.tokens[0];
    expect(t.id).toBeTruthy();
    expect(t.kind).toBe('TEXT');
    expect(t.name).toBeTruthy();
    expect(t.style.fontSize).toBe(18);
    expect(t.cssVar).toBe('--uic-text-1');
  });
});
