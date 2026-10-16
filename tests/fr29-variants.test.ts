import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { editorReducer, initialState, type EditorState } from '../src/editor/store';
import {
  currentVariantProps,
  findVariant,
  isVariant,
  variantGroupOf,
  variantPropertyNames,
  variantValueNames,
  variantsInGroup,
} from '../src/editor/variants';
import type { ComponentDef, ContainerNode, UINode } from '../src/schema/types';

resetIdSeq(0);

function def(name: string, props?: Record<string, string>): ComponentDef {
  const root = createNode('FRAME') as ContainerNode;
  return { id: `c-${name}-${JSON.stringify(props ?? {})}`, name, root, variantProps: props };
}

function stateWithFrame(): EditorState {
  const page = createPage('FR29 页面');
  const f = createNode('FRAME') as ContainerNode;
  f.name = 'Button';
  f.layout.width = 100;
  f.layout.height = 40;
  page.root.children.push(f);
  return initialState(page, 'FR29 项目');
}

describe('FR-29 variants 纯函数', () => {
  it('variantGroupOf：取 "/" 前的组名；无 "/" 用自身', () => {
    expect(variantGroupOf(def('Button/Primary'))).toBe('Button');
    expect(variantGroupOf(def('Button'))).toBe('Button');
    expect(variantGroupOf(def('/Leading'))).toBe('/Leading'); // slash 在首位不切
  });

  it('isVariant：空/无 variantProps 为 false', () => {
    expect(isVariant(def('A'))).toBe(false);
    expect(isVariant(def('A', {}))).toBe(false);
    expect(isVariant(def('A', { State: 'hover' }))).toBe(true);
  });

  it('variantsInGroup：按 createdAt 序聚合组内成员', () => {
    const a = { ...def('Button/A', { State: 'default' }), id: 'a', createdAt: 2 };
    const b = { ...def('Button/B', { State: 'hover' }), id: 'b', createdAt: 1 };
    const other = { ...def('Card/X'), id: 'x', createdAt: 0 };
    const members = variantsInGroup({ a, b, x: other }, 'Button');
    expect(members.map((m) => m.id)).toEqual(['b', 'a']); // createdAt 升序
  });

  it('variantPropertyNames / variantValueNames：按首次出现序去重', () => {
    const members = [
      def('B', { State: 'default', Size: 'sm' }),
      def('B', { State: 'hover', Size: 'lg' }),
      def('B', { State: 'default' }),
    ];
    expect(variantPropertyNames(members)).toEqual(['State', 'Size']);
    expect(variantValueNames(members, 'State')).toEqual(['default', 'hover']);
    expect(variantValueNames(members, 'Size')).toEqual(['sm', 'lg']);
  });

  it('findVariant：精确命中返回 exact=true', () => {
    const members = [def('B', { State: 'default' }), def('B', { State: 'hover' })];
    const hit = findVariant(members, { State: 'hover' })!;
    expect(hit.exact).toBe(true);
    expect(hit.def.variantProps!.State).toBe('hover');
  });

  it('findVariant：空组合回退首成员（exact=false，必有可渲染内容）', () => {
    const members = [def('B', { State: 'default' }), def('B', { State: 'hover' })];
    const hit = findVariant(members, {})!;
    expect(hit.exact).toBe(false);
    expect(hit.def.variantProps!.State).toBe('default');
  });

  it('findVariant：无匹配回退首成员（不返回 null）', () => {
    const members = [def('B', { State: 'default' })];
    const hit = findVariant(members, { State: 'nope' })!;
    expect(hit.exact).toBe(false);
    expect(hit.def).toBe(members[0]);
  });

  it('findVariant：空成员表返回 null', () => {
    expect(findVariant([], { State: 'x' })).toBeNull();
  });

  it('findVariant：子集匹配（目标组合项全等即可）', () => {
    const members = [def('B', { State: 'hover', Size: 'lg' })];
    expect(findVariant(members, { State: 'hover' })!.exact).toBe(true);
  });

  it('currentVariantProps：非变体/未知名返回 {}', () => {
    const comps = { c1: def('B', { State: 'hover' }) };
    expect(currentVariantProps(comps, 'c1')).toEqual({ State: 'hover' });
    expect(currentVariantProps(comps, 'nope')).toEqual({});
    expect(currentVariantProps(comps, undefined)).toEqual({});
  });
});

describe('FR-29 store：变体 action', () => {
  it('CREATE_VARIANT：以实例内容入组，variantProps 落表', () => {
    let s = stateWithFrame();
    const f = s.page.root.children[0];
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id, name: 'Button/Primary' });
    const compId = Object.keys(s.components)[0];
    // 插入实例后基于它建变体
    s = editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
    const instId = s.selectedIds[0];
    s = editorReducer(s, { type: 'CREATE_VARIANT', id: instId, props: { State: 'hover' } });
    const all = Object.values(s.components);
    expect(all).toHaveLength(2);
    const created = all.find((c) => c.variantProps?.State === 'hover')!;
    expect(created.name).toContain('Button');
    expect(variantGroupOf(created)).toBe('Button');
  });

  it('CREATE_VARIANT：同组合重复创建被拒绝（不产歧义成员）', () => {
    let s = stateWithFrame();
    const f = s.page.root.children[0];
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id, name: 'Button/Primary' });
    const compId = Object.keys(s.components)[0];
    s = editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
    const instId = s.selectedIds[0];
    s = editorReducer(s, { type: 'CREATE_VARIANT', id: instId, props: { State: 'hover' } });
    const before = Object.keys(s.components).length;
    const again = editorReducer(s, { type: 'CREATE_VARIANT', id: instId, props: { State: 'hover' } });
    expect(Object.keys(again.components).length).toBe(before);
  });

  it('SET_VARIANT_PROPS：切换组合改 componentId 指向组内成员', () => {
    let s = stateWithFrame();
    const f = s.page.root.children[0];
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id, name: 'Button/Primary' });
    const compId = Object.keys(s.components)[0];
    s = editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
    const instId = s.selectedIds[0];
    s = editorReducer(s, { type: 'CREATE_VARIANT', id: instId, props: { State: 'hover' } });
    const hoverComp = Object.values(s.components).find((c) => c.variantProps?.State === 'hover')!;

    // 当前实例仍指向原成员 → 切到 hover
    s = editorReducer(s, { type: 'SET_VARIANT_PROPS', id: instId, props: { State: 'hover' } });
    const inst = s.page.root.children.find((n) => n.id === instId)!;
    expect(inst.componentId).toBe(hoverComp.id);
    expect(inst.instanceOverrides).toBeUndefined();
  });

  it('SET_VARIANT_PROPS：非实例节点返回原 state', () => {
    const s = stateWithFrame();
    const f = s.page.root.children[0];
    expect(editorReducer(s, { type: 'SET_VARIANT_PROPS', id: f.id, props: { State: 'x' } })).toBe(s);
  });

  it('UPDATE_VARIANT_PROPS：改属性；与同组他成员撞组合则拒绝', () => {
    let s = stateWithFrame();
    const f = s.page.root.children[0];
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id, name: 'Button/Primary' });
    const compId = Object.keys(s.components)[0];
    s = editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
    const instId = s.selectedIds[0];
    s = editorReducer(s, { type: 'CREATE_VARIANT', id: instId, props: { State: 'hover' } });
    const hoverComp = Object.values(s.components).find((c) => c.variantProps?.State === 'hover')!;

    // 把 Primary 改成 {State:'hover'} 会与 hoverComp 撞 → 拒绝
    const rejected = editorReducer(s, { type: 'UPDATE_VARIANT_PROPS', componentId: compId, props: { State: 'hover' } });
    expect(rejected.components[compId].variantProps?.State).toBeUndefined();

    // 改成不冲突的组合 → 生效
    const ok = editorReducer(s, { type: 'UPDATE_VARIANT_PROPS', componentId: compId, props: { State: 'pressed' } });
    expect(ok.components[compId].variantProps?.State).toBe('pressed');
    expect(ok.components[hoverComp.id]).toBeTruthy();
  });

  it('UPDATE_VARIANT_PROPS：未知组件返回原 state', () => {
    const s = stateWithFrame();
    expect(editorReducer(s, { type: 'UPDATE_VARIANT_PROPS', componentId: 'nope', props: { A: '1' } })).toBe(s);
  });

  it('变体成员快照 id 与原节点不同（不与实例撞号）', () => {
    let s = stateWithFrame();
    const f = s.page.root.children[0];
    s = editorReducer(s, { type: 'CREATE_COMPONENT', id: f.id, name: 'Button/Primary' });
    const compId = Object.keys(s.components)[0];
    s = editorReducer(s, { type: 'INSERT_INSTANCE', componentId: compId });
    const instId = s.selectedIds[0];
    s = editorReducer(s, { type: 'CREATE_VARIANT', id: instId, props: { State: 'hover' } });
    const created = Object.values(s.components).find((c) => c.variantProps?.State === 'hover')!;
    const ids: string[] = [];
    const collect = (n: UINode): void => {
      ids.push(n.id);
      if ('children' in n) n.children.forEach(collect);
    };
    collect(created.root);
    expect(ids).not.toContain(instId);
  });
});
