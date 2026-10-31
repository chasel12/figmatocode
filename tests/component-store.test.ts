import { describe, expect, it } from 'vitest';
import { editorReducer, initialState } from '../src/editor/store';
import { createNode, createPage, findById, resetIdSeq } from '../src/schema/factory';
import type { ContainerNode, UINode } from '../src/schema/types';

resetIdSeq(0);

/**
 * #3 组件系统：store 级集成（覆盖记录 + 更新主组件 + 切变体）。
 *
 * 这组用例锁定「组件系统不再是玩具」的关键行为，且**直接跑 reducer**，
 * 比在浏览器里数图层行数可靠。
 */
function freshState() {
  const page = createPage('组件集成');
  return initialState(page, 'p');
}

/** 造一个文本节点并把它变成组件，返回 { state, compId, sourceId } */
function withComponent() {
  let s = freshState();
  const txt = createNode('TEXT') as UINode;
  (txt as { text: string }).text = '原文案';
  (txt as { style?: Record<string, unknown> }).style = { ...(txt.style ?? {}), color: '#112233', fontSize: 16 };
  s = editorReducer(s, { type: 'ADD_NODE', kind: 'TEXT' });
  const addedId = s.selectedIds[0];
  void txt;
  s = editorReducer(s, { type: 'CREATE_COMPONENT', id: addedId });
  const compId = Object.keys(s.components)[0];
  return { state: s, compId, sourceId: addedId };
}

function insertInstance(s: ReturnType<typeof freshState>, compId: string) {
  return editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
}

/** 取某节点内所有 TEXT 子节点的 id（深度优先） */
function textIdsIn(root: UINode): string[] {
  const out: string[] = [];
  const walk = (n: UINode): void => {
    if (n.type === 'TEXT') out.push(n.id);
    if ('children' in n) (n as ContainerNode).children.forEach(walk);
  };
  walk(root);
  return out;
}

describe('CREATE_COMPONENT + INSERT_INSTANCE 基础', () => {
  it('创建组件后 components 表有定义，源节点带 componentId', () => {
    const { state, compId, sourceId } = withComponent();
    expect(state.components[compId]).toBeTruthy();
    const src = findById(state.page.root, sourceId);
    expect(src?.node.componentId).toBe(compId);
  });

  it('插入实例后页面上多一个实例，且实例根指向该组件', () => {
    const { state, compId } = withComponent();
    const s2 = insertInstance(state, compId);
    const instId = s2.selectedIds[0];
    const inst = findById(s2.page.root, instId);
    expect(inst?.node.componentId).toBe(compId);
    expect(inst?.node.id).not.toBe(undefined);
  });
});

describe('实例覆盖（改实例内文本 → 记录 overrides）', () => {
  it('改实例内文本字色 → 该实例 instanceOverrides 记录 path/value', () => {
    const { state, compId } = withComponent();
    let s = insertInstance(state, compId);
    const instId = s.selectedIds[0];
    const inst = findById(s.page.root, instId)!;
    const innerText = textIdsIn(inst.node)[0];

    s = editorReducer(s, { type: 'UPDATE_STYLE', id: innerText, patch: { color: '#ff0000' } });
    const after = findById(s.page.root, instId)!;
    expect(after.node.instanceOverrides?.length).toBe(1);
    const ov = after.node.instanceOverrides![0];
    expect((ov.value as { style: { color: string } }).style.color).toBe('#ff0000');
    expect(ov.path).toBe('0'); // 第一个子节点
  });

  it('改非实例节点不产生 overrides', () => {
    let s = freshState();
    s = editorReducer(s, { type: 'ADD_NODE', kind: 'TEXT' });
    const id = s.selectedIds[0];
    s = editorReducer(s, { type: 'UPDATE_STYLE', id, patch: { color: '#123456' } });
    const n = findById(s.page.root, id)!;
    expect(n.node.instanceOverrides).toBeUndefined();
  });

  it('同一节点多次改样式 → 合并为一条覆盖', () => {
    const { state, compId } = withComponent();
    let s = insertInstance(state, compId);
    const instId = s.selectedIds[0];
    const inst = findById(s.page.root, instId)!;
    const innerText = textIdsIn(inst.node)[0];
    s = editorReducer(s, { type: 'UPDATE_STYLE', id: innerText, patch: { color: '#ff0000' } });
    s = editorReducer(s, { type: 'UPDATE_STYLE', id: innerText, patch: { fontSize: 30 } });
    const after = findById(s.page.root, instId)!;
    expect(after.node.instanceOverrides?.length).toBe(1);
    const st = (after.node.instanceOverrides![0].value as { style: Record<string, unknown> }).style;
    expect(st.color).toBe('#ff0000');
    expect(st.fontSize).toBe(30);
  });
});

describe('PUSH_TO_COMPONENT：其它实例跟随且保留各自覆盖', () => {
  it('更新主组件后：其他实例跟随/保留覆盖/节点数不丢', () => {
    const { state, compId } = withComponent();
    // 插两个实例
    let s = insertInstance(state, compId);
    const instA = s.selectedIds[0];
    s = insertInstance(s, compId);
    const instB = s.selectedIds[0];

    // 给实例 B 一个颜色覆盖
    const bText = textIdsIn(findById(s.page.root, instB)!.node)[0];
    s = editorReducer(s, { type: 'UPDATE_STYLE', id: bText, patch: { color: '#ff0000' } });
    // 把实例 B 的字号改成 40（也会成为覆盖）
    s = editorReducer(s, { type: 'UPDATE_STYLE', id: bText, patch: { fontSize: 40 } });

    const beforeCount = (s.page.root as ContainerNode).children.length;

    // 用实例 B 更新主组件
    s = editorReducer(s, { type: 'PUSH_TO_COMPONENT', id: instB });

    // ① 顶层子节点数量不丢（首版 bug：源实例被误删，6→5）
    expect((s.page.root as ContainerNode).children.length).toBe(beforeCount);
    // ② 两个实例都还在
    expect(findById(s.page.root, instA)).toBeTruthy();
    expect(findById(s.page.root, instB)).toBeTruthy();
    // ③ 实例 A 跟随主组件字号 40（A 未覆盖字号）
    const aText = textIdsIn(findById(s.page.root, instA)!.node)[0];
    expect(findById(s.page.root, aText)!.node.style?.fontSize).toBe(40);
    // ④ 实例 B 保留自己的颜色覆盖
    const bText2 = textIdsIn(findById(s.page.root, instB)!.node)[0];
    expect(findById(s.page.root, bText2)!.node.style?.color).toBe('#ff0000');
  });

  it('更新主组件后选区保持有效（旧版因节点被删导致选中丢失）', () => {
    const { state, compId } = withComponent();
    let s = insertInstance(state, compId);
    const instId = s.selectedIds[0];
    s = editorReducer(s, { type: 'PUSH_TO_COMPONENT', id: instId });
    for (const sid of s.selectedIds) {
      expect(findById(s.page.root, sid)).toBeTruthy();
    }
  });
});

/**
 * 跨变体保留覆盖（旧版是 `instanceOverrides = undefined`，改动全丢）。
 *
 * **这条用例曾经是假的**：原版拿 `compA`（CREATE_COMPONENT 建的基组件，没有
 * `variantProps`）去取 `targetComp.variantProps`，取到 undefined 就走进
 * `else { expect(true).toBe(true) }` —— 切换那一步**一次都没执行过**，却一直是绿的。
 * 现在改成真的建两个成员、真的切到**另一个**成员，并断言覆盖被重放到新结构上。
 */
describe('SET_VARIANT_PROPS：跨变体保留实例覆盖', () => {
  /** 造「基组件 + State=Default / State=Hover 两个变体成员」的现场 */
  function withTwoVariants() {
    let s = freshState();
    s = editorReducer(s, { type: 'ADD_NODE', kind: 'TEXT' });
    const srcId = s.selectedIds[0];
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: srcId });
    s = editorReducer(s, { type: 'CREATE_VARIANT', id: srcId, props: { State: 'Default' } });
    s = editorReducer(s, { type: 'CREATE_VARIANT', id: srcId, props: { State: 'Hover' } });
    const members = Object.values(s.components).filter((c) => c.variantProps);
    expect(members.length).toBe(2);
    const def = members.find((m) => m.variantProps!.State === 'Default')!;
    const hover = members.find((m) => m.variantProps!.State === 'Hover')!;
    expect(hover.id).not.toBe(def.id);
    return { state: s, def, hover };
  }

  it('切到另一个变体成员后，嵌套节点的覆盖仍在且生效', () => {
    const { state, def, hover } = withTwoVariants();

    // 实例指向 Default 档；改内层文案颜色 → 覆盖记录在 path='0'
    let s = editorReducer(state, { type: 'INSERT_INSTANCE', componentId: def.id });
    const instId = s.selectedIds[0];
    const innerText = textIdsIn(findById(s.page.root, instId)!.node)[0];
    s = editorReducer(s, { type: 'UPDATE_STYLE', id: innerText, patch: { color: '#abcdef' } });
    const ov = findById(s.page.root, instId)!.node.instanceOverrides ?? [];
    expect(ov.length).toBe(1);
    expect(ov[0].path).toBe('0');

    // 切到 **另一个** 成员：componentId 换人、覆盖条数不变、颜色在新树上仍生效
    s = editorReducer(s, { type: 'SET_VARIANT_PROPS', id: instId, props: { State: 'Hover' } });
    const after = findById(s.page.root, instId)!;
    expect(after.node.componentId).toBe(hover.id);
    expect((after.node.instanceOverrides ?? []).length).toBe(1);
    const newInner = textIdsIn(after.node)[0];
    expect((findById(s.page.root, newInner)!.node.style as { color?: string }).color).toBe('#abcdef');
  });

  it('切变体保住实例的 id 与画布位置（不跳回原点）', () => {
    const { state, def } = withTwoVariants();
    let s = editorReducer(state, { type: 'INSERT_INSTANCE', componentId: def.id });
    const instId = s.selectedIds[0];
    s = editorReducer(s, { type: 'UPDATE_LAYOUT', id: instId, patch: { x: 240, y: 96 } });
    expect(findById(s.page.root, instId)!.node.layout.x).toBe(240);

    s = editorReducer(s, { type: 'SET_VARIANT_PROPS', id: instId, props: { State: 'Hover' } });
    const after = findById(s.page.root, instId)!.node;
    expect(after.id).toBe(instId);
    expect(after.layout.x).toBe(240);
    expect(after.layout.y).toBe(96);
  });

  it('覆盖路径在新变体里不存在时静默丢弃（不报错、不误伤别的节点）', () => {
    const { state, def, hover } = withTwoVariants();
    let s = editorReducer(state, { type: 'INSERT_INSTANCE', componentId: def.id });
    const instId = s.selectedIds[0];
    const innerText = textIdsIn(findById(s.page.root, instId)!.node)[0];
    s = editorReducer(s, { type: 'UPDATE_STYLE', id: innerText, patch: { color: '#abcdef' } });

    // 把 Hover 成员的结构改成「FRAME 里没有子节点」，路径 '0' 失效
    s = {
      ...s,
      components: {
        ...s.components,
        [hover.id]: { ...s.components[hover.id], root: { ...s.components[hover.id].root, children: [] } },
      },
    };
    s = editorReducer(s, { type: 'SET_VARIANT_PROPS', id: instId, props: { State: 'Hover' } });
    const after = findById(s.page.root, instId)!;
    expect(after.node.componentId).toBe(hover.id);
    // 覆盖条目仍在（记录没被抹掉），但新树上无处重放 → 不产生任何子节点
    expect(textIdsIn(after.node).length).toBe(0);
  });
});
