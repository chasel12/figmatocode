import { describe, expect, it } from 'vitest';
import { createPage, findById, resetIdSeq } from '../src/schema/factory';
import { collectSameNameSiblings, editorReducer, initialState, siblingBaseName } from '../src/editor/store';
import type { EditorState } from '../src/editor/store';
import type { ContainerNode } from '../src/schema/types';

resetIdSeq(0);

/**
 * 批量编辑（多选改样式 / 改布局）。
 *
 * 背景：`UPDATE_LAYOUT_MULTI` 早就有（对齐、等距这些操作要用），但
 *  1. 样式侧没有对应的 `UPDATE_STYLE_MULTI`，多选改颜色只能改最后一个；
 *  2. `UPDATE_LAYOUT_MULTI` **不记实例覆盖**，而单节点版本记——批量改落在实例内
 *     的节点上时，切变体/更新主组件后改动被整体丢弃，与单节点行为不一致。
 * 第 2 条是本次修的真缺口，用「撤掉修复会变红」验证过。
 */

/** 页面根下建 n 个 RECTANGLE，返回 state 与它们的 id */
function seeded(n: number): { state: EditorState; ids: string[] } {
  let state = initialState(createPage('批量测试'), '测试项目');
  for (let i = 0; i < n; i += 1) {
    state = editorReducer(state, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: state.page.root.id });
  }
  const ids = state.page.root.children.map((c) => c.id);
  return { state, ids };
}

describe('UPDATE_STYLE_MULTI', () => {
  it('一次改多个节点的样式', () => {
    const { state, ids } = seeded(3);
    const next = editorReducer(state, {
      type: 'UPDATE_STYLE_MULTI',
      patches: ids.map((id) => ({ id, patch: { background: '#FF0000' } })),
    });
    for (const id of ids) {
      expect(findById(next.page.root, id)?.node.style?.background).toBe('#FF0000');
    }
  });

  it('不同节点可以给不同补丁', () => {
    const { state, ids } = seeded(2);
    const next = editorReducer(state, {
      type: 'UPDATE_STYLE_MULTI',
      patches: [
        { id: ids[0], patch: { background: '#111111' } },
        { id: ids[1], patch: { background: '#222222' } },
      ],
    });
    expect(findById(next.page.root, ids[0])?.node.style?.background).toBe('#111111');
    expect(findById(next.page.root, ids[1])?.node.style?.background).toBe('#222222');
  });

  it('与既有样式合并，不整体替换', () => {
    const { state, ids } = seeded(1);
    let next = editorReducer(state, { type: 'UPDATE_STYLE', id: ids[0], patch: { borderRadius: 8 } });
    next = editorReducer(next, {
      type: 'UPDATE_STYLE_MULTI',
      patches: [{ id: ids[0], patch: { background: '#333333' } }],
    });
    expect(findById(next.page.root, ids[0])?.node.style).toMatchObject({ borderRadius: 8, background: '#333333' });
  });

  it('空 patches 不改状态（返回同一引用，避免污染撤销栈）', () => {
    const { state } = seeded(2);
    expect(editorReducer(state, { type: 'UPDATE_STYLE_MULTI', patches: [] })).toBe(state);
  });

  it('不存在的 id 被跳过，不抛错', () => {
    const { state, ids } = seeded(1);
    const next = editorReducer(state, {
      type: 'UPDATE_STYLE_MULTI',
      patches: [
        { id: 'nope', patch: { background: '#FF0000' } },
        { id: ids[0], patch: { background: '#00FF00' } },
      ],
    });
    expect(findById(next.page.root, ids[0])?.node.style?.background).toBe('#00FF00');
  });
});

describe('批量编辑要记实例覆盖', () => {
  /**
   * 构造一个「实例」：FRAME 上挂 componentId，内部两个子节点。
   * 批量改子节点后，覆盖必须落在实例根上，否则切变体重派生时会丢。
   */
  function seededInstance(): { state: EditorState; instId: string; kidIds: string[] } {
    let state = initialState(createPage('实例测试'), '测试项目');
    state = editorReducer(state, { type: 'ADD_NODE', kind: 'FRAME' });
    const instId = state.selectedIds[0];
    for (let i = 0; i < 2; i += 1) {
      state = editorReducer(state, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: instId });
    }
    // 直接改 AST 打上实例标记（等价于「从主组件派生出一个实例」的结果）
    const inst = findById(state.page.root, instId)!.node as ContainerNode;
    inst.componentId = 'comp-1';
    const kidIds = (inst.children ?? []).map((c) => c.id);
    return { state, instId, kidIds };
  }

  it('UPDATE_STYLE_MULTI 落在实例内节点 → 覆盖落盘', () => {
    const { state, instId, kidIds } = seededInstance();
    expect(kidIds.length).toBeGreaterThan(0);
    const next = editorReducer(state, {
      type: 'UPDATE_STYLE_MULTI',
      patches: kidIds.map((id) => ({ id, patch: { color: '#ABCDEF' } })),
    });
    const overrides = findById(next.page.root, instId)?.node.instanceOverrides ?? [];
    expect(overrides.length).toBe(kidIds.length);
    expect(overrides.every((o) => (o.value as { style?: { color?: string } }).style?.color === '#ABCDEF')).toBe(true);
  });

  it('UPDATE_LAYOUT_MULTI 落在实例内节点 → 覆盖落盘（回归：早期漏记）', () => {
    const { state, instId, kidIds } = seededInstance();
    const next = editorReducer(state, {
      type: 'UPDATE_LAYOUT_MULTI',
      patches: kidIds.map((id) => ({ id, patch: { width: 88 } })),
    });
    // 布局本身生效
    for (const id of kidIds) expect(findById(next.page.root, id)?.node.layout.width).toBe(88);
    // 覆盖也要落盘——撤掉 reducer 里的 withInstanceOverride 这一行，本断言立刻变红
    const overrides = findById(next.page.root, instId)?.node.instanceOverrides ?? [];
    expect(overrides.length).toBe(kidIds.length);
    expect(overrides.every((o) => (o.value as { layout?: { width?: number } }).layout?.width === 88)).toBe(true);
  });

  it('批量改不在实例内 → 不产生覆盖（不误伤普通节点）', () => {
    const { state, ids } = seeded(2);
    const next = editorReducer(state, {
      type: 'UPDATE_STYLE_MULTI',
      patches: ids.map((id) => ({ id, patch: { color: '#123456' } })),
    });
    for (const id of ids) {
      expect(findById(next.page.root, id)?.node.instanceOverrides).toBeUndefined();
    }
  });
});

describe('同源选中（SELECT_SIBLINGS）', () => {
  it('siblingBaseName 去掉 repeat 展开的尾部序号', () => {
    expect(siblingBaseName('日期格 1')).toBe('日期格');
    expect(siblingBaseName('日期格 35')).toBe('日期格');
    expect(siblingBaseName('日期格')).toBe('日期格');
  });

  it('不误切小数（序号只会是整数）', () => {
    expect(siblingBaseName('Card 2.5')).toBe('Card 2.5');
    expect(siblingBaseName('2024')).toBe('2024');
  });

  /** 两个容器下各有同名节点：跨父级不能一起选中 */
  function seededTwoGroups(): { state: EditorState; aIds: string[]; bId: string } {
    let state = initialState(createPage('同源测试'), '测试项目');
    // 两个容器必须都挂在页面根下（不指定 parentId 时 ADD_NODE 会插进上一个选中的容器里）
    state = editorReducer(state, { type: 'ADD_NODE', kind: 'FRAME', parentId: state.page.root.id });
    const aId = state.selectedIds[0];
    state = editorReducer(state, { type: 'ADD_NODE', kind: 'FRAME', parentId: state.page.root.id });
    const bId = state.selectedIds[0];
    // 往 A 里塞 3 个「日期格 N」
    for (let i = 1; i <= 3; i += 1) {
      state = editorReducer(state, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: aId });
      const id = state.selectedIds[0];
      findById(state.page.root, id)!.node.name = `日期格 ${i}`;
    }
    // 往 B 里塞 1 个同名节点（不同父级）
    state = editorReducer(state, { type: 'ADD_NODE', kind: 'RECTANGLE', parentId: bId });
    findById(state.page.root, state.selectedIds[0])!.node.name = '日期格 1';
    const aIds = findById(state.page.root, aId)!.node as ContainerNode;
    return { state, aIds: (aIds.children ?? []).map((c) => c.id), bId };
  }

  it('同父级同名全部选中，跨父级不误伤', () => {
    const { state, aIds, bId } = seededTwoGroups();
    const picked = collectSameNameSiblings(state.page.root, aIds[0]);
    expect(picked).toHaveLength(3);
    expect(picked).toEqual(aIds);
    // B 里那个同名节点不在结果里
    const bKids = ((findById(state.page.root, bId)!.node as ContainerNode).children ?? []).map((c) => c.id);
    expect(picked.some((id) => bKids.includes(id))).toBe(false);
  });

  it('dispatch 后 selectedIds 变成整组', () => {
    const { state, aIds } = seededTwoGroups();
    const next = editorReducer(state, { type: 'SELECT_SIBLINGS', id: aIds[1] });
    expect(next.selectedIds).toEqual(aIds);
  });

  it('只有一个同名节点时保持原选择（不把单选变成空操作）', () => {
    const { state, bId } = seededTwoGroups();
    const bKids = ((findById(state.page.root, bId)!.node as ContainerNode).children ?? []).map((c) => c.id);
    const before = state.selectedIds;
    const next = editorReducer(state, { type: 'SELECT_SIBLINGS', id: bKids[0] });
    expect(next.selectedIds).toBe(before);
  });

  it('无名字节点不参与（避免把所有匿名节点当成一组）', () => {
    const { state, aIds } = seededTwoGroups();
    const anon = findById(state.page.root, aIds[0])!.node;
    anon.name = '';
    expect(collectSameNameSiblings(state.page.root, aIds[0])).toHaveLength(0);
  });
});
